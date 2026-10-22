ALTER TABLE "communities" ADD COLUMN "created_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "created_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "communities_created_by_user_id_idx" ON "communities" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "events_created_by_user_id_idx" ON "events" USING btree ("created_by_user_id");