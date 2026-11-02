CREATE TABLE "project_worker" (
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"added_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_worker_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "workspace_invite" DROP CONSTRAINT "workspace_invite_role_check";--> statement-breakpoint
ALTER TABLE "workspace_member" DROP CONSTRAINT "workspace_member_role_check";--> statement-breakpoint
ALTER TABLE "project_worker" ADD CONSTRAINT "project_worker_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_worker" ADD CONSTRAINT "project_worker_added_by_user_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_worker" ADD CONSTRAINT "project_worker_member_fk" FOREIGN KEY ("workspace_id","user_id") REFERENCES "public"."workspace_member"("workspace_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_worker_member_idx" ON "project_worker" USING btree ("workspace_id","user_id");--> statement-breakpoint
ALTER TABLE "workspace_invite" ADD CONSTRAINT "workspace_invite_role_check" CHECK ("workspace_invite"."role" in ('admin', 'auditor', 'worker', 'partner'));--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_role_check" CHECK ("workspace_member"."role" in ('admin', 'auditor', 'worker', 'partner'));--> statement-breakpoint
-- Task 056 (ADR-0008): workers, internal technicians who see and work on the projects whose crew they're
-- on. Every function here is SECURITY DEFINER with search_path pinned (pg_temp last, task 052) and
-- callable by app_user only.
--
-- A crew member is a worker of the project's own workspace. The member key (workspace_id, user_id) already
-- ties the row to a membership; this checks the project's workspace and the role.
CREATE FUNCTION project_worker_check()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM project p WHERE p.id = NEW.project_id AND p.workspace_id = NEW.workspace_id) THEN
    RAISE EXCEPTION 'project % is not in workspace %', NEW.project_id, NEW.workspace_id USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM workspace_member m
    WHERE m.workspace_id = NEW.workspace_id AND m.user_id = NEW.user_id AND m.role = 'worker'
  ) THEN
    RAISE EXCEPTION 'user % is not a worker of workspace %', NEW.user_id, NEW.workspace_id USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER project_worker_check
  BEFORE INSERT OR UPDATE ON project_worker
  FOR EACH ROW EXECUTE FUNCTION project_worker_check();
--> statement-breakpoint
-- Someone who stops being a worker (made an admin, auditor or partner user) leaves every crew of that
-- workspace. Leaving the workspace removes the rows through the member key.
CREATE FUNCTION workspace_member_leave_crews()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.role = 'worker' AND NEW.role <> 'worker' THEN
    DELETE FROM project_worker WHERE workspace_id = NEW.workspace_id AND user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER workspace_member_leave_crews
  AFTER UPDATE OF role ON workspace_member
  FOR EACH ROW EXECUTE FUNCTION workspace_member_leave_crews();
--> statement-breakpoint
-- Leaving a crew (however it happens) clears the worker's assignments in that project: they no longer see
-- it (rule 7, as clear_unseen_assignments does for role changes).
CREATE FUNCTION project_worker_clear_assignments()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE task SET assignee_id = NULL WHERE project_id = OLD.project_id AND assignee_id = OLD.user_id;
  RETURN OLD;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER project_worker_clear_assignments
  AFTER DELETE ON project_worker
  FOR EACH ROW EXECUTE FUNCTION project_worker_clear_assignments();
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION project_worker_check(), workspace_member_leave_crews(), project_worker_clear_assignments() FROM PUBLIC;
--> statement-breakpoint
-- Whether p_user is on the crew of p_project as a worker of its workspace.
CREATE FUNCTION is_on_crew(p_user text, p_project text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM project_worker pw
    JOIN project pr ON pr.id = pw.project_id AND pr.workspace_id = pw.workspace_id
    CROSS JOIN LATERAL access_role(p_user, pr.workspace_id) a
    WHERE pw.project_id = p_project
      AND pw.user_id = p_user
      AND a.role = 'worker'
  )
$$;
--> statement-breakpoint
-- As before (0019), and a worker sees the projects whose crew they're on while not deleted. CREATE OR
-- REPLACE keeps the grants.
CREATE OR REPLACE FUNCTION can_see_project(p_user text, p_project text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM project pr
    CROSS JOIN LATERAL access_role(p_user, pr.workspace_id) a
    WHERE pr.id = p_project
      AND (
        a.role IN ('admin', 'auditor')
        OR (
          a.role = 'partner'
          AND pr.partner_id = a.partner_id
          AND pr.deleted_at IS NULL
          AND partner_serves_customer(a.partner_id, pr.organization_id)
        )
        OR (
          a.role = 'worker'
          AND pr.deleted_at IS NULL
          AND is_on_crew(p_user, pr.id)
        )
      )
  )
$$;
--> statement-breakpoint
-- Working on a project: its tasks (add, edit, move; task 056) and, later, its field data. Whoever can change
-- the project, and the workers on its crew while it isn't deleted. Project settings, cancel, copy and
-- delete stay can_change_project.
CREATE FUNCTION can_work_on_project(p_user text, p_project text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT can_change_project(p_user, p_project) OR EXISTS (
    SELECT 1 FROM project pr
    WHERE pr.id = p_project AND pr.deleted_at IS NULL AND is_on_crew(p_user, pr.id)
  )
$$;
--> statement-breakpoint
-- A customer's name: as before (0019), and for a worker the customers of the projects they see.
CREATE OR REPLACE FUNCTION can_see_customer_name(p_user text, p_org text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT can_see_customer(p_user, p_org) OR EXISTS (
    SELECT 1
    FROM organization o
    CROSS JOIN LATERAL access_role(p_user, o.workspace_id) a
    WHERE o.id = p_org
      AND a.role = 'partner'
      AND partner_serves_customer(a.partner_id, o.id)
  ) OR EXISTS (
    SELECT 1
    FROM project pr
    JOIN project_worker pw ON pw.project_id = pr.id AND pw.user_id = p_user
    JOIN organization o ON o.id = pr.organization_id
    WHERE pr.organization_id = p_org
      AND pr.deleted_at IS NULL
      AND o.deleted_at IS NULL
      AND is_on_crew(p_user, pr.id)
  )
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION is_on_crew(text, text), can_work_on_project(text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION is_on_crew(text, text), can_work_on_project(text, text) TO app_user;
--> statement-breakpoint
-- Workers add and edit their crew's tasks; deleting a task (and delete_task) stays can_change_project.
DROP POLICY task_insert ON task;
--> statement-breakpoint
DROP POLICY task_update ON task;
--> statement-breakpoint
CREATE POLICY task_insert ON task FOR INSERT
  WITH CHECK (can_work_on_project(current_setting('app.user_id', true), project_id));
--> statement-breakpoint
CREATE POLICY task_update ON task FOR UPDATE
  USING (can_work_on_project(current_setting('app.user_id', true), project_id))
  WITH CHECK (can_work_on_project(current_setting('app.user_id', true), project_id));
--> statement-breakpoint
-- Crews: whoever sees the project sees its crew (assignee choices and names); admins change them.
ALTER TABLE project_worker ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY project_worker_select ON project_worker FOR SELECT
  USING (can_see_project(current_setting('app.user_id', true), project_id));
--> statement-breakpoint
CREATE POLICY project_worker_write ON project_worker FOR ALL
  USING (has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin}'))
  WITH CHECK (has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin}'));
--> statement-breakpoint
-- Memberships (0020): also, for a worker, the admins and workers of the workspace and the users of the
-- partners whose projects they're on the crew of (the people they can assign, and assignees' names); for a
-- partner's users, also the workers on their partner's projects' crews.
DROP POLICY workspace_member_select ON workspace_member;
--> statement-breakpoint
CREATE POLICY workspace_member_select ON workspace_member FOR SELECT
  USING (
    user_id = current_setting('app.user_id', true)
    OR has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin,auditor}')
    OR EXISTS (
      SELECT 1 FROM access_role(current_setting('app.user_id', true), workspace_member.workspace_id) a
      WHERE a.role = 'partner'
        AND (
          workspace_member.partner_id = a.partner_id
          OR workspace_member.role = 'admin'
          OR (
            workspace_member.role = 'worker'
            AND EXISTS (
              SELECT 1 FROM project_worker pw JOIN project pr ON pr.id = pw.project_id
              WHERE pw.user_id = workspace_member.user_id
                AND pr.workspace_id = workspace_member.workspace_id
                AND pr.partner_id = a.partner_id
                AND pr.deleted_at IS NULL
            )
          )
        )
    )
    OR EXISTS (
      SELECT 1 FROM access_role(current_setting('app.user_id', true), workspace_member.workspace_id) a
      WHERE a.role = 'worker'
        AND (
          workspace_member.role IN ('admin', 'worker')
          OR EXISTS (
            SELECT 1 FROM project_worker pw JOIN project pr ON pr.id = pw.project_id
            WHERE pw.user_id = current_setting('app.user_id', true)
              AND pr.workspace_id = workspace_member.workspace_id
              AND pr.partner_id = workspace_member.partner_id
              AND pr.deleted_at IS NULL
          )
        )
    )
  );
