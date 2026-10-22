CREATE SCHEMA IF NOT EXISTS identity;
--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE identity.account_status AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETION_PENDING', 'DEACTIVATED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS identity.users (
  id uuid PRIMARY KEY,
  normalized_email text NOT NULL,
  email_verified_at timestamptz,
  account_status identity.account_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_normalized_email_unique UNIQUE (normalized_email),
  CONSTRAINT users_normalized_email_is_not_empty CHECK (length(normalized_email) > 0),
  CONSTRAINT users_normalized_email_is_lowercase CHECK (normalized_email = lower(normalized_email))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS identity.auth_identities (
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  provider_user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_identities_provider_provider_user_id_pk PRIMARY KEY (provider, provider_user_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS auth_identities_user_id_index ON identity.auth_identities USING btree (user_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS identity.profiles (
  id uuid PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_path text,
  bio text NOT NULL DEFAULT '',
  city_id text REFERENCES public.cities(id),
  interests text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_display_name_length CHECK (char_length(display_name) BETWEEN 1 AND 80),
  CONSTRAINT profiles_bio_length CHECK (char_length(bio) <= 500)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS profiles_city_id_idx ON identity.profiles USING btree (city_id);
--> statement-breakpoint
ALTER TABLE identity.users ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE identity.auth_identities ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE identity.profiles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-photos', 'profile-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Authenticated users upload their profile photo'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Authenticated users upload their profile photo" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'profile-photos'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
      )
    $policy$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Authenticated users update their profile photo'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Authenticated users update their profile photo" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'profile-photos'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
      )
      WITH CHECK (
        bucket_id = 'profile-photos'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
      )
    $policy$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Authenticated users delete their profile photo'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Authenticated users delete their profile photo" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'profile-photos'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
      )
    $policy$;
  END IF;
END $$;
