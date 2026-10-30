CREATE INDEX "organization_note_author_idx" ON "organization_note" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "task_project_idx" ON "task" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "workspace_invite_created_by_idx" ON "workspace_invite" USING btree ("created_by");