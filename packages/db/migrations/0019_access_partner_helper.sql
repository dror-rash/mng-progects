-- Task 046 fix: the partner rule ("this partner works for this customer") is defined once, here, and
-- can_see_project, can_change_project and can_see_customer_name use it. Same behaviour as 0018.
--
-- Whether partner p_partner may work for customer p_org: the customer is assigned to it, and neither
-- the customer nor the partner is deleted.
CREATE FUNCTION partner_serves_customer(p_partner text, p_org text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM customer_partner cp
    JOIN organization o ON o.id = cp.organization_id
    JOIN partner pt ON pt.id = cp.partner_id
    WHERE cp.organization_id = p_org
      AND cp.partner_id = p_partner
      AND o.deleted_at IS NULL
      AND pt.deleted_at IS NULL
  )
$$;--> statement-breakpoint
-- Admins and auditors of the project's workspace see it, deleted or not. A partner sees it only while
-- it is their partner's, not deleted, and their partner serves its customer.
CREATE OR REPLACE FUNCTION can_see_project(p_user text, p_project text)
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
          AND partner_serves_customer(a.partner_id, pr.organization_id)
        )
      )
  )
$$;--> statement-breakpoint
-- As can_see_project, but auditors never change anything, and nobody changes a deleted project.
CREATE OR REPLACE FUNCTION can_change_project(p_user text, p_project text)
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
          AND partner_serves_customer(a.partner_id, pr.organization_id)
        )
      )
  )
$$;--> statement-breakpoint
-- A customer's name only: whoever can see the customer, and partners that serve it.
CREATE OR REPLACE FUNCTION can_see_customer_name(p_user text, p_org text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT can_see_customer(p_user, p_org) OR EXISTS (
    SELECT 1
    FROM organization o
    CROSS JOIN LATERAL access_role(p_user, o.workspace_id) a
    WHERE o.id = p_org
      AND a.role = 'partner'
      AND partner_serves_customer(a.partner_id, o.id)
  )
$$;
