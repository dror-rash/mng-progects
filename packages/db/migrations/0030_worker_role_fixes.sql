-- Task 056, after the access review. A worker's crew projects follow the partner rule for deleted
-- customers (design rule 8b: a deleted customer's projects stay, hidden from those outside the office):
-- is_on_crew, which can_see_project, can_work_on_project and can_see_customer_name use, now requires the
-- project's customer (if any) not deleted. CREATE OR REPLACE keeps the grants.
CREATE OR REPLACE FUNCTION is_on_crew(p_user text, p_project text)
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
      AND NOT EXISTS (SELECT 1 FROM organization o WHERE o.id = pr.organization_id AND o.deleted_at IS NOT NULL)
  )
$$;
--> statement-breakpoint
-- Leaving a crew clears the worker's assignments in that project only when they can no longer see it: a
-- worker made an admin leaves their crews but keeps their tasks. (Made an auditor, changeMembership's
-- clear_unseen_assignments clears them all, as for any auditor.)
CREATE OR REPLACE FUNCTION project_worker_clear_assignments()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT can_see_project(OLD.user_id, OLD.project_id) THEN
    UPDATE task SET assignee_id = NULL WHERE project_id = OLD.project_id AND assignee_id = OLD.user_id;
  END IF;
  RETURN OLD;
END;
$$;
