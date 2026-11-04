-- Task 071, after review: a project without a customer or a site is refused by the columns' NOT NULL
-- (23502, "null value in column ... violates not-null constraint"), not by this trigger, which runs first
-- and would otherwise report it as "site <NULL> is not a site of the customer" (23514). So it leaves a
-- null to NOT NULL and checks only a site that is given. CREATE OR REPLACE keeps the trigger and the
-- revoked EXECUTE.
CREATE OR REPLACE FUNCTION project_site_check()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.organization_id IS NULL OR NEW.site_id IS NULL THEN
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
