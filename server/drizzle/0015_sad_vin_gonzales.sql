CREATE TABLE "messaging_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"community_id" text,
	"event_id" text,
	"dm_user_low_id" uuid,
	"dm_user_high_id" uuid,
	"provider_channel_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messaging_conversations_provider_channel_id_unique" UNIQUE("provider_channel_id"),
	CONSTRAINT "messaging_conversations_provider_id_length" CHECK (char_length("messaging_conversations"."provider_channel_id") between 1 and 100),
	CONSTRAINT "messaging_conversations_kind_check" CHECK (("messaging_conversations"."kind" = 'community' and "messaging_conversations"."community_id" is not null and "messaging_conversations"."event_id" is null and "messaging_conversations"."dm_user_low_id" is null and "messaging_conversations"."dm_user_high_id" is null) or ("messaging_conversations"."kind" = 'event' and "messaging_conversations"."event_id" is not null and "messaging_conversations"."community_id" is null and "messaging_conversations"."dm_user_low_id" is null and "messaging_conversations"."dm_user_high_id" is null) or ("messaging_conversations"."kind" = 'dm' and "messaging_conversations"."community_id" is null and "messaging_conversations"."event_id" is null and "messaging_conversations"."dm_user_low_id" is not null and "messaging_conversations"."dm_user_high_id" is not null and "messaging_conversations"."dm_user_low_id" < "messaging_conversations"."dm_user_high_id"))
);
--> statement-breakpoint
ALTER TABLE "messaging_conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messaging_user_mappings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"provider_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messaging_user_mappings_provider_user_id_unique" UNIQUE("provider_user_id"),
	CONSTRAINT "messaging_user_mappings_provider_id_length" CHECK (char_length("messaging_user_mappings"."provider_user_id") between 1 and 100)
);
--> statement-breakpoint
ALTER TABLE "messaging_user_mappings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messaging_conversations" ADD CONSTRAINT "messaging_conversations_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_conversations" ADD CONSTRAINT "messaging_conversations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_conversations" ADD CONSTRAINT "messaging_conversations_dm_user_low_id_users_id_fk" FOREIGN KEY ("dm_user_low_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_conversations" ADD CONSTRAINT "messaging_conversations_dm_user_high_id_users_id_fk" FOREIGN KEY ("dm_user_high_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_user_mappings" ADD CONSTRAINT "messaging_user_mappings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "messaging_conversations_community_unique" ON "messaging_conversations" USING btree ("community_id");--> statement-breakpoint
CREATE UNIQUE INDEX "messaging_conversations_event_unique" ON "messaging_conversations" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "messaging_conversations_dm_pair_unique" ON "messaging_conversations" USING btree ("dm_user_low_id","dm_user_high_id");--> statement-breakpoint
CREATE INDEX "messaging_conversations_dm_high_idx" ON "messaging_conversations" USING btree ("dm_user_high_id");
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE
  public.messaging_conversations,
  public.messaging_user_mappings
FROM PUBLIC, anon, authenticated;
