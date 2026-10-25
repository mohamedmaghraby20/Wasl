CREATE TABLE "resource_moderators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" text,
	"event_id" text,
	"user_id" uuid NOT NULL,
	"assigned_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_moderators_scope_check" CHECK (("resource_moderators"."community_id" is not null and "resource_moderators"."event_id" is null) or ("resource_moderators"."community_id" is null and "resource_moderators"."event_id" is not null)),
	CONSTRAINT "resource_moderators_not_self" CHECK ("resource_moderators"."user_id" <> "resource_moderators"."assigned_by_user_id")
);
--> statement-breakpoint
ALTER TABLE "resource_moderators" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "resource_moderators" ADD CONSTRAINT "resource_moderators_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_moderators" ADD CONSTRAINT "resource_moderators_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_moderators" ADD CONSTRAINT "resource_moderators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_moderators" ADD CONSTRAINT "resource_moderators_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "resource_moderators_community_user_unique" ON "resource_moderators" USING btree ("community_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_moderators_event_user_unique" ON "resource_moderators" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "resource_moderators_event_idx" ON "resource_moderators" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "resource_moderators_user_idx" ON "resource_moderators" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resource_moderators_assigner_idx" ON "resource_moderators" USING btree ("assigned_by_user_id");
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.resource_moderators FROM PUBLIC, anon, authenticated;
