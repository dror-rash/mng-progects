CREATE TABLE "attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"project_id" text NOT NULL,
	"visit_id" text,
	"kind" text NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" text,
	CONSTRAINT "attachment_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "attachment_kind_check" CHECK ("attachment"."kind" in ('photo', 'file', 'report')),
	CONSTRAINT "attachment_size_check" CHECK ("attachment"."size_bytes" >= 0)
);
--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_visit_id_site_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."site_visit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachment_project_idx" ON "attachment" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "attachment_visit_idx" ON "attachment" USING btree ("visit_id");--> statement-breakpoint
-- Task 059 (ADR-0008): photos and files follow their project, like visits. Whoever sees the project sees
-- its confirmed attachments (unconfirmed ones only their uploader; deleted ones admins and auditors);
-- whoever can work on it uploads, as themselves; the uploader confirms; the uploader and admins delete
-- (soft, through delete_attachment). Only an unconfirmed upload is ever removed for good (a refused one).
--
-- An attachment stays where it was put: its workspace is its project's, its visit (if any) is one of the
-- project's, and project, visit, uploader and storage key never change.
CREATE FUNCTION attachment_check()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.project_id IS DISTINCT FROM OLD.project_id OR NEW.visit_id IS DISTINCT FROM OLD.visit_id
    OR NEW.uploaded_by IS DISTINCT FROM OLD.uploaded_by OR NEW.storage_key IS DISTINCT FROM OLD.storage_key
    OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
  ) THEN
    RAISE EXCEPTION 'an attachment stays where it was put' USING ERRCODE = '23514';
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
--> statement-breakpoint
CREATE TRIGGER attachment_check
  BEFORE INSERT OR UPDATE ON attachment
  FOR EACH ROW EXECUTE FUNCTION attachment_check();
--> statement-breakpoint
-- The uploader, or an admin, of a project they can work on.
CREATE FUNCTION can_change_attachment(p_user text, p_attachment text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM attachment a
    WHERE a.id = p_attachment
      AND can_work_on_project(p_user, a.project_id)
      AND (a.uploaded_by = p_user OR has_workspace_role(p_user, a.workspace_id, '{admin}'))
  )
$$;
--> statement-breakpoint
-- Soft-deletes a confirmed attachment for its uploader or an admin. True when deleted.
CREATE FUNCTION delete_attachment(p_attachment text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller text := current_setting('app.user_id', true);
BEGIN
  IF coalesce(v_caller, '') = '' OR NOT can_change_attachment(v_caller, p_attachment) THEN
    RETURN false;
  END IF;
  UPDATE attachment
  SET deleted_at = now() AT TIME ZONE 'UTC', deleted_by = v_caller
  WHERE id = p_attachment AND deleted_at IS NULL AND confirmed_at IS NOT NULL;
  RETURN FOUND;
END
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION attachment_check(), can_change_attachment(text, text), delete_attachment(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION can_change_attachment(text, text), delete_attachment(text) TO app_user;
--> statement-breakpoint
ALTER TABLE attachment ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY attachment_select ON attachment FOR SELECT
  USING (
    can_see_project(current_setting('app.user_id', true), project_id)
    AND (confirmed_at IS NOT NULL OR uploaded_by = current_setting('app.user_id', true))
    AND (deleted_at IS NULL OR has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin,auditor}'))
  );
--> statement-breakpoint
CREATE POLICY attachment_insert ON attachment FOR INSERT
  WITH CHECK (
    uploaded_by = current_setting('app.user_id', true)
    AND confirmed_at IS NULL
    AND deleted_at IS NULL
    AND can_work_on_project(current_setting('app.user_id', true), project_id)
  );
--> statement-breakpoint
-- Confirming (the uploader) and restoring (admins).
CREATE POLICY attachment_update ON attachment FOR UPDATE
  USING (can_change_attachment(current_setting('app.user_id', true), id))
  WITH CHECK (can_work_on_project(current_setting('app.user_id', true), project_id));
--> statement-breakpoint
-- Removing a refused upload for good: its uploader, before it is confirmed.
CREATE POLICY attachment_delete ON attachment FOR DELETE
  USING (uploaded_by = current_setting('app.user_id', true) AND confirmed_at IS NULL);
