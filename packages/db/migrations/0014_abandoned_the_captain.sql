ALTER TABLE "organization_note" ADD COLUMN "author_id" text;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "assignee_id" text;--> statement-breakpoint
ALTER TABLE "organization_note" ADD CONSTRAINT "organization_note_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_assignee_idx" ON "task" USING btree ("assignee_id");