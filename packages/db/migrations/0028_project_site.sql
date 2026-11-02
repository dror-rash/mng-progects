ALTER TABLE "project" ADD COLUMN "site_id" text;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_site_idx" ON "project" USING btree ("site_id");--> statement-breakpoint
-- Task 055 (ADR-0008): a project's site is one of its customer's sites or of the customer's sub-companies,
-- in the project's workspace. Null only for projects from before sites were required (the app asks for a
-- site on every save). SECURITY DEFINER so the check sees sites row-level security hides from the writer.
CREATE FUNCTION project_site_check()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.site_id IS NULL THEN
    RETURN NEW;
  END IF;
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
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION project_site_check() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER project_site_check
  BEFORE INSERT OR UPDATE OF site_id, organization_id, workspace_id ON project
  FOR EACH ROW EXECUTE FUNCTION project_site_check();
--> statement-breakpoint
-- A sub-company can't leave its parent while the parent's (not deleted) projects are at its sites: those
-- projects would be at a site of another customer. The app says so first (task 055); this keeps the rule.
CREATE OR REPLACE FUNCTION organization_parent_check()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_parent organization%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.parent_id IS NOT NULL AND NEW.parent_id IS DISTINCT FROM OLD.parent_id
     AND EXISTS (
       SELECT 1
       FROM project p
       JOIN site s ON s.id = p.site_id
       WHERE s.organization_id = NEW.id
         AND p.organization_id = OLD.parent_id
         AND p.deleted_at IS NULL
     ) THEN
    RAISE EXCEPTION 'projects of organization % are at the sites of %', OLD.parent_id, NEW.id USING ERRCODE = '23514';
  END IF;
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'organization % cannot be its own parent', NEW.id USING ERRCODE = '23514';
  END IF;
  SELECT * INTO v_parent FROM organization WHERE id = NEW.parent_id;
  IF v_parent.workspace_id IS DISTINCT FROM NEW.workspace_id OR v_parent.kind IS DISTINCT FROM NEW.kind THEN
    RAISE EXCEPTION 'the parent of organization % must be in its workspace and of its kind', NEW.id USING ERRCODE = '23514';
  END IF;
  IF v_parent.parent_id IS NOT NULL THEN
    RAISE EXCEPTION 'organization % is a sub-company, so it cannot be a parent', v_parent.id USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM organization c WHERE c.parent_id = NEW.id) THEN
    RAISE EXCEPTION 'organization % has sub-companies, so it cannot have a parent', NEW.id USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
-- Partners (and, from task 056, workers) see the sites of the projects they see, and their on-site
-- contacts (site_contact_select uses this too). Deleted projects don't count. CREATE OR REPLACE keeps the
-- grants (app_user only).
CREATE OR REPLACE FUNCTION can_see_site(p_user text, p_site text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM site s
    CROSS JOIN LATERAL access_role(p_user, s.workspace_id) a
    WHERE s.id = p_site
      AND a.role IN ('admin', 'auditor')
  ) OR EXISTS (
    SELECT 1
    FROM project pr
    WHERE pr.site_id = p_site
      AND pr.deleted_at IS NULL
      AND can_see_project(p_user, pr.id)
  )
$$;
--> statement-breakpoint
-- The sites a user may choose for a project: not deleted, of a customer (not deleted) whose name they may
-- see. Partners choose sites of their assigned customers here without reading the sites themselves. Names
-- and the customer group only; SELECT only for app_user.
CREATE VIEW site_choice WITH (security_barrier) AS
  SELECT s.id, s.workspace_id, s.organization_id,
         o.parent_id AS customer_parent_id,
         o.name AS customer_name,
         s.name
  FROM site s
  JOIN organization o ON o.id = s.organization_id
  WHERE s.deleted_at IS NULL
    AND o.deleted_at IS NULL
    AND o.kind = 'customer'
    AND can_see_customer_name(current_setting('app.user_id', true), s.organization_id);
--> statement-breakpoint
REVOKE ALL ON site_choice FROM app_user;
--> statement-breakpoint
GRANT SELECT ON site_choice TO app_user;
