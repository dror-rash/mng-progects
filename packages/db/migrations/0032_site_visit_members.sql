-- Task 058, after the access review: who was there is checked in the database too, and a deleted visit's
-- people don't change.
--
-- Whether p_member could work on p_project, the people a visit may list (the same people the app offers to
-- assign the project's tasks, features/workspaces/members.ts): admins of its workspace, the users of its
-- partner (not deleted) for a partner's project, and the workers on its crew.
CREATE FUNCTION is_project_person(p_member text, p_project text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM project pr
    JOIN workspace_member m ON m.workspace_id = pr.workspace_id AND m.user_id = p_member
    WHERE pr.id = p_project
      AND (
        m.role = 'admin'
        OR (
          m.role = 'partner'
          AND m.partner_id = pr.partner_id
          AND EXISTS (SELECT 1 FROM partner pt WHERE pt.id = pr.partner_id AND pt.deleted_at IS NULL)
        )
        OR (
          m.role = 'worker'
          AND EXISTS (SELECT 1 FROM project_worker pw WHERE pw.project_id = pr.id AND pw.user_id = p_member)
        )
      )
  )
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION is_project_person(text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION is_project_person(text, text) TO app_user;
--> statement-breakpoint
DROP POLICY site_visit_member_write ON site_visit_member;
--> statement-breakpoint
-- Removing someone: whoever changes the visit, while it isn't deleted. Adding someone: also one of the
-- project's people.
CREATE POLICY site_visit_member_write ON site_visit_member FOR ALL
  USING (
    can_change_visit(current_setting('app.user_id', true), visit_id)
    AND EXISTS (SELECT 1 FROM site_visit v WHERE v.id = site_visit_member.visit_id AND v.deleted_at IS NULL)
  )
  WITH CHECK (
    can_change_visit(current_setting('app.user_id', true), visit_id)
    AND EXISTS (
      SELECT 1 FROM site_visit v
      WHERE v.id = site_visit_member.visit_id
        AND v.deleted_at IS NULL
        AND is_project_person(site_visit_member.user_id, v.project_id)
    )
  );
