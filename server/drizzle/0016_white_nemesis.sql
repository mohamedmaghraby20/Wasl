CREATE TABLE "messaging_member_sync" (
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_member" boolean DEFAULT false NOT NULL,
	"desired_member" boolean DEFAULT true NOT NULL,
	"last_error" text,
	"last_checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messaging_member_sync_pk" PRIMARY KEY("conversation_id","user_id"),
	CONSTRAINT "messaging_member_sync_error_length" CHECK ("messaging_member_sync"."last_error" is null or char_length("messaging_member_sync"."last_error") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "messaging_member_sync" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messaging_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_user_id" uuid NOT NULL,
	"reported_user_id" uuid,
	"conversation_id" uuid,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messaging_reports_reason_length" CHECK (char_length("messaging_reports"."reason") between 1 and 2000),
	CONSTRAINT "messaging_reports_target_check" CHECK ("messaging_reports"."reported_user_id" is not null or "messaging_reports"."conversation_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "messaging_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messaging_user_blocks" (
	"blocker_user_id" uuid NOT NULL,
	"blocked_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messaging_user_blocks_pk" PRIMARY KEY("blocker_user_id","blocked_user_id"),
	CONSTRAINT "messaging_user_blocks_not_self" CHECK ("messaging_user_blocks"."blocker_user_id" <> "messaging_user_blocks"."blocked_user_id")
);
--> statement-breakpoint
ALTER TABLE "messaging_user_blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messaging_member_sync" ADD CONSTRAINT "messaging_member_sync_conversation_id_messaging_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."messaging_conversations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_member_sync" ADD CONSTRAINT "messaging_member_sync_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_reports" ADD CONSTRAINT "messaging_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_reports" ADD CONSTRAINT "messaging_reports_reported_user_id_users_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_reports" ADD CONSTRAINT "messaging_reports_conversation_id_messaging_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."messaging_conversations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_user_blocks" ADD CONSTRAINT "messaging_user_blocks_blocker_user_id_users_id_fk" FOREIGN KEY ("blocker_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_user_blocks" ADD CONSTRAINT "messaging_user_blocks_blocked_user_id_users_id_fk" FOREIGN KEY ("blocked_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messaging_member_sync_user_idx" ON "messaging_member_sync" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messaging_member_sync_checked_idx" ON "messaging_member_sync" USING btree ("last_checked_at");--> statement-breakpoint
CREATE INDEX "messaging_reports_reporter_created_idx" ON "messaging_reports" USING btree ("reporter_user_id","created_at");--> statement-breakpoint
CREATE INDEX "messaging_reports_conversation_created_idx" ON "messaging_reports" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "messaging_user_blocks_blocked_idx" ON "messaging_user_blocks" USING btree ("blocked_user_id");
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE
  public.messaging_member_sync,
  public.messaging_reports,
  public.messaging_user_blocks
FROM PUBLIC, anon, authenticated;
