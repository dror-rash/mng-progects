-- Task 046 (ADR-0006). The data changes run before the checks that would refuse the old values.
-- The member role is removed: every existing member becomes an admin.
UPDATE "workspace_member" SET "role" = 'admin' WHERE "role" = 'member';--> statement-breakpoint
-- Open invite links used to make members; nothing should join with broader access silently. Admins create new ones.
UPDATE "workspace_invite" SET "revoked_at" = now() WHERE "revoked_at" IS NULL;--> statement-breakpoint
CREATE TABLE "customer_partner" (
	"organization_id" text NOT NULL,
	"partner_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	CONSTRAINT "customer_partner_organization_id_partner_id_pk" PRIMARY KEY("organization_id","partner_id")
);
--> statement-breakpoint
CREATE TABLE "partner" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" text,
	CONSTRAINT "partner_id_workspace_unique" UNIQUE("id","workspace_id")
);
--> statement-breakpoint
ALTER TABLE "workspace_member" ALTER COLUMN "role" SET DEFAULT 'admin';--> statement-breakpoint
-- Before customer_partner_organization_fk, which references it.
ALTER TABLE "organization" ADD CONSTRAINT "organization_id_workspace_unique" UNIQUE("id","workspace_id");--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "organization_contact" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization_contact" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "organization_note" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization_note" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "visibility" text DEFAULT 'internal' NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "partner_id" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "copied_from_id" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "workspace_invite" ADD COLUMN "role" text DEFAULT 'auditor' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_invite" ADD COLUMN "partner_id" text;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD COLUMN "partner_id" text;--> statement-breakpoint
ALTER TABLE "customer_partner" ADD CONSTRAINT "customer_partner_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_partner" ADD CONSTRAINT "customer_partner_organization_fk" FOREIGN KEY ("organization_id","workspace_id") REFERENCES "public"."organization"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_partner" ADD CONSTRAINT "customer_partner_partner_fk" FOREIGN KEY ("partner_id","workspace_id") REFERENCES "public"."partner"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner" ADD CONSTRAINT "partner_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner" ADD CONSTRAINT "partner_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_partner_partner_idx" ON "customer_partner" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "partner_workspace_idx" ON "partner" USING btree ("workspace_id");--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_contact" ADD CONSTRAINT "organization_contact_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_note" ADD CONSTRAINT "organization_note_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_copied_from_id_project_id_fk" FOREIGN KEY ("copied_from_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_partner_fk" FOREIGN KEY ("partner_id","workspace_id") REFERENCES "public"."partner"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invite" ADD CONSTRAINT "workspace_invite_partner_fk" FOREIGN KEY ("partner_id","workspace_id") REFERENCES "public"."partner"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_partner_fk" FOREIGN KEY ("partner_id","workspace_id") REFERENCES "public"."partner"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_partner_idx" ON "project" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "workspace_member_partner_idx" ON "workspace_member" USING btree ("partner_id");--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_visibility_check" CHECK ("project"."visibility" in ('internal', 'partner'));--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_partner_check" CHECK (("project"."visibility" = 'partner') = ("project"."partner_id" is not null));--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_partner_customer_check" CHECK ("project"."visibility" <> 'partner' or "project"."organization_id" is not null);--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_status_check" CHECK ("project"."status" in ('active', 'canceled'));--> statement-breakpoint
ALTER TABLE "workspace_invite" ADD CONSTRAINT "workspace_invite_role_check" CHECK ("workspace_invite"."role" in ('admin', 'auditor', 'partner'));--> statement-breakpoint
ALTER TABLE "workspace_invite" ADD CONSTRAINT "workspace_invite_partner_check" CHECK (("workspace_invite"."role" = 'partner') = ("workspace_invite"."partner_id" is not null));--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_role_check" CHECK ("workspace_member"."role" in ('admin', 'auditor', 'partner'));--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_partner_check" CHECK (("workspace_member"."role" = 'partner') = ("workspace_member"."partner_id" is not null));--> statement-breakpoint
-- The access rule (ADR-0006), defined once. The app calls these through features/access/predicates.ts;
-- row-level security policies (task 047) will call them too. SECURITY DEFINER (with a fixed search_path)
-- so a policy can call them without recursing into the policies of the tables they read; STABLE because
-- they only read.
--
-- The membership of p_user in p_workspace: their role and, for a partner, their partner company.
-- No row when they aren't a member, or when their partner company is deleted.
CREATE FUNCTION access_role(p_user text, p_workspace text)
RETURNS TABLE (role text, partner_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.role, m.partner_id
  FROM workspace_member m
  WHERE m.user_id = p_user
    AND m.workspace_id = p_workspace
    AND (m.partner_id IS NULL
      OR EXISTS (SELECT 1 FROM partner pt WHERE pt.id = m.partner_id AND pt.deleted_at IS NULL))
$$;--> statement-breakpoint
-- Admins and auditors of the project's workspace see it, deleted or not. A partner sees it only while
-- it is their partner's, not deleted, and its customer is assigned to their partner, with neither the
-- customer nor the partner deleted.
CREATE FUNCTION can_see_project(p_user text, p_project text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM project pr
    CROSS JOIN LATERAL access_role(p_user, pr.workspace_id) a
    WHERE pr.id = p_project
      AND (
        a.role IN ('admin', 'auditor')
        OR (
          a.role = 'partner'
          AND pr.partner_id = a.partner_id
          AND pr.deleted_at IS NULL
          AND EXISTS (
            SELECT 1
            FROM customer_partner cp
            JOIN organization o ON o.id = cp.organization_id
            JOIN partner pt ON pt.id = cp.partner_id
            WHERE cp.organization_id = pr.organization_id
              AND cp.partner_id = a.partner_id
              AND o.deleted_at IS NULL
              AND pt.deleted_at IS NULL
          )
        )
      )
  )
$$;--> statement-breakpoint
-- As can_see_project, but auditors never change anything, and nobody changes a deleted project.
CREATE FUNCTION can_change_project(p_user text, p_project text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM project pr
    CROSS JOIN LATERAL access_role(p_user, pr.workspace_id) a
    WHERE pr.id = p_project
      AND pr.deleted_at IS NULL
      AND (
        a.role = 'admin'
        OR (
          a.role = 'partner'
          AND pr.partner_id = a.partner_id
          AND EXISTS (
            SELECT 1
            FROM customer_partner cp
            JOIN organization o ON o.id = cp.organization_id
            JOIN partner pt ON pt.id = cp.partner_id
            WHERE cp.organization_id = pr.organization_id
              AND cp.partner_id = a.partner_id
              AND o.deleted_at IS NULL
              AND pt.deleted_at IS NULL
          )
        )
      )
  )
$$;--> statement-breakpoint
-- Everything about a customer (details, contacts, notes): admins and auditors of its workspace.
CREATE FUNCTION can_see_customer(p_user text, p_org text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization o
    CROSS JOIN LATERAL access_role(p_user, o.workspace_id) a
    WHERE o.id = p_org
      AND a.role IN ('admin', 'auditor')
  )
$$;--> statement-breakpoint
-- A customer's name only: whoever can see the customer, and partners it is assigned to while neither
-- the customer nor the partner is deleted.
CREATE FUNCTION can_see_customer_name(p_user text, p_org text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT can_see_customer(p_user, p_org) OR EXISTS (
    SELECT 1
    FROM organization o
    CROSS JOIN LATERAL access_role(p_user, o.workspace_id) a
    JOIN customer_partner cp ON cp.organization_id = o.id AND cp.partner_id = a.partner_id
    JOIN partner pt ON pt.id = cp.partner_id
    WHERE o.id = p_org
      AND a.role = 'partner'
      AND o.deleted_at IS NULL
      AND pt.deleted_at IS NULL
  )
$$;--> statement-breakpoint
-- Creating, editing and deleting customers, their contacts and notes: admins only.
CREATE FUNCTION can_change_customer(p_user text, p_org text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization o
    CROSS JOIN LATERAL access_role(p_user, o.workspace_id) a
    WHERE o.id = p_org
      AND a.role = 'admin'
  )
$$;
