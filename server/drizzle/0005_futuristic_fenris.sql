DROP INDEX IF EXISTS "identity"."auth_identities_user_id_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_identities_user_id_index" ON "identity"."auth_identities" USING btree ("user_id");
