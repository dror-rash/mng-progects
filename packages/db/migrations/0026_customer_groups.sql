ALTER TABLE "organization" ADD COLUMN "parent_id" text;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_parent_id_organization_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_parent_idx" ON "organization" USING btree ("parent_id");--> statement-breakpoint
-- Task 053 (ADR-0008): one level of sub-companies. The parent must be in the same workspace, of the same
-- kind, top-level itself, and not the row; a row with sub-companies (deleted ones too, so a restore can't
-- make two levels) can't get a parent. SECURITY DEFINER so the checks see rows row-level security hides
-- (deleted sub-companies); search_path pinned with pg_temp last (task 052).
CREATE OR REPLACE FUNCTION organization_parent_check()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_parent organization%ROWTYPE;
BEGIN
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
REVOKE EXECUTE ON FUNCTION organization_parent_check() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER organization_parent_check
  BEFORE INSERT OR UPDATE OF parent_id, workspace_id, kind ON organization
  FOR EACH ROW EXECUTE FUNCTION organization_parent_check();
--> statement-breakpoint
-- Sub-companies show as "Parent › Sub-company" everywhere (task 053). The parent's name is shown even when
-- only the sub-company is assigned to a partner (owner's call, 2026-11-02). New columns go last, so
-- CREATE OR REPLACE keeps the view and its grants (SELECT only for app_user).
CREATE OR REPLACE VIEW customer_name WITH (security_barrier) AS
  SELECT o.id, o.workspace_id, o.name,
         p.name AS parent_name,
         CASE WHEN p.name IS NULL THEN o.name ELSE p.name || ' › ' || o.name END AS label
  FROM organization o
  LEFT JOIN organization p ON p.id = o.parent_id
  WHERE o.kind = 'customer'
    AND o.deleted_at IS NULL
    AND can_see_customer_name(current_setting('app.user_id', true), o.id);
