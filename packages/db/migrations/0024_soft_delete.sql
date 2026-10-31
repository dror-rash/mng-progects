-- Task 051 (design rules 8–8c): soft delete everywhere. Most deletes are plain updates of deleted_at /
-- deleted_by under the existing policies. Two can't be, and get functions here; invite links of a
-- deleted partner stop working. Timestamps are stored as UTC wall time.
--
-- Soft-deletes a task for whoever can change its project (admins; a partner's users for their own
-- partner's projects). Under row-level security the update itself is refused for a partner: the task
-- select policy hides deleted tasks from them, and an UPDATE's new row must pass it. True when the task
-- was deleted; false when it is missing, already deleted, or not the caller's to change.
CREATE FUNCTION delete_task(p_task text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller text := current_setting('app.user_id', true);
BEGIN
  IF coalesce(v_caller, '') = '' THEN
    RETURN false;
  END IF;
  UPDATE task
  SET deleted_at = now() AT TIME ZONE 'UTC', deleted_by = v_caller
  WHERE id = p_task
    AND deleted_at IS NULL
    AND can_change_project(v_caller, project_id);
  RETURN FOUND;
END
$$;--> statement-breakpoint

-- Restores a deleted project, for admins of its workspace only (nobody may change a deleted project
-- through the policies: can_change_project is false for it). Its tasks come back with it, except the
-- ones deleted on their own. True when restored; false when it is missing, not deleted, or the caller
-- isn't an admin there.
CREATE FUNCTION restore_project(p_project text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller text := current_setting('app.user_id', true);
BEGIN
  IF coalesce(v_caller, '') = '' THEN
    RETURN false;
  END IF;
  UPDATE project
  SET deleted_at = NULL, deleted_by = NULL, updated_at = now() AT TIME ZONE 'UTC'
  WHERE id = p_project
    AND deleted_at IS NOT NULL
    AND has_workspace_role(v_caller, workspace_id, '{admin}');
  RETURN FOUND;
END
$$;--> statement-breakpoint

-- find_invite also says whether the invite's partner is deleted (its links say "no longer valid"). The
-- result type changes, so the function is dropped and created again.
DROP FUNCTION find_invite(text);--> statement-breakpoint
CREATE FUNCTION find_invite(p_token_hash text)
RETURNS TABLE (
  id text,
  workspace_id text,
  workspace_name text,
  expires_at timestamp,
  revoked_at timestamp,
  role text,
  partner_id text,
  partner_deleted boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT i.id, i.workspace_id, w.name, i.expires_at, i.revoked_at, i.role, i.partner_id,
    coalesce(pt.deleted_at IS NOT NULL, false)
  FROM workspace_invite i
  JOIN workspace w ON w.id = i.workspace_id
  LEFT JOIN partner pt ON pt.id = i.partner_id
  WHERE i.token_hash = p_token_hash
$$;--> statement-breakpoint

-- As in 0020, and a deleted partner's invites are invalid.
CREATE OR REPLACE FUNCTION join_workspace(p_user text, p_token_hash text)
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
    AND i.expires_at > (now() AT TIME ZONE 'UTC')
    AND (i.partner_id IS NULL
      OR EXISTS (SELECT 1 FROM partner pt WHERE pt.id = i.partner_id AND pt.deleted_at IS NULL));
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

REVOKE EXECUTE ON FUNCTION delete_task(text), restore_project(text), find_invite(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION delete_task(text), restore_project(text), find_invite(text) TO app_user;
