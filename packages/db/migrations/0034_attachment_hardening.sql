-- Task 059, after the access review.
--
-- Photos and files of a deleted visit are hidden like the visit (admins and auditors still see them, as they
-- see deleted visits). CREATE POLICY again: policies have no OR REPLACE.
DROP POLICY attachment_select ON attachment;
--> statement-breakpoint
CREATE POLICY attachment_select ON attachment FOR SELECT
  USING (
    can_see_project(current_setting('app.user_id', true), project_id)
    AND (confirmed_at IS NOT NULL OR uploaded_by = current_setting('app.user_id', true))
    AND (
      (
        deleted_at IS NULL
        AND (visit_id IS NULL OR EXISTS (SELECT 1 FROM site_visit v WHERE v.id = attachment.visit_id AND v.deleted_at IS NULL))
      )
      OR has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin,auditor}')
    )
  );
--> statement-breakpoint
-- The app changes only whether an upload is confirmed or deleted, and its checked size. What it is (kind,
-- name, type) is fixed when it's recorded: a photo is served inline, so its type must stay the checked one.
REVOKE UPDATE ON attachment FROM app_user;
--> statement-breakpoint
GRANT UPDATE (confirmed_at, size_bytes, deleted_at, deleted_by) ON attachment TO app_user;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION attachment_check()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.project_id IS DISTINCT FROM OLD.project_id OR NEW.visit_id IS DISTINCT FROM OLD.visit_id
    OR NEW.uploaded_by IS DISTINCT FROM OLD.uploaded_by OR NEW.storage_key IS DISTINCT FROM OLD.storage_key
    OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.kind IS DISTINCT FROM OLD.kind
    OR NEW.file_name IS DISTINCT FROM OLD.file_name OR NEW.content_type IS DISTINCT FROM OLD.content_type
  ) THEN
    RAISE EXCEPTION 'an attachment stays what and where it was put' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM project p WHERE p.id = NEW.project_id AND p.workspace_id = NEW.workspace_id) THEN
    RAISE EXCEPTION 'attachment % is not in its project''s workspace', NEW.id USING ERRCODE = '23514';
  END IF;
  IF NEW.visit_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM site_visit v WHERE v.id = NEW.visit_id AND v.project_id = NEW.project_id) THEN
    RAISE EXCEPTION 'visit % is not one of project %''s', NEW.visit_id, NEW.project_id USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
