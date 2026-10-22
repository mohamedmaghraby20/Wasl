CREATE TYPE "public"."organization_admin_invitation_status" AS ENUM('PENDING', 'ACCEPTED', 'REVOKED');--> statement-breakpoint
CREATE TABLE "organization_admin_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"target_user_id" uuid NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" "organization_admin_invitation_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	CONSTRAINT "organization_admin_invitations_token_hash_length" CHECK (char_length("organization_admin_invitations"."token_hash") = 64),
	CONSTRAINT "organization_admin_invitations_expiry_after_creation" CHECK ("organization_admin_invitations"."expires_at" > "organization_admin_invitations"."created_at"),
	CONSTRAINT "organization_admin_invitations_distinct_users" CHECK ("organization_admin_invitations"."target_user_id" <> "organization_admin_invitations"."invited_by_user_id"),
	CONSTRAINT "organization_admin_invitations_response_matches_status" CHECK (("organization_admin_invitations"."status" = 'PENDING' and "organization_admin_invitations"."responded_at" is null) or ("organization_admin_invitations"."status" in ('ACCEPTED', 'REVOKED') and "organization_admin_invitations"."responded_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "organization_admin_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organization_admin_invitations" ADD CONSTRAINT "organization_admin_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_admin_invitations" ADD CONSTRAINT "organization_admin_invitations_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_admin_invitations" ADD CONSTRAINT "organization_admin_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_admin_invitations_token_hash_unique" ON "organization_admin_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "organization_admin_invitations_org_status_created_idx" ON "organization_admin_invitations" USING btree ("organization_id","status","created_at");--> statement-breakpoint
CREATE INDEX "organization_admin_invitations_target_status_expiry_idx" ON "organization_admin_invitations" USING btree ("target_user_id","status","expires_at");--> statement-breakpoint
CREATE INDEX "organization_admin_invitations_inviter_idx" ON "organization_admin_invitations" USING btree ("invited_by_user_id");

REVOKE ALL PRIVILEGES ON TABLE public.organization_admin_invitations
FROM PUBLIC, anon, authenticated;
