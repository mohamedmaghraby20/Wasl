CREATE EXTENSION IF NOT EXISTS pgmq;
--> statement-breakpoint
SELECT pgmq.create('notification_emails');
--> statement-breakpoint
REVOKE USAGE ON SCHEMA pgmq FROM PUBLIC, anon, authenticated;
