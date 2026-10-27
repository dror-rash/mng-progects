CREATE TABLE "workspace" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_member" (
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_member_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
DROP INDEX "organization_owner_kind_idx";--> statement-breakpoint
DROP INDEX "project_owner_organization_idx";--> statement-breakpoint
-- Edited before first apply (ADR-0005): add the columns as nullable, give every user a personal
-- workspace (as admin), move each project and customer into its owner's workspace, then require it.
ALTER TABLE "organization" ADD COLUMN "workspace_id" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "workspace_id" text;--> statement-breakpoint
INSERT INTO "workspace" ("id", "name")
SELECT 'personal-' || "id",
       CASE WHEN btrim("name") = '' THEN 'My workspace' ELSE btrim("name") || '''s workspace' END
FROM "user";--> statement-breakpoint
INSERT INTO "workspace_member" ("workspace_id", "user_id", "role")
SELECT 'personal-' || "id", "id", 'admin' FROM "user";--> statement-breakpoint
UPDATE "project" SET "workspace_id" = 'personal-' || "owner_id";--> statement-breakpoint
UPDATE "organization" SET "workspace_id" = 'personal-' || "owner_id";--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_member_user_idx" ON "workspace_member" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_workspace_kind_idx" ON "organization" USING btree ("workspace_id","kind");--> statement-breakpoint
CREATE INDEX "project_workspace_organization_idx" ON "project" USING btree ("workspace_id","organization_id");