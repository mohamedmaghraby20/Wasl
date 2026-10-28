# Wasl — Production Handoff

**Updated:** 2026-10-28
**Goal:** put the current app on a public domain. The MVP ships with the sample data that is already in the database.

## Approach

- Use the **current Supabase project** as the production database. One project, no staging copy, no data migration.
- A separate Supabase project is the better setup once real user data exists; it is not required for this MVP.
- Reuse the existing Stream and Resend accounts.
- Host the API and the static client on Render; the repository already contains the blueprint for both.

## 1. Domain

1. Buy a domain (or use the host's free subdomain).
2. Plan two hosts: `app.your-domain.com` for the client and `api.your-domain.com` for the API.
3. Point DNS at the host when it gives you the records. TLS is issued by the host.

## 2. Production env files

Both files are filled with the real values from the local development setup. Only the domain-dependent values are placeholders.

`server/.env.production` — replace:

- `CLIENT_ORIGIN` → `https://app.your-domain.com`
- `RESEND_FROM_EMAIL` → an address on your verified Resend domain (step 4)

`client/.env.production` — replace:

- `VITE_API_URL` → `https://api.your-domain.com`
- `PUBLIC_WEB_ORIGIN` → `https://app.your-domain.com` (the sitemap script reads this from the build environment, not from Vite's env loading, so it must also be set as a host environment variable — the Render blueprint does that)

Everything else (database URL, Supabase keys, Stream keys, Resend key, `STREAM_PERMISSIONS_VERIFIED=true`) is already correct because the MVP uses the same providers.

Both files are git-ignored. On Render, enter the same values in the service environment settings, not in Git.

## 3. Supabase (same project)

1. **Authentication → URL Configuration:** Site URL `https://app.your-domain.com`; redirect URLs `https://app.your-domain.com/**` and `https://app.your-domain.com/password-reset`.
2. **Authentication → Email:** email confirmation on, minimum password length 10. Enable "Prevent use of leaked passwords" if your plan includes it.
3. **Authentication → SMTP:** configure Resend SMTP after the domain is verified (step 4), so confirmation and recovery mail does not use Supabase's rate-limited sender.
4. **Database → Backups:** confirm what your plan provides and note the schedule.
5. Migrations: all 22 are already applied. Running `db:migrate` again is a no-op and safe.
6. Do not run `db:seed` against production; the seed refuses when `NODE_ENV=production`.

## 4. Resend

1. Add your domain (a subdomain such as `mail.your-domain.com` is fine and protects the root domain).
2. Copy the DNS records exactly as shown (SPF/DKIM), add them, and click verify.
3. Add a DMARC record: `_dmarc` TXT with `v=DMARC1; p=none; rua=mailto:dmarc@your-domain.com`.
4. Send a test to a Gmail and an Outlook address and confirm SPF/DKIM/DMARC pass.
5. Set `RESEND_FROM_EMAIL` and the Supabase SMTP sender to the verified address.

Until this is done, `onboarding@resend.dev` only reliably delivers to your own inbox.

## 5. Stream

No change needed: the existing app is used and channel permissions are already verified. Keep `STREAM_PERMISSIONS_VERIFIED=true`; do not disable server-issued tokens or the membership reconciliation worker.

## 6. Deploy

1. Push the repository to GitHub (there is no remote yet).
2. On Render: **New → Blueprint**, pick the repository, and let it read `render.yaml`. It creates `wasl-api` (Node) and `wasl-web` (static).
3. Fill the values marked `sync: false` in the dashboard from your env files.
4. Deploy. The API health check is `/api/v1/health/ready`; it fails when the database is unreachable, which is what you want.
5. Add the custom domains, wait for TLS, then update `CLIENT_ORIGIN`, `VITE_API_URL`, `PUBLIC_WEB_ORIGIN` and `SITEMAP_API_URL` to the real domains and redeploy both services.
6. Keep production auto-deploy **off** and deploy a tested commit manually.

Build and start commands the host must use:

```
build:  corepack pnpm install --frozen-lockfile && corepack pnpm --filter @wasl/shared build && corepack pnpm --filter @wasl/server build
start:  node server/dist/main.js

client build: corepack pnpm install --frozen-lockfile && corepack pnpm --filter @wasl/shared build && corepack pnpm --filter @wasl/web build
client publish: client/dist      (rewrite /* to /index.html for client-side routes)
```

The client build also writes `sitemap.xml` and `robots.txt` into `client/dist`.

## 7. Admin access

1. Sign up on the production domain with the account that should administer the platform and confirm the email.
2. Open `/admin`, enroll TOTP MFA.
3. Find that user's Wasl ID in the database (`identity.users`, by email) and set `PLATFORM_ADMIN_USER_IDS` in the API environment; redeploy.
4. Sign out and in, complete MFA, confirm `/admin` loads and a normal account gets `403`.

## 8. Smoke test after deploy

- [ ] `/`, `/discover`, `/communities`, `/events` load on the real domain
- [ ] A community page and an event page load from a direct URL (hard refresh)
- [ ] Sign up → confirmation email → sign in
- [ ] Join a community, register for an event, see the status in `/activity`
- [ ] Organizer accepts a request; the participant receives the email
- [ ] Open community/event chat and send a message
- [ ] Report something; the moderator queue shows it
- [ ] `/admin` works with MFA and denies a non-admin
- [ ] `https://app.your-domain.com/sitemap.xml` and `/robots.txt` are correct
- [ ] `https://api.your-domain.com/api/v1/health/ready` returns `200`

## 9. Right after launch

1. **Rotate the database password** in Supabase (it was exposed during development), update `DATABASE_URL` locally and on Render, and redeploy.
2. Confirm the backup schedule and take a manual backup before any destructive change.
3. Watch the first day of logs, email delivery and reports.
4. The sample users, communities and events are intentionally public for the MVP. Remove them later with SQL when you start inviting real users; the seed cannot re-run in production mode, which is deliberate.
