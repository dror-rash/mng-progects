-- Tasks already Done before completed_at existed: use the last status change as the completion time.
UPDATE "task" SET "completed_at" = "updated_at" WHERE "status" = 'done' AND "completed_at" IS NULL;
