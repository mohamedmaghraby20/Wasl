CREATE TYPE "public"."organization_verification_status" AS ENUM('PENDING', 'VERIFIED', 'REJECTED');--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "description" text NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "city_id" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "location_name" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "website_url" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "social_url" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "logo_path" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "verification_status" "organization_verification_status" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organizations_city_id_idx" ON "organizations" USING btree ("city_id");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_name_length" CHECK (char_length("organizations"."name") between 1 and 160);--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_description_length" CHECK (char_length("organizations"."description") <= 5000);--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_type_length" CHECK (char_length("organizations"."type") between 1 and 80);--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_location_name_length" CHECK ("organizations"."location_name" is null or char_length("organizations"."location_name") <= 160);--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_website_url_length" CHECK ("organizations"."website_url" is null or char_length("organizations"."website_url") <= 2048);--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_social_url_length" CHECK ("organizations"."social_url" is null or char_length("organizations"."social_url") <= 2048);