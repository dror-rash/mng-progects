-- Task 071 (ADR-0008): every project has a customer and one of its sites, in the database. Projects without
-- either (left over from before task 055, nearly all from e2e runs) are removed first so the columns can be
-- NOT NULL. Their tasks, crews, visits and attachment rows cascade; copies keep their row with copied_from_id
-- set to null. Stored files of removed projects stay in storage (purging is parked in task 059).
DELETE FROM "project" WHERE "organization_id" IS NULL OR "site_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "project" DROP CONSTRAINT "project_organization_id_organization_id_fk";
--> statement-breakpoint
ALTER TABLE "project" DROP CONSTRAINT "project_site_id_site_id_fk";
--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "site_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- The site can't be null any more, so the "no site yet" branch goes. Nothing else changes. CREATE OR REPLACE
-- keeps the trigger and the revoked EXECUTE.
-- ON DELETE NO ACTION above (not RESTRICT): it is checked at the end of the statement, so a workspace's
-- cascade still removes its customers and sites with their projects; any other hard delete of a customer or
-- site in use is refused (customers and sites are otherwise only soft-deleted, task 051).
CREATE OR REPLACE FUNCTION project_site_check()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM site s
    JOIN organization o ON o.id = s.organization_id
    WHERE s.id = NEW.site_id
      AND s.workspace_id = NEW.workspace_id
      AND (o.id = NEW.organization_id OR o.parent_id = NEW.organization_id)
  ) THEN
    RAISE EXCEPTION 'site % is not a site of the customer of project %', NEW.site_id, NEW.id USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
