CREATE TYPE "identity"."age_eligibility_status" AS ENUM('UNVERIFIED', '18_PLUS', 'UNDER_18');--> statement-breakpoint
CREATE TYPE "public"."legal_document_status" AS ENUM('DRAFT', 'APPROVED', 'PUBLISHED', 'SUPERSEDED');--> statement-breakpoint
CREATE TYPE "public"."privacy_provider_action_status" AS ENUM('PENDING', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."privacy_request_status" AS ENUM('RECEIVED', 'IN_REVIEW', 'PENDING_PROVIDER', 'COMPLETED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."privacy_request_type" AS ENUM('ACCESS', 'CORRECTION', 'EXPORT', 'DELETION');--> statement-breakpoint
CREATE TYPE "public"."retention_policy_status" AS ENUM('TBD_LEGAL', 'APPROVED');--> statement-breakpoint
CREATE TABLE "identity"."age_eligibilities" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"status" "identity"."age_eligibility_status" NOT NULL,
	"method" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by_user_id" uuid,
	"note" text,
	CONSTRAINT "age_eligibilities_method_length" CHECK (char_length("identity"."age_eligibilities"."method") between 1 and 80),
	CONSTRAINT "age_eligibilities_note_length" CHECK ("identity"."age_eligibilities"."note" is null or char_length("identity"."age_eligibilities"."note") <= 1000)
);
--> statement-breakpoint
ALTER TABLE "identity"."age_eligibilities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "legal_acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"version" text NOT NULL,
	"document_id" uuid,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legal_acceptances_document_type_check" CHECK ("legal_acceptances"."document_type" in ('TERMS_OF_USE', 'PRIVACY_NOTICE', 'AGE_ELIGIBILITY_POLICY', 'COOKIE_NOTICE')),
	CONSTRAINT "legal_acceptances_version_length" CHECK (char_length("legal_acceptances"."version") between 1 and 40)
);
--> statement-breakpoint
ALTER TABLE "legal_acceptances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "legal_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"version" text NOT NULL,
	"locale" text NOT NULL,
	"status" "legal_document_status" DEFAULT 'DRAFT' NOT NULL,
	"content" text,
	"content_hash" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legal_documents_type_check" CHECK ("legal_documents"."type" in ('TERMS_OF_USE', 'PRIVACY_NOTICE', 'AGE_ELIGIBILITY_POLICY', 'COOKIE_NOTICE', 'TAKEDOWN_PROCEDURE', 'PROCESSOR_TRANSFER_REGISTER', 'RETENTION_SCHEDULE')),
	CONSTRAINT "legal_documents_version_length" CHECK (char_length("legal_documents"."version") between 1 and 40),
	CONSTRAINT "legal_documents_locale_check" CHECK ("legal_documents"."locale" in ('ar', 'en', 'tr')),
	CONSTRAINT "legal_documents_content_hash_format" CHECK ("legal_documents"."content_hash" is null or "legal_documents"."content_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "legal_documents_approval_check" CHECK (("legal_documents"."status" in ('DRAFT', 'SUPERSEDED') and "legal_documents"."approved_by" is null and "legal_documents"."approved_at" is null and "legal_documents"."published_at" is null) or ("legal_documents"."status" = 'APPROVED' and "legal_documents"."approved_by" is not null and "legal_documents"."approved_at" is not null and "legal_documents"."published_at" is null) or ("legal_documents"."status" = 'PUBLISHED' and "legal_documents"."approved_by" is not null and "legal_documents"."approved_at" is not null and "legal_documents"."published_at" is not null and "legal_documents"."content" is not null))
);
--> statement-breakpoint
ALTER TABLE "legal_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "privacy_provider_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"action" text NOT NULL,
	"status" "privacy_provider_action_status" DEFAULT 'PENDING' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "privacy_provider_actions_provider_check" CHECK ("privacy_provider_actions"."provider" in ('WASL', 'SUPABASE_AUTH', 'SUPABASE_STORAGE', 'STREAM', 'RESEND')),
	CONSTRAINT "privacy_provider_actions_action_length" CHECK (char_length("privacy_provider_actions"."action") between 1 and 80),
	CONSTRAINT "privacy_provider_actions_attempts_check" CHECK ("privacy_provider_actions"."attempt_count" >= 0),
	CONSTRAINT "privacy_provider_actions_completion_check" CHECK (("privacy_provider_actions"."status" = 'SUCCEEDED' and "privacy_provider_actions"."completed_at" is not null) or ("privacy_provider_actions"."status" <> 'SUCCEEDED' and "privacy_provider_actions"."completed_at" is null)),
	CONSTRAINT "privacy_provider_actions_error_length" CHECK ("privacy_provider_actions"."last_error" is null or char_length("privacy_provider_actions"."last_error") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "privacy_provider_actions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "privacy_request_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"actor_role" text NOT NULL,
	"event_type" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "privacy_request_events_actor_role_check" CHECK ("privacy_request_events"."actor_role" in ('USER', 'ADMIN', 'SYSTEM')),
	CONSTRAINT "privacy_request_events_event_type_length" CHECK (char_length("privacy_request_events"."event_type") between 1 and 80),
	CONSTRAINT "privacy_request_events_note_length" CHECK ("privacy_request_events"."note" is null or char_length("privacy_request_events"."note") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "privacy_request_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "privacy_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"request_type" "privacy_request_type" NOT NULL,
	"status" "privacy_request_status" DEFAULT 'RECEIVED' NOT NULL,
	"request_note" text,
	"due_at" timestamp with time zone NOT NULL,
	"identity_verified_at" timestamp with time zone,
	"decided_by_user_id" uuid,
	"decision_note" text,
	"decided_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "privacy_requests_request_note_length" CHECK ("privacy_requests"."request_note" is null or char_length("privacy_requests"."request_note") <= 2000),
	CONSTRAINT "privacy_requests_decision_note_length" CHECK ("privacy_requests"."decision_note" is null or char_length("privacy_requests"."decision_note") <= 2000),
	CONSTRAINT "privacy_requests_decision_check" CHECK (("privacy_requests"."status" in ('COMPLETED', 'REJECTED') and "privacy_requests"."decided_by_user_id" is not null and "privacy_requests"."decided_at" is not null) or ("privacy_requests"."status" not in ('COMPLETED', 'REJECTED') and "privacy_requests"."decided_by_user_id" is null and "privacy_requests"."decided_at" is null)),
	CONSTRAINT "privacy_requests_completion_check" CHECK (("privacy_requests"."status" = 'COMPLETED' and "privacy_requests"."completed_at" is not null) or ("privacy_requests"."status" <> 'COMPLETED' and "privacy_requests"."completed_at" is null))
);
--> statement-breakpoint
ALTER TABLE "privacy_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "retention_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_group" text NOT NULL,
	"trigger_event" text NOT NULL,
	"duration_days" integer,
	"handling" text NOT NULL,
	"owner" text NOT NULL,
	"status" "retention_policy_status" DEFAULT 'TBD_LEGAL' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retention_policies_data_group_unique" UNIQUE("data_group"),
	CONSTRAINT "retention_policies_trigger_event_length" CHECK (char_length("retention_policies"."trigger_event") between 1 and 200),
	CONSTRAINT "retention_policies_handling_length" CHECK (char_length("retention_policies"."handling") between 1 and 500),
	CONSTRAINT "retention_policies_owner_length" CHECK (char_length("retention_policies"."owner") between 1 and 120),
	CONSTRAINT "retention_policies_duration_check" CHECK (("retention_policies"."status" = 'TBD_LEGAL' and "retention_policies"."duration_days" is null and "retention_policies"."approved_by" is null and "retention_policies"."approved_at" is null) or ("retention_policies"."status" = 'APPROVED' and "retention_policies"."duration_days" is not null and "retention_policies"."duration_days" > 0 and "retention_policies"."approved_by" is not null and "retention_policies"."approved_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "retention_policies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "identity"."age_eligibilities" ADD CONSTRAINT "age_eligibilities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."age_eligibilities" ADD CONSTRAINT "age_eligibilities_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_document_id_legal_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."legal_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_provider_actions" ADD CONSTRAINT "privacy_provider_actions_request_id_privacy_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."privacy_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_request_events" ADD CONSTRAINT "privacy_request_events_request_id_privacy_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."privacy_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_request_events" ADD CONSTRAINT "privacy_request_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "age_eligibilities_status_idx" ON "identity"."age_eligibilities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "age_eligibilities_reviewer_idx" ON "identity"."age_eligibilities" USING btree ("reviewed_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_acceptances_user_type_version_unique" ON "legal_acceptances" USING btree ("user_id","document_type","version");--> statement-breakpoint
CREATE INDEX "legal_acceptances_document_idx" ON "legal_acceptances" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_documents_type_version_locale_unique" ON "legal_documents" USING btree ("type","version","locale");--> statement-breakpoint
CREATE INDEX "legal_documents_type_status_idx" ON "legal_documents" USING btree ("type","status","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "privacy_provider_actions_request_unique" ON "privacy_provider_actions" USING btree ("request_id","provider","action");--> statement-breakpoint
CREATE INDEX "privacy_provider_actions_status_idx" ON "privacy_provider_actions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "privacy_request_events_request_created_idx" ON "privacy_request_events" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "privacy_request_events_actor_idx" ON "privacy_request_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "privacy_requests_open_deletion_unique" ON "privacy_requests" USING btree ("user_id") WHERE "privacy_requests"."request_type" = 'DELETION' and "privacy_requests"."status" in ('RECEIVED', 'IN_REVIEW', 'PENDING_PROVIDER');--> statement-breakpoint
CREATE INDEX "privacy_requests_user_created_idx" ON "privacy_requests" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "privacy_requests_status_due_idx" ON "privacy_requests" USING btree ("status","due_at");--> statement-breakpoint
CREATE INDEX "privacy_requests_decider_idx" ON "privacy_requests" USING btree ("decided_by_user_id");
REVOKE ALL PRIVILEGES ON TABLE
  identity.age_eligibilities,
  public.legal_documents,
  public.legal_acceptances,
  public.privacy_requests,
  public.privacy_request_events,
  public.privacy_provider_actions,
  public.retention_policies
FROM PUBLIC, anon, authenticated;