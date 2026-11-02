CREATE TABLE "site" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"access_notes" text,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" text,
	CONSTRAINT "site_coordinates_both_or_neither" CHECK (("site"."latitude" is null) = ("site"."longitude" is null)),
	CONSTRAINT "site_latitude_range" CHECK ("site"."latitude" between -90 and 90),
	CONSTRAINT "site_longitude_range" CHECK ("site"."longitude" between -180 and 180)
);
--> statement-breakpoint
CREATE TABLE "site_contact" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"phone" text,
	"email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" text
);
--> statement-breakpoint
ALTER TABLE "site" ADD CONSTRAINT "site_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site" ADD CONSTRAINT "site_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site" ADD CONSTRAINT "site_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site" ADD CONSTRAINT "site_organization_fk" FOREIGN KEY ("organization_id","workspace_id") REFERENCES "public"."organization"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_contact" ADD CONSTRAINT "site_contact_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_contact" ADD CONSTRAINT "site_contact_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_organization_idx" ON "site" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "site_workspace_idx" ON "site" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "site_contact_site_idx" ON "site_contact" USING btree ("site_id","created_at");--> statement-breakpoint
-- Task 054 (ADR-0008): who sees and changes sites. Like customers: admins and auditors of the site's
-- workspace see it, admins change it; lists and lookups filter deleted rows themselves (the Deleted page
-- needs them). Task 055 adds partners and workers for the sites of their projects.
CREATE FUNCTION can_see_site(p_user text, p_site text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM site s
    CROSS JOIN LATERAL access_role(p_user, s.workspace_id) a
    WHERE s.id = p_site
      AND a.role IN ('admin', 'auditor')
  )
$$;
--> statement-breakpoint
CREATE FUNCTION can_change_site(p_user text, p_site text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM site s
    CROSS JOIN LATERAL access_role(p_user, s.workspace_id) a
    WHERE s.id = p_site
      AND a.role = 'admin'
  )
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION can_see_site(text, text), can_change_site(text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION can_see_site(text, text), can_change_site(text, text) TO app_user;
--> statement-breakpoint
ALTER TABLE site ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE site_contact ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY site_select ON site FOR SELECT
  USING (can_see_site(current_setting('app.user_id', true), id));
--> statement-breakpoint
CREATE POLICY site_insert ON site FOR INSERT
  WITH CHECK (has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin}'));
--> statement-breakpoint
CREATE POLICY site_update ON site FOR UPDATE
  USING (can_change_site(current_setting('app.user_id', true), id))
  WITH CHECK (has_workspace_role(current_setting('app.user_id', true), workspace_id, '{admin}'));
--> statement-breakpoint
CREATE POLICY site_delete ON site FOR DELETE
  USING (can_change_site(current_setting('app.user_id', true), id));
--> statement-breakpoint
CREATE POLICY site_contact_select ON site_contact FOR SELECT
  USING (can_see_site(current_setting('app.user_id', true), site_id));
--> statement-breakpoint
CREATE POLICY site_contact_write ON site_contact FOR ALL
  USING (can_change_site(current_setting('app.user_id', true), site_id))
  WITH CHECK (can_change_site(current_setting('app.user_id', true), site_id));
