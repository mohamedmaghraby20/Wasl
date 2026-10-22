CREATE TYPE "public"."organization_verification_request_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "organization_verification_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"status" "organization_verification_request_status" DEFAULT 'PENDING' NOT NULL,
	"request_note" text,
	"decision_note" text,
	"decided_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	CONSTRAINT "organization_verification_requests_request_note_length" CHECK ("organization_verification_requests"."request_note" is null or char_length("organization_verification_requests"."request_note") <= 2000),
	CONSTRAINT "organization_verification_requests_decision_note_length" CHECK ("organization_verification_requests"."decision_note" is null or char_length("organization_verification_requests"."decision_note") <= 2000),
	CONSTRAINT "organization_verification_requests_decision_matches_status" CHECK (("organization_verification_requests"."status" = 'PENDING' and "organization_verification_requests"."decided_at" is null and "organization_verification_requests"."decided_by_user_id" is null and "organization_verification_requests"."decision_note" is null) or ("organization_verification_requests"."status" in ('APPROVED', 'REJECTED') and "organization_verification_requests"."decided_at" is not null and "organization_verification_requests"."decided_by_user_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "organization_verification_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organization_verification_requests" ADD CONSTRAINT "organization_verification_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_verification_requests" ADD CONSTRAINT "organization_verification_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_verification_requests" ADD CONSTRAINT "organization_verification_requests_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_verification_requests_pending_unique" ON "organization_verification_requests" USING btree ("organization_id") WHERE "organization_verification_requests"."status" = 'PENDING';--> statement-breakpoint
CREATE INDEX "organization_verification_requests_org_created_idx" ON "organization_verification_requests" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "organization_verification_requests_status_created_idx" ON "organization_verification_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "organization_verification_requests_requester_idx" ON "organization_verification_requests" USING btree ("requested_by_user_id");--> statement-breakpoint
CREATE INDEX "organization_verification_requests_decider_idx" ON "organization_verification_requests" USING btree ("decided_by_user_id");
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE
  public.organization_verification_requests
FROM PUBLIC, anon, authenticated;