CREATE TABLE "moderation_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_user_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"decided_by_user_id" uuid,
	"decision_note" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_reports_target_type_check" CHECK ("moderation_reports"."target_type" in ('user', 'community', 'event', 'organization', 'post')),
	CONSTRAINT "moderation_reports_target_id_length" CHECK (char_length("moderation_reports"."target_id") between 1 and 160),
	CONSTRAINT "moderation_reports_reason_length" CHECK (char_length("moderation_reports"."reason") between 1 and 2000),
	CONSTRAINT "moderation_reports_status_check" CHECK ("moderation_reports"."status" in ('OPEN', 'ACTIONED', 'DISMISSED')),
	CONSTRAINT "moderation_reports_decision_note_length" CHECK ("moderation_reports"."decision_note" is null or char_length("moderation_reports"."decision_note") <= 2000),
	CONSTRAINT "moderation_reports_decision_check" CHECK (("moderation_reports"."status" = 'OPEN' and "moderation_reports"."decided_by_user_id" is null and "moderation_reports"."decided_at" is null and "moderation_reports"."decision_note" is null) or ("moderation_reports"."status" <> 'OPEN' and "moderation_reports"."decided_by_user_id" is not null and "moderation_reports"."decided_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "moderation_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moderation_reports_status_created_idx" ON "moderation_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "moderation_reports_reporter_created_idx" ON "moderation_reports" USING btree ("reporter_user_id","created_at");--> statement-breakpoint
CREATE INDEX "moderation_reports_target_idx" ON "moderation_reports" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "moderation_reports_decider_idx" ON "moderation_reports" USING btree ("decided_by_user_id");
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.moderation_reports FROM PUBLIC, anon, authenticated;
