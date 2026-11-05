-- Task 061, after the access audit. Readings are append-only: no update or delete policy (0038) already lets
-- nothing through, and without the privileges a later permissive policy can't open them by accident either
-- (as 0034 did for attachment). A task that adds deleting readings grants back only the columns it needs.
REVOKE UPDATE, DELETE ON form_submission FROM app_user;
