CREATE TABLE "communities" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"city_id" text NOT NULL,
	"owner_type" text NOT NULL,
	"owner_id" text NOT NULL,
	"host_name" text NOT NULL,
	"admission_mode" text NOT NULL,
	"capacity" integer,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "communities_slug_unique" UNIQUE("slug"),
	CONSTRAINT "communities_owner_type_check" CHECK ("communities"."owner_type" in ('user', 'organization')),
	CONSTRAINT "communities_admission_mode_check" CHECK ("communities"."admission_mode" in ('open', 'approval', 'automatic')),
	CONSTRAINT "communities_capacity_check" CHECK ("communities"."capacity" is null or "communities"."capacity" > 0)
);
--> statement-breakpoint
CREATE TABLE "community_categories" (
	"community_id" text NOT NULL,
	"category_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_categories" (
	"event_id" text NOT NULL,
	"category_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"host_type" text NOT NULL,
	"host_id" text NOT NULL,
	"host_name" text NOT NULL,
	"community_id" text,
	"city_id" text,
	"online" boolean DEFAULT false NOT NULL,
	"location_name" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"admission_mode" text NOT NULL,
	"capacity" integer,
	"cancelled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug"),
	CONSTRAINT "events_visibility_check" CHECK ("events"."visibility" in ('public', 'unlisted')),
	CONSTRAINT "events_host_type_check" CHECK ("events"."host_type" in ('user', 'organization', 'community')),
	CONSTRAINT "events_location_check" CHECK ("events"."online" = true or ("events"."city_id" is not null and "events"."location_name" is not null)),
	CONSTRAINT "events_dates_check" CHECK ("events"."ends_at" is null or "events"."ends_at" >= "events"."starts_at"),
	CONSTRAINT "events_admission_mode_check" CHECK ("events"."admission_mode" in ('instant', 'approval', 'automatic')),
	CONSTRAINT "events_capacity_check" CHECK ("events"."capacity" is null or "events"."capacity" > 0)
);
--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_categories" ADD CONSTRAINT "community_categories_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_categories" ADD CONSTRAINT "community_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_categories" ADD CONSTRAINT "event_categories_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_categories" ADD CONSTRAINT "event_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "communities_public_created_idx" ON "communities" USING btree ("archived","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "community_categories_pk" ON "community_categories" USING btree ("community_id","category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_categories_pk" ON "event_categories" USING btree ("event_id","category_id");--> statement-breakpoint
CREATE INDEX "events_public_start_idx" ON "events" USING btree ("visibility","cancelled","starts_at");
--> statement-breakpoint
ALTER TABLE "communities" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "community_categories" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "event_categories" ENABLE ROW LEVEL SECURITY;
