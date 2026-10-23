CREATE TABLE "discussion_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"depth" integer DEFAULT 0 NOT NULL,
	"parent_id" uuid,
	"parent_depth" integer,
	"deleted_at" timestamp with time zone,
	"deleted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discussion_posts_parent_target_unique" UNIQUE("id","depth","thread_id"),
	CONSTRAINT "discussion_posts_body_length" CHECK (char_length("discussion_posts"."body") between 1 and 5000),
	CONSTRAINT "discussion_posts_reply_depth_check" CHECK (("discussion_posts"."depth" = 0 and "discussion_posts"."parent_id" is null and "discussion_posts"."parent_depth" is null) or ("discussion_posts"."depth" = 1 and "discussion_posts"."parent_id" is not null and "discussion_posts"."parent_depth" = 0)),
	CONSTRAINT "discussion_posts_deletion_check" CHECK (("discussion_posts"."deleted_at" is null and "discussion_posts"."deleted_by_user_id" is null) or ("discussion_posts"."deleted_at" is not null and "discussion_posts"."deleted_by_user_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "discussion_posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "discussion_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text,
	"community_id" text,
	"author_user_id" uuid,
	"title" text,
	"body" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discussion_threads_parent_check" CHECK (("discussion_threads"."event_id" is not null and "discussion_threads"."community_id" is null and "discussion_threads"."author_user_id" is null and "discussion_threads"."title" is null and "discussion_threads"."body" is null) or ("discussion_threads"."event_id" is null and "discussion_threads"."community_id" is not null and "discussion_threads"."author_user_id" is not null and "discussion_threads"."title" is not null and "discussion_threads"."body" is not null)),
	CONSTRAINT "discussion_threads_title_length" CHECK ("discussion_threads"."title" is null or char_length("discussion_threads"."title") between 1 and 160),
	CONSTRAINT "discussion_threads_body_length" CHECK ("discussion_threads"."body" is null or char_length("discussion_threads"."body") between 1 and 5000)
);
--> statement-breakpoint
ALTER TABLE "discussion_threads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_thread_id_discussion_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."discussion_threads"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_root_parent_fk" FOREIGN KEY ("parent_id","parent_depth","thread_id") REFERENCES "public"."discussion_posts"("id","depth","thread_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discussion_posts_thread_created_idx" ON "discussion_posts" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "discussion_posts_parent_created_idx" ON "discussion_posts" USING btree ("parent_id","created_at");--> statement-breakpoint
CREATE INDEX "discussion_posts_author_idx" ON "discussion_posts" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX "discussion_posts_deleted_by_idx" ON "discussion_posts" USING btree ("deleted_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "discussion_threads_event_unique" ON "discussion_threads" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "discussion_threads_community_created_idx" ON "discussion_threads" USING btree ("community_id","created_at");--> statement-breakpoint
CREATE INDEX "discussion_threads_author_idx" ON "discussion_threads" USING btree ("author_user_id");
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE
  public.discussion_posts,
  public.discussion_threads
FROM PUBLIC, anon, authenticated;
