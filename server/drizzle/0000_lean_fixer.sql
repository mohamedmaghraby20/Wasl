CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name_tr" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" text PRIMARY KEY NOT NULL,
	"name_tr" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_tr_unique" ON "categories" USING btree ("name_tr");--> statement-breakpoint
CREATE UNIQUE INDEX "cities_name_tr_unique" ON "cities" USING btree ("name_tr");
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cities" ENABLE ROW LEVEL SECURITY;
