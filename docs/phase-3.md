# Phase 3: Accounts, profiles and first content creation

## Implemented

- Connected Supabase Auth token verification to NestJS and mapped provider identities to stable Wasl user IDs. Protected requests provision a private account and profile; suspended accounts are denied.
- Added separate private account and profile tables under `identity`, current-user and public-profile APIs, profile editing, and bilingual sign-up/profile pages. Public profile responses omit email and account status.
- Configured the `profile-photos` Supabase Storage bucket with owner-scoped paths and image restrictions. The browser uploads directly; the server verifies ownership, file signature, and size before saving the path.
- Added authenticated Community creation/edit/archive and Event creation/edit/cancel APIs. Server-side checks enforce ownership and managed-community hosting; archive/cancel preserve resource history.
- Added create entrypoints, profile and resource forms, eligible Community host selection, public identity links, organizer controls, Arabic/English copy, and return-to-auth routing.
- Regenerated OpenAPI and Orval clients from the Nest API. Added service, auth, profile image, and sign-up regression tests. Updated the mobile RTL browser check to open the collapsed navigation before selecting language.

## Database

- Added Drizzle schema and migrations for private account identities and public-profile fields in `identity.profiles`.
- Applied the migrations to the configured Wasl Supabase database. The final `db:migrate` completed successfully; `db:generate` reports no schema changes. The profile table is empty until authenticated users make a protected request, when their profile is provisioned.
- Kept profile storage private to the server database role; no public client access to the `identity` schema was introduced.
- The Supabase Security Advisor still reports leaked-password protection disabled. That Auth setting is managed outside SQL migrations; the connected Supabase tools here do not expose an Auth-settings write operation, and no Management API token is configured locally. Enable it in the project’s Auth password-security settings before production.

## Verification

- `corepack pnpm test:phase3:integration` — passed against the configured Wasl Supabase project and the built local Nest API. It uses a disposable Auth user to verify valid sign-in, rejection of anonymous/forged tokens, stable separate Wasl identity, public-profile field privacy, profile update, real Storage upload and removal, Community create/update/archive, independent unlisted Event create/update/cancel, Community-hosted Event creation, and unlisted exclusion from discovery. The script removes its temporary Auth user, identity, media, Communities, and Events; follow-up SQL confirmed zero leftovers.
- `corepack pnpm typecheck` — passed.
- `corepack pnpm lint` — passed.
- `corepack pnpm test` — passed: 55 tests (34 server, 21 client); shared has no test files. The discovery test emits the existing jsdom `window.scrollTo` warning.
- `corepack pnpm build` — passed, including OpenAPI and Orval generation. Vite reports the existing main bundle size warning (599.33 kB minified).
- `corepack pnpm --filter @wasl/server db:generate` — passed; no schema changes.
- `corepack pnpm --filter @wasl/server db:migrate` — passed against the configured Supabase database.
- `corepack pnpm --filter @wasl/web test:e2e` — passed: 2 Chromium checks, including 375px mobile layout and Arabic RTL navigation.
- Reviewed a 1440px screenshot of the sign-up screen; the two-column form, labels and actions render correctly.

## Follow-up

- Phase 4 participation work is complete; see [phase-4.md](phase-4.md).
- The production build still warns that the main JavaScript chunk exceeds 500 kB. This did not fail the build and is a later performance task.
