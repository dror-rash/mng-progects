-- Task 049: the app reads every customer name through customer_name (partners can't read organization at
-- all), so the view lists customers only, and not deleted ones, for everyone. Same columns as in 0020;
-- CREATE OR REPLACE keeps the grants (SELECT only for app_user).
CREATE OR REPLACE VIEW customer_name WITH (security_barrier) AS
  SELECT id, workspace_id, name
  FROM organization
  WHERE kind = 'customer'
    AND deleted_at IS NULL
    AND can_see_customer_name(current_setting('app.user_id', true), id);
