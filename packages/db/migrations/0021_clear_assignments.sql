-- Task 047 fix: leaving a workspace, or being removed from it, clears every one of that person's task
-- assignments there (ADR-0005). Under row-level security the caller may not be allowed to change those
-- tasks (an auditor leaving; an admin and a task on a deleted project), so the clear runs as the owner.
-- Only for yourself or as an admin of the workspace; call it before the membership is deleted.
CREATE FUNCTION clear_assignments(p_workspace text, p_user text)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller text := current_setting('app.user_id', true);
BEGIN
  IF coalesce(v_caller, '') = ''
    OR NOT (v_caller = p_user OR has_workspace_role(v_caller, p_workspace, '{admin}')) THEN
    RAISE EXCEPTION 'clear_assignments: only yourself or an admin of the workspace' USING ERRCODE = '42501';
  END IF;
  UPDATE task
  SET assignee_id = NULL
  WHERE assignee_id = p_user
    AND project_id IN (SELECT id FROM project WHERE workspace_id = p_workspace);
END
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION clear_assignments(text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION clear_assignments(text, text) TO app_user;
