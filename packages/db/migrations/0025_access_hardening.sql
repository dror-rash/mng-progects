-- Task 052: hardening after the final review of M12 (ADR-0006 amendment 2026-11-01).

-- Rule 7: auditors are never assignable. They see every task, so clearing only the tasks someone can no
-- longer see kept all of a demoted admin's assignments. Now a user who is an auditor after the change
-- loses every assignment in the workspace. CREATE OR REPLACE keeps the grants (app_user only).
CREATE OR REPLACE FUNCTION clear_unseen_assignments(p_workspace text, p_user text)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller text := current_setting('app.user_id', true);
  v_auditor boolean;
BEGIN
  IF coalesce(v_caller, '') = '' OR NOT has_workspace_role(v_caller, p_workspace, '{admin}') THEN
    RAISE EXCEPTION 'clear_unseen_assignments: only an admin of the workspace' USING ERRCODE = '42501';
  END IF;
  v_auditor := EXISTS (
    SELECT 1 FROM workspace_member m WHERE m.workspace_id = p_workspace AND m.user_id = p_user AND m.role = 'auditor'
  );
  UPDATE task
  SET assignee_id = NULL
  WHERE assignee_id = p_user
    AND project_id IN (SELECT id FROM project WHERE workspace_id = p_workspace)
    AND (v_auditor OR NOT can_see_project(p_user, project_id));
END
$$;--> statement-breakpoint

-- Postgres looks in pg_temp first for tables unless search_path names it, so a caller who can create
-- temp tables could shadow workspace_member (or any table) inside these SECURITY DEFINER functions and
-- pass every access check. Every definer function in public gets pg_temp last; the loop reads pg_proc,
-- so none is missed. A new definer function must say `SET search_path = public, pg_temp` itself (a DB
-- test checks it).
--
-- Note for policy changes: a partner's soft delete of a project (a plain UPDATE setting deleted_at)
-- passes because the new row is checked against project_select through can_see_project, a STABLE
-- SECURITY DEFINER function that reads the statement's snapshot, where the row isn't deleted yet. A
-- change that makes that check see the new row (an inline deleted_at test in project_select, say) would
-- silently refuse it; soft-delete.db.test.ts ("lets a partner soft-delete its own partner's project")
-- catches that.
DO $$
DECLARE
  f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', f);
  END LOOP;
END
$$;--> statement-breakpoint

-- And nobody but the owner creates temp tables at all: app_user had TEMPORARY through PUBLIC.
DO $$
BEGIN
  EXECUTE format('REVOKE TEMPORARY ON DATABASE %I FROM PUBLIC', current_database());
  EXECUTE format('REVOKE TEMPORARY ON DATABASE %I FROM app_user', current_database());
END
$$;
