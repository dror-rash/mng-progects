CREATE TABLE "site_visit" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"visited_on" date NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "site_visit_member" (
	"visit_id" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "site_visit_member_visit_id_user_id_pk" PRIMARY KEY("visit_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "site_visit" ADD CONSTRAINT "site_visit_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_visit" ADD CONSTRAINT "site_visit_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_visit" ADD CONSTRAINT "site_visit_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_visit_member" ADD CONSTRAINT "site_visit_member_visit_id_site_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."site_visit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_visit_member" ADD CONSTRAINT "site_visit_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_visit_project_idx" ON "site_visit" USING btree ("project_id","visited_on");--> statement-breakpoint
CREATE INDEX "site_visit_member_user_idx" ON "site_visit_member" USING btree ("user_id");--> statement-breakpoint
-- Task 058 (ADR-0008): site visits follow their project. Everyone who sees the project sees its visits
-- (deleted ones: admins and auditors only, like tasks); whoever can work on it records them as themselves;
-- the author and admins edit them. Soft delete goes through delete_visit (an update into a deleted row
-- would fail the select policy for a worker or a partner's user, as for tasks in 0024). No hard deletes.
CREATE FUNCTION can_change_visit(p_user text, p_visit text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM site_visit v
    JOIN project pr ON pr.id = v.project_id
    WHERE v.id = p_visit
      AND can_work_on_project(p_user, v.project_id)
      AND (v.created_by = p_user OR has_workspace_role(p_user, pr.workspace_id, '{admin}'))
  )
$$;
--> statement-breakpoint
-- Soft-deletes a visit for its author or an admin who can work on its project. True when deleted.
CREATE FUNCTION delete_visit(p_visit text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller text := current_setting('app.user_id', true);
BEGIN
  IF coalesce(v_caller, '') = '' OR NOT can_change_visit(v_caller, p_visit) THEN
    RETURN false;
  END IF;
  UPDATE site_visit
  SET deleted_at = now() AT TIME ZONE 'UTC', deleted_by = v_caller
  WHERE id = p_visit AND deleted_at IS NULL;
  RETURN FOUND;
END
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION can_change_visit(text, text), delete_visit(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION can_change_visit(text, text), delete_visit(text) TO app_user;
--> statement-breakpoint
ALTER TABLE site_visit ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE site_visit_member ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY site_visit_select ON site_visit FOR SELECT
  USING (
    can_see_project(current_setting('app.user_id', true), project_id)
    AND (
      deleted_at IS NULL
      OR EXISTS (
        SELECT 1 FROM project p
        WHERE p.id = site_visit.project_id
          AND has_workspace_role(current_setting('app.user_id', true), p.workspace_id, '{admin,auditor}')
      )
    )
  );
--> statement-breakpoint
CREATE POLICY site_visit_insert ON site_visit FOR INSERT
  WITH CHECK (
    created_by = current_setting('app.user_id', true)
    AND can_work_on_project(current_setting('app.user_id', true), project_id)
  );
--> statement-breakpoint
-- Edits by the author or an admin; admins also restore (deleted_at back to null). The project can't move.
CREATE POLICY site_visit_update ON site_visit FOR UPDATE
  USING (can_change_visit(current_setting('app.user_id', true), id))
  WITH CHECK (can_work_on_project(current_setting('app.user_id', true), project_id));
--> statement-breakpoint
CREATE POLICY site_visit_member_select ON site_visit_member FOR SELECT
  USING (EXISTS (SELECT 1 FROM site_visit v WHERE v.id = site_visit_member.visit_id));
--> statement-breakpoint
CREATE POLICY site_visit_member_write ON site_visit_member FOR ALL
  USING (can_change_visit(current_setting('app.user_id', true), visit_id))
  WITH CHECK (can_change_visit(current_setting('app.user_id', true), visit_id));
--> statement-breakpoint
-- A visit stays on its project: the update policy checks the new row's project, this keeps it the same.
CREATE FUNCTION site_visit_keep_project()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.project_id IS DISTINCT FROM OLD.project_id OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'a visit keeps its project and author' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION site_visit_keep_project() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER site_visit_keep_project
  BEFORE UPDATE OF project_id, created_by ON site_visit
  FOR EACH ROW EXECUTE FUNCTION site_visit_keep_project();
