-- Task 047 (ADR-0006): row-level security as the second lock.
--
-- The app connects with `-c role=app_user`: a NOLOGIN role that owns nothing, so the policies below
-- apply to it. Each request sets `app.user_id` in a short transaction (`withAccess` in @repo/db); with
-- no user set, every protected table looks empty. Row-level security is enabled but not forced: the
-- owner (this migration's user, the maintenance connection, and the SECURITY DEFINER access functions,
-- which it owns) bypasses it, so data migrations and the functions themselves see every row.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN;
  END IF;
END
$$;--> statement-breakpoint
-- Lets the login user switch to it on connect.
GRANT app_user TO current_user;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;--> statement-breakpoint

-- Whether p_user has one of p_roles in p_workspace (through access_role, so a deleted partner's users have none).
CREATE FUNCTION has_workspace_role(p_user text, p_workspace text, p_roles text[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM access_role(p_user, p_workspace) a WHERE a.role = ANY (p_roles))
$$;--> statement-breakpoint

ALTER TABLE workspace ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE workspace_member ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE workspace_invite ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE partner ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE customer_partner ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE project ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE task ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE organization ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE organization_contact ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE organization_note ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- Projects. Insert and update check the new row inline: can_change_project reads the table, where the
-- new row isn't visible yet. An admin of its workspace, or a partner whose own partner it is and whose
-- partner serves its customer.
CREATE POLICY project_select ON project FOR SELECT
  USING (can_see_project(current_setting('app.user_id', true), id));--> statement-breakpoint
CREATE POLICY project_insert ON project FOR INSERT
  WITH CHECK (
    has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin}')
    OR EXISTS (
      SELECT 1 FROM access_role(current_setting('app.user_id', true), project.workspace_id) a
      WHERE a.role = 'partner'
        AND project.partner_id = a.partner_id
        AND partner_serves_customer(a.partner_id, project.organization_id)
    )
  );--> statement-breakpoint
CREATE POLICY project_update ON project FOR UPDATE
  USING (can_change_project(current_setting('app.user_id', true), id))
  WITH CHECK (
    has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin}')
    OR EXISTS (
      SELECT 1 FROM access_role(current_setting('app.user_id', true), project.workspace_id) a
      WHERE a.role = 'partner'
        AND project.partner_id = a.partner_id
        AND partner_serves_customer(a.partner_id, project.organization_id)
    )
  );--> statement-breakpoint
CREATE POLICY project_delete ON project FOR DELETE
  USING (can_change_project(current_setting('app.user_id', true), id));--> statement-breakpoint

-- Tasks follow their project; deleted tasks only for admins and auditors.
CREATE POLICY task_select ON task FOR SELECT
  USING (
    can_see_project(current_setting('app.user_id', true), project_id)
    AND (
      deleted_at IS NULL
      OR EXISTS (
        SELECT 1 FROM project p
        WHERE p.id = task.project_id
          AND has_workspace_role(current_setting('app.user_id', true), p.workspace_id, '{admin,auditor}')
      )
    )
  );--> statement-breakpoint
CREATE POLICY task_insert ON task FOR INSERT
  WITH CHECK (can_change_project(current_setting('app.user_id', true), project_id));--> statement-breakpoint
CREATE POLICY task_update ON task FOR UPDATE
  USING (can_change_project(current_setting('app.user_id', true), project_id))
  WITH CHECK (can_change_project(current_setting('app.user_id', true), project_id));--> statement-breakpoint
CREATE POLICY task_delete ON task FOR DELETE
  USING (can_change_project(current_setting('app.user_id', true), project_id));--> statement-breakpoint

-- Customers: admins and auditors see them, admins change them. Partners never read this table; they
-- read names through the customer_name view below. Insert and update check the new row's workspace.
CREATE POLICY organization_select ON organization FOR SELECT
  USING (can_see_customer(current_setting('app.user_id', true), id));--> statement-breakpoint
CREATE POLICY organization_insert ON organization FOR INSERT
  WITH CHECK (has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin}'));--> statement-breakpoint
CREATE POLICY organization_update ON organization FOR UPDATE
  USING (can_change_customer(current_setting('app.user_id', true), id))
  WITH CHECK (has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin}'));--> statement-breakpoint
CREATE POLICY organization_delete ON organization FOR DELETE
  USING (can_change_customer(current_setting('app.user_id', true), id));--> statement-breakpoint

CREATE POLICY organization_contact_select ON organization_contact FOR SELECT
  USING (can_see_customer(current_setting('app.user_id', true), organization_id));--> statement-breakpoint
CREATE POLICY organization_contact_write ON organization_contact FOR ALL
  USING (can_change_customer(current_setting('app.user_id', true), organization_id))
  WITH CHECK (can_change_customer(current_setting('app.user_id', true), organization_id));--> statement-breakpoint
CREATE POLICY organization_note_select ON organization_note FOR SELECT
  USING (can_see_customer(current_setting('app.user_id', true), organization_id));--> statement-breakpoint
CREATE POLICY organization_note_write ON organization_note FOR ALL
  USING (can_change_customer(current_setting('app.user_id', true), organization_id))
  WITH CHECK (can_change_customer(current_setting('app.user_id', true), organization_id));--> statement-breakpoint

-- Partner companies and their customers: admins and auditors see them, a partner's users see their own;
-- admins change them.
CREATE POLICY partner_select ON partner FOR SELECT
  USING (
    has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin,auditor}')
    OR EXISTS (
      SELECT 1 FROM access_role(current_setting('app.user_id', true), partner.workspace_id) a
      WHERE a.role = 'partner' AND a.partner_id = partner.id
    )
  );--> statement-breakpoint
CREATE POLICY partner_write ON partner FOR ALL
  USING (has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin}'))
  WITH CHECK (has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin}'));--> statement-breakpoint
CREATE POLICY customer_partner_select ON customer_partner FOR SELECT
  USING (
    has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin,auditor}')
    OR EXISTS (
      SELECT 1 FROM access_role(current_setting('app.user_id', true), customer_partner.workspace_id) a
      WHERE a.role = 'partner' AND a.partner_id = customer_partner.partner_id
    )
  );--> statement-breakpoint
CREATE POLICY customer_partner_write ON customer_partner FOR ALL
  USING (has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin}'))
  WITH CHECK (has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin}'));--> statement-breakpoint

-- Memberships: your own; all of them for admins and auditors; for a partner's users, their own
-- partner's and the admins (the people they can assign). Admins change them; anyone may leave.
-- Creating a workspace and joining one go through create_workspace and join_workspace below.
CREATE POLICY workspace_member_select ON workspace_member FOR SELECT
  USING (
    user_id = current_setting('app.user_id', true)
    OR has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin,auditor}')
    OR EXISTS (
      SELECT 1 FROM access_role(current_setting('app.user_id', true), workspace_member.workspace_id) a
      WHERE a.role = 'partner'
        AND (workspace_member.partner_id = a.partner_id OR workspace_member.role = 'admin')
    )
  );--> statement-breakpoint
CREATE POLICY workspace_member_write ON workspace_member FOR ALL
  USING (has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin}'))
  WITH CHECK (has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin}'));--> statement-breakpoint
CREATE POLICY workspace_member_leave ON workspace_member FOR DELETE
  USING (user_id = current_setting('app.user_id', true));--> statement-breakpoint

-- Invite links: admins only. Someone joining reads theirs through find_invite.
CREATE POLICY workspace_invite_admin ON workspace_invite FOR ALL
  USING (has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin}'))
  WITH CHECK (has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin}'));--> statement-breakpoint

-- Workspaces: members see them, admins rename and delete them, anyone signed in may create one.
CREATE POLICY workspace_select ON workspace FOR SELECT
  USING (EXISTS (SELECT 1 FROM access_role(current_setting('app.user_id', true), workspace.id)));--> statement-breakpoint
CREATE POLICY workspace_insert ON workspace FOR INSERT
  WITH CHECK (coalesce(current_setting('app.user_id', true), '') <> '');--> statement-breakpoint
CREATE POLICY workspace_update ON workspace FOR UPDATE
  USING (has_workspace_role(current_setting('app.user_id', true), id, '{admin}'))
  WITH CHECK (has_workspace_role(current_setting('app.user_id', true), id, '{admin}'));--> statement-breakpoint
CREATE POLICY workspace_delete ON workspace FOR DELETE
  USING (has_workspace_role(current_setting('app.user_id', true), id, '{admin}'));--> statement-breakpoint

-- Customer names a user may see: whoever sees the customer, and partners it is assigned to. Owned by
-- this migration's user, so it reads organization past its policy and applies its own filter;
-- security_barrier keeps a caller's conditions from running before that filter. Read only: the default
-- privileges above would also let app_user write through it.
CREATE VIEW customer_name WITH (security_barrier) AS
  SELECT id, workspace_id, name
  FROM organization
  WHERE can_see_customer_name(current_setting('app.user_id', true), id);--> statement-breakpoint
REVOKE ALL ON customer_name FROM app_user;--> statement-breakpoint
GRANT SELECT ON customer_name TO app_user;--> statement-breakpoint

-- Creates a workspace with p_user as its admin and returns its id. Only for yourself.
CREATE FUNCTION create_workspace(p_user text, p_name text)
RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id text := gen_random_uuid()::text;
BEGIN
  IF p_user IS NULL OR p_user IS DISTINCT FROM current_setting('app.user_id', true) THEN
    RAISE EXCEPTION 'create_workspace: only for the current user' USING ERRCODE = '42501';
  END IF;
  INSERT INTO workspace (id, name) VALUES (v_id, p_name);
  INSERT INTO workspace_member (workspace_id, user_id, role) VALUES (v_id, p_user, 'admin');
  RETURN v_id;
END
$$;--> statement-breakpoint

-- The invite with this token hash and its workspace's name, for someone who isn't a member yet.
CREATE FUNCTION find_invite(p_token_hash text)
RETURNS TABLE (
  id text,
  workspace_id text,
  workspace_name text,
  expires_at timestamp,
  revoked_at timestamp,
  role text,
  partner_id text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT i.id, i.workspace_id, w.name, i.expires_at, i.revoked_at, i.role, i.partner_id
  FROM workspace_invite i
  JOIN workspace w ON w.id = i.workspace_id
  WHERE i.token_hash = p_token_hash
$$;--> statement-breakpoint

-- Joins p_user (only yourself) to the invite's workspace with the invite's role and partner:
-- 'joined'; 'member' when already a member (nothing changes); 'invalid' when the link is unknown,
-- revoked or expired. Timestamps are stored as UTC wall time.
CREATE FUNCTION join_workspace(p_user text, p_token_hash text)
RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite workspace_invite%ROWTYPE;
BEGIN
  IF p_user IS NULL OR p_user IS DISTINCT FROM current_setting('app.user_id', true) THEN
    RAISE EXCEPTION 'join_workspace: only for the current user' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_invite
  FROM workspace_invite i
  WHERE i.token_hash = p_token_hash
    AND i.revoked_at IS NULL
    AND i.expires_at > (now() AT TIME ZONE 'UTC');
  IF NOT FOUND THEN
    RETURN 'invalid';
  END IF;
  INSERT INTO workspace_member (workspace_id, user_id, role, partner_id)
  VALUES (v_invite.workspace_id, p_user, v_invite.role, v_invite.partner_id)
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    RETURN 'member';
  END IF;
  RETURN 'joined';
END
$$;--> statement-breakpoint

-- Only the runtime role (and the owner) may call the access and SECURITY DEFINER functions.
REVOKE EXECUTE ON FUNCTION
  access_role(text, text),
  can_see_project(text, text),
  can_change_project(text, text),
  can_see_customer(text, text),
  can_see_customer_name(text, text),
  can_change_customer(text, text),
  partner_serves_customer(text, text),
  has_workspace_role(text, text, text[]),
  create_workspace(text, text),
  find_invite(text),
  join_workspace(text, text)
FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION
  access_role(text, text),
  can_see_project(text, text),
  can_change_project(text, text),
  can_see_customer(text, text),
  can_see_customer_name(text, text),
  can_change_customer(text, text),
  partner_serves_customer(text, text),
  has_workspace_role(text, text, text[]),
  create_workspace(text, text),
  find_invite(text),
  join_workspace(text, text)
TO app_user;
