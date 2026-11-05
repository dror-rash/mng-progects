CREATE TABLE "form_field" (
	"id" text PRIMARY KEY NOT NULL,
	"version_id" text NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"unit" text,
	"options" text[],
	"position" integer NOT NULL,
	CONSTRAINT "form_field_type_check" CHECK ("form_field"."type" in ('number', 'text', 'yes_no', 'choice', 'date')),
	CONSTRAINT "form_field_unit_check" CHECK ("form_field"."unit" is null or "form_field"."type" = 'number'),
	CONSTRAINT "form_field_options_check" CHECK (("form_field"."type" = 'choice') = ("form_field"."options" is not null) and ("form_field"."options" is null or cardinality("form_field"."options") >= 2))
);
--> statement-breakpoint
CREATE TABLE "form_template" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "form_template_status_check" CHECK ("form_template"."status" in ('draft', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "form_template_version" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"version" integer NOT NULL,
	"published_at" timestamp,
	CONSTRAINT "form_template_version_template_version_key" UNIQUE("template_id","version")
);
--> statement-breakpoint
ALTER TABLE "form_field" ADD CONSTRAINT "form_field_version_id_form_template_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."form_template_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_template" ADD CONSTRAINT "form_template_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_template" ADD CONSTRAINT "form_template_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_template_version" ADD CONSTRAINT "form_template_version_template_id_form_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."form_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "form_field_version_idx" ON "form_field" USING btree ("version_id","position");--> statement-breakpoint
CREATE INDEX "form_template_workspace_idx" ON "form_template" USING btree ("workspace_id","created_at");--> statement-breakpoint
-- Task 060 (ADR-0008): reading forms. Admins and auditors of a form's workspace see it, drafts too; its
-- workers and partner users see published and archived ones (they fill them in, task 061); admins change
-- them. A form's versions and fields follow it, and a draft version is only for admins and auditors.
-- Insert checks use has_workspace_role or the parent row: a definer function can't see a row being inserted.
CREATE FUNCTION can_see_form_template(p_user text, p_template text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM form_template t
    CROSS JOIN LATERAL access_role(p_user, t.workspace_id) a
    WHERE t.id = p_template
      AND (a.role IN ('admin', 'auditor') OR t.status IN ('published', 'archived'))
  )
$$;
--> statement-breakpoint
CREATE FUNCTION can_change_form_template(p_user text, p_template text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM form_template t
    CROSS JOIN LATERAL access_role(p_user, t.workspace_id) a
    WHERE t.id = p_template
      AND a.role = 'admin'
  )
$$;
--> statement-breakpoint
-- A version (and its fields): admins and auditors see every one; others a published version of a form they see.
CREATE FUNCTION can_see_form_version(p_user text, p_version text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM form_template_version v
    JOIN form_template t ON t.id = v.template_id
    CROSS JOIN LATERAL access_role(p_user, t.workspace_id) a
    WHERE v.id = p_version
      AND (
        a.role IN ('admin', 'auditor')
        OR (v.published_at IS NOT NULL AND t.status IN ('published', 'archived'))
      )
  )
$$;
--> statement-breakpoint
-- Admins of its form's workspace, while the version is unpublished.
CREATE FUNCTION can_change_form_version(p_user text, p_version text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM form_template_version v
    JOIN form_template t ON t.id = v.template_id
    CROSS JOIN LATERAL access_role(p_user, t.workspace_id) a
    WHERE v.id = p_version
      AND v.published_at IS NULL
      AND a.role = 'admin'
  )
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION can_see_form_template(text, text), can_change_form_template(text, text),
  can_see_form_version(text, text), can_change_form_version(text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION can_see_form_template(text, text), can_change_form_template(text, text),
  can_see_form_version(text, text), can_change_form_version(text, text) TO app_user;
--> statement-breakpoint
ALTER TABLE form_template ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE form_template_version ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE form_field ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY form_template_select ON form_template FOR SELECT
  USING (can_see_form_template(current_setting('app.user_id', true), id));
--> statement-breakpoint
CREATE POLICY form_template_insert ON form_template FOR INSERT
  WITH CHECK (status = 'draft' AND has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin}'));
--> statement-breakpoint
CREATE POLICY form_template_update ON form_template FOR UPDATE
  USING (can_change_form_template(current_setting('app.user_id', true), id))
  WITH CHECK (has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin}'));
--> statement-breakpoint
CREATE POLICY form_template_version_select ON form_template_version FOR SELECT
  USING (can_see_form_version(current_setting('app.user_id', true), id));
--> statement-breakpoint
CREATE POLICY form_template_version_insert ON form_template_version FOR INSERT
  WITH CHECK (published_at IS NULL AND can_change_form_template(current_setting('app.user_id', true), template_id));
--> statement-breakpoint
-- Publishing sets published_at; from then on the trigger refuses every change.
CREATE POLICY form_template_version_update ON form_template_version FOR UPDATE
  USING (can_change_form_version(current_setting('app.user_id', true), id))
  WITH CHECK (can_change_form_template(current_setting('app.user_id', true), template_id));
--> statement-breakpoint
CREATE POLICY form_template_version_delete ON form_template_version FOR DELETE
  USING (can_change_form_version(current_setting('app.user_id', true), id));
--> statement-breakpoint
CREATE POLICY form_field_select ON form_field FOR SELECT
  USING (can_see_form_version(current_setting('app.user_id', true), version_id));
--> statement-breakpoint
CREATE POLICY form_field_write ON form_field FOR ALL
  USING (can_change_form_version(current_setting('app.user_id', true), version_id))
  WITH CHECK (can_change_form_version(current_setting('app.user_id', true), version_id));
--> statement-breakpoint
-- A form is created as a draft, stays in its workspace, and its status only moves forward: draft → published →
-- archived. Publishing needs a field on its latest version; form_template_publish then freezes that version, so a
-- published (or archived) form always has a published version (task 061 relies on it).
CREATE FUNCTION form_template_check()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'a reading form starts as a draft' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
    RAISE EXCEPTION 'a reading form keeps its workspace' USING ERRCODE = '23514';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT ((OLD.status = 'draft' AND NEW.status = 'published') OR (OLD.status = 'published' AND NEW.status = 'archived')) THEN
    RAISE EXCEPTION 'a reading form goes from draft to published to archived' USING ERRCODE = '23514';
  END IF;
  IF OLD.status = 'draft' AND NEW.status = 'published' AND NOT EXISTS (
    SELECT 1
    FROM form_field f
    WHERE f.version_id = (SELECT v.id FROM form_template_version v WHERE v.template_id = NEW.id ORDER BY v.version DESC LIMIT 1)
  ) THEN
    RAISE EXCEPTION 'a reading form needs a field before it is published' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
-- Publishing a form publishes its latest version: the only way a version gets published_at.
CREATE FUNCTION form_template_publish()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status = 'draft' AND NEW.status = 'published' THEN
    UPDATE form_template_version
    SET published_at = now() AT TIME ZONE 'UTC'
    WHERE id = (SELECT v.id FROM form_template_version v WHERE v.template_id = NEW.id ORDER BY v.version DESC LIMIT 1)
      AND published_at IS NULL;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
-- A version starts unpublished and is published only with its form (form_template_publish); a published version
-- never changes, whoever asks (the owner bypasses RLS, not this). It goes only with its form, when a workspace is
-- deleted (the cascade has removed the form by then). A version keeps its form and number.
CREATE FUNCTION form_template_version_check()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.published_at IS NOT NULL THEN
      RAISE EXCEPTION 'a form version starts unpublished' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD.published_at IS NOT NULL AND EXISTS (SELECT 1 FROM form_template t WHERE t.id = OLD.template_id) THEN
      RAISE EXCEPTION 'a published form version can''t change' USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.published_at IS NOT NULL THEN
    RAISE EXCEPTION 'a published form version can''t change' USING ERRCODE = '23514';
  END IF;
  IF NEW.template_id IS DISTINCT FROM OLD.template_id OR NEW.version IS DISTINCT FROM OLD.version THEN
    RAISE EXCEPTION 'a form version keeps its form and number' USING ERRCODE = '23514';
  END IF;
  IF NEW.published_at IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM form_template t WHERE t.id = NEW.template_id AND t.status = 'published') THEN
    RAISE EXCEPTION 'a form version is published with its form' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
-- The fields of a published version never change, and a field keeps its version. Adding or changing a field
-- locks its version row, so it waits for a publish in progress and then sees it. A runtime user who can't change
-- the version is left to row-level security, before anything here reads or locks it: its error must not tell
-- another workspace whether a version id exists or is published.
CREATE FUNCTION form_field_check()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_published_at timestamp;
  v_caller text := current_setting('app.user_id', true);
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT v.published_at INTO v_published_at FROM form_template_version v WHERE v.id = OLD.version_id;
    IF v_published_at IS NOT NULL THEN
      RAISE EXCEPTION 'a published form version can''t change' USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;
  IF coalesce(v_caller, '') <> '' AND NOT can_change_form_version(v_caller, NEW.version_id) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.version_id IS DISTINCT FROM OLD.version_id THEN
    RAISE EXCEPTION 'a form field keeps its version' USING ERRCODE = '23514';
  END IF;
  SELECT v.published_at INTO v_published_at FROM form_template_version v WHERE v.id = NEW.version_id FOR SHARE;
  IF v_published_at IS NOT NULL THEN
    RAISE EXCEPTION 'a published form version can''t change' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION form_template_check(), form_template_publish(), form_template_version_check(), form_field_check() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER form_template_check
  BEFORE INSERT OR UPDATE OF workspace_id, status ON form_template
  FOR EACH ROW EXECUTE FUNCTION form_template_check();
--> statement-breakpoint
CREATE TRIGGER form_template_publish
  AFTER UPDATE OF status ON form_template
  FOR EACH ROW EXECUTE FUNCTION form_template_publish();
--> statement-breakpoint
CREATE TRIGGER form_template_version_check
  BEFORE INSERT OR UPDATE OR DELETE ON form_template_version
  FOR EACH ROW EXECUTE FUNCTION form_template_version_check();
--> statement-breakpoint
CREATE TRIGGER form_field_check
  BEFORE INSERT OR UPDATE OR DELETE ON form_field
  FOR EACH ROW EXECUTE FUNCTION form_field_check();
