CREATE TABLE "notification_email_deliveries" (
	"notification_id" uuid PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"provider_message_id" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_email_deliveries_status_check" CHECK ("notification_email_deliveries"."status" in ('PENDING', 'RETRY', 'SENT', 'FAILED')),
	CONSTRAINT "notification_email_deliveries_attempt_count_check" CHECK ("notification_email_deliveries"."attempt_count" >= 0),
	CONSTRAINT "notification_email_deliveries_sent_check" CHECK (("notification_email_deliveries"."status" = 'SENT' and "notification_email_deliveries"."sent_at" is not null) or ("notification_email_deliveries"."status" <> 'SENT' and "notification_email_deliveries"."sent_at" is null)),
	CONSTRAINT "notification_email_deliveries_provider_id_length" CHECK ("notification_email_deliveries"."provider_message_id" is null or char_length("notification_email_deliveries"."provider_message_id") between 1 and 200),
	CONSTRAINT "notification_email_deliveries_error_length" CHECK ("notification_email_deliveries"."last_error" is null or char_length("notification_email_deliveries"."last_error") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "notification_email_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"event_key" text NOT NULL,
	"type" text NOT NULL,
	"context_type" text NOT NULL,
	"context_id" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_event_key_length" CHECK (char_length("notifications"."event_key") between 1 and 200),
	CONSTRAINT "notifications_type_length" CHECK (char_length("notifications"."type") between 1 and 80),
	CONSTRAINT "notifications_context_type_check" CHECK ("notifications"."context_type" in ('community', 'event', 'organization')),
	CONSTRAINT "notifications_context_id_length" CHECK (char_length("notifications"."context_id") between 1 and 160)
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notification_email_deliveries" ADD CONSTRAINT "notification_email_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_email_deliveries_due_idx" ON "notification_email_deliveries" USING btree ("next_attempt_at") WHERE "notification_email_deliveries"."status" in ('PENDING', 'RETRY');--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_recipient_event_unique" ON "notifications" USING btree ("recipient_user_id","event_key");--> statement-breakpoint
CREATE INDEX "notifications_recipient_created_idx" ON "notifications" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_unread_idx" ON "notifications" USING btree ("recipient_user_id","created_at") WHERE "notifications"."read_at" is null;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE
  public.notifications,
  public.notification_email_deliveries
FROM PUBLIC, anon, authenticated;
