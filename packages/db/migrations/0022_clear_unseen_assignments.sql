-- Task 048 (design rule 8d): when an admin changes someone's role or partner, that person's assignments
-- on tasks they can no longer see are cleared in the same transaction. Call it after the membership
-- change. It runs as the owner, so the result doesn't depend on which tasks the admin's policies allow
-- (a deleted project, say). Admins of the workspace only.
CREATE FUNCTION clear_unseen_assignments(p_workspace text, p_user text)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller text := current_setting('app.user_id', true);
BEGIN
  IF coalesce(v_caller, '') = '' OR NOT has_workspace_role(v_caller, p_workspace, '{admin}') THEN
    RAISE EXCEPTION 'clear_unseen_assignments: only an admin of the workspace' USING ERRCODE = '42501';
  END IF;
  UPDATE task
  SET assignee_id = NULL
  WHERE assignee_id = p_user
    AND project_id IN (SELECT id FROM project WHERE workspace_id = p_workspace)
    AND NOT can_see_project(p_user, project_id);
END
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION clear_unseen_assignments(text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION clear_unseen_assignments(text, text) TO app_user;
