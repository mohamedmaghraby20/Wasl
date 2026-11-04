# Phase 1 local setup

## Required services

Committed `client/.env.example` and `server/.env.example` are the safe remote-repository templates. Ignored `client/.env` and `server/.env` hold local development settings; ignored `.env.production` files hold deployment-specific values. Client variables are limited to the Supabase URL and publishable key. Database URLs, Supabase service-role keys, Stream and Resend credentials are server-only.

The production token files are copied into `client/src/styles/`; the React bundle imports them locally and does not depend on `docs/design` at build or runtime. The static preview files stay only in `docs/design`.

The server is configured to connect to Supabase PostgreSQL through the pooled `DATABASE_URL`. Product endpoints and Supabase Auth token verification are later tasks; no authenticated product route exists in this phase. Keep development and production in separate Supabase projects. Use the publishable key only in the client; keep the service-role key and database URL server-side. When the development project is connected, run `corepack pnpm db:generate`, review the generated migration, then `corepack pnpm db:migrate`. Tables created in Supabase's exposed `public` schema must have RLS enabled before Data API grants are considered. Configure Auth providers, Storage buckets, bucket visibility, and upload policies when their consuming tasks define the actual flows; do not expose service credentials to the browser.

## Seed data

`corepack pnpm db:seed` idempotently upserts all 81 provinces and 3 discovery categories. The connected Wasl Supabase project is the development project, as clarified by the owner; older references in this record that call it production are stale. This seed does not create users, Communities, or Events because those require later schemas and an explicit local owner identity.
