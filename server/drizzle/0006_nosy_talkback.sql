CREATE TYPE "public"."community_member_status" AS ENUM('PENDING', 'WAITLISTED', 'ACTIVE', 'REJECTED', 'LEFT', 'REMOVED');--> statement-breakpoint
CREATE TYPE "public"."event_registration_status" AS ENUM('PENDING', 'WAITLISTED', 'ACCEPTED', 'REJECTED', 'CANCELLED_BY_USER', 'REMOVED_BY_ORGANIZER', 'ATTENDED', 'NO_SHOW');--> statement-breakpoint
CREATE TABLE "community_membership_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"membership_id" uuid NOT NULL,
	"from_status" "community_member_status",
	"to_status" "community_member_status" NOT NULL,
	"actor_user_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_membership_transitions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "community_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "community_member_status" NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_memberships_community_user_unique" UNIQUE("community_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "community_memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "event_registration_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"from_status" "event_registration_status",
	"to_status" "event_registration_status" NOT NULL,
	"actor_user_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_registration_transitions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "event_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "event_registration_status" NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_registrations_event_user_unique" UNIQUE("event_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "event_registrations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "community_membership_transitions" ADD CONSTRAINT "community_membership_transitions_membership_id_community_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."community_memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_membership_transitions" ADD CONSTRAINT "community_membership_transitions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registration_transitions" ADD CONSTRAINT "event_registration_transitions_registration_id_event_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."event_registrations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registration_transitions" ADD CONSTRAINT "event_registration_transitions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "community_membership_transitions_history_idx" ON "community_membership_transitions" USING btree ("membership_id","created_at");--> statement-breakpoint
CREATE INDEX "community_memberships_queue_idx" ON "community_memberships" USING btree ("community_id","status","requested_at");--> statement-breakpoint
CREATE INDEX "community_memberships_user_status_idx" ON "community_memberships" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "event_registration_transitions_history_idx" ON "event_registration_transitions" USING btree ("registration_id","created_at");--> statement-breakpoint
CREATE INDEX "event_registrations_queue_idx" ON "event_registrations" USING btree ("event_id","status","requested_at");--> statement-breakpoint
CREATE INDEX "event_registrations_user_status_idx" ON "event_registrations" USING btree ("user_id","status");