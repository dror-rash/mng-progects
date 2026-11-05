CREATE TABLE "form_submission" (
	"id" text PRIMARY KEY NOT NULL,
	"visit_id" text NOT NULL,
	"version_id" text NOT NULL,
	"values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_by" text,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" text,
	CONSTRAINT "form_submission_values_check" CHECK (jsonb_typeof("form_submission"."values") = 'object')
);
--> statement-breakpoint
ALTER TABLE "form_submission" ADD CONSTRAINT "form_submission_visit_id_site_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."site_visit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submission" ADD CONSTRAINT "form_submission_version_id_form_template_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."form_template_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submission" ADD CONSTRAINT "form_submission_submitted_by_user_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submission" ADD CONSTRAINT "form_submission_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "form_submission_visit_idx" ON "form_submission" USING btree ("visit_id","submitted_at");--> statement-breakpoint
CREATE INDEX "form_submission_version_idx" ON "form_submission" USING btree ("version_id");--> statement-breakpoint
-- Task 061 (ADR-0008): readings follow their visit. Whoever sees the visit reads them (deleted visits, and so
-- their readings, only admins and auditors, as for photos in 0034); whoever can work on the project fills them,
-- as themselves, on a visit that isn't deleted, with the version of a form that is Published now in the project's
-- workspace. Append-only: no update or delete policy.
--
-- can_fill_reading reads the visit and the form whatever the user's role (can_see_form_version isn't the check:
-- it is true for admins on drafts and for everyone on archived forms). It answers only true or false.
CREATE FUNCTION can_fill_reading(p_user text, p_visit text, p_version text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM site_visit v
    JOIN project p ON p.id = v.project_id
    JOIN form_template_version fv ON fv.id = p_version
    JOIN form_template t ON t.id = fv.template_id
    WHERE v.id = p_visit
      AND v.deleted_at IS NULL
      AND can_work_on_project(p_user, v.project_id)
      AND fv.published_at IS NOT NULL
      AND t.status = 'published'
      AND t.workspace_id = p.workspace_id
  )
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION can_fill_reading(text, text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION can_fill_reading(text, text, text) TO app_user;
--> statement-breakpoint
ALTER TABLE form_submission ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- The visit's own select policy decides (it runs for the reader inside this one); a deleted reading (later
-- tasks) only for admins and auditors.
CREATE POLICY form_submission_select ON form_submission FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM site_visit v
      JOIN project p ON p.id = v.project_id
      WHERE v.id = form_submission.visit_id
        AND (
          form_submission.deleted_at IS NULL
          OR has_workspace_role(current_setting('app.user_id', true), p.workspace_id, '{admin,auditor}')
        )
    )
  );
--> statement-breakpoint
CREATE POLICY form_submission_insert ON form_submission FOR INSERT
  WITH CHECK (
    submitted_by = current_setting('app.user_id', true)
    AND deleted_at IS NULL
    AND deleted_by IS NULL
    AND can_fill_reading(current_setting('app.user_id', true), visit_id, version_id)
  );
--> statement-breakpoint
-- A reading stays on its visit and version, by its author, whoever asks (the owner too). Its author becomes null
-- only when that user is deleted (ON DELETE SET NULL). It reads no table, so it needs no definer rights.
CREATE FUNCTION form_submission_keep()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.visit_id IS DISTINCT FROM OLD.visit_id OR NEW.version_id IS DISTINCT FROM OLD.version_id
     OR (NEW.submitted_by IS DISTINCT FROM OLD.submitted_by AND NEW.submitted_by IS NOT NULL) THEN
    RAISE EXCEPTION 'a reading keeps its visit, form version and author' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER form_submission_keep
  BEFORE UPDATE OF visit_id, version_id, submitted_by ON form_submission
  FOR EACH ROW EXECUTE FUNCTION form_submission_keep();
