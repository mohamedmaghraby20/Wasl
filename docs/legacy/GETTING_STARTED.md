# Local development

## Requirements

- Node.js 24.19.0 (see `.node-version`)
- Corepack with pnpm 10.15.1
- A Supabase project when database-backed work begins

## Install and run

```sh
corepack pnpm install
corepack pnpm dev
```

The web app runs at `http://localhost:5173` and the API at `http://localhost:3000`.

## Environment files

`client/.env.example` and `server/.env.example` are committed templates. Local `client/.env` and `server/.env` are ignored by Git. The client may contain only the Supabase URL and publishable key. Keep the database URL, service-role key, Stream secret, and Resend key in the server environment.

Vite loads `client/.env.production` for production builds. Production hosting should normally receive these values through its environment settings. For a local production-mode server process, load `server/.env.production` with Node's `--env-file` option. Do not commit real production credentials.

The scaffold currently allows a database-free API startup so health checks work before Supabase setup. Database migrations and seeds require `DATABASE_URL`; development seed data is disabled when `NODE_ENV=production`.

## API and database commands

```sh
corepack pnpm api:generate
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:seed
```

Review generated SQL in `server/drizzle/` before applying it to a shared database. The development seed creates reference cities and categories plus clearly labelled sample users, Communities, Events, memberships and registrations; it refuses to run when `NODE_ENV=production`. Never run it against production.

## Quality commands

```sh
corepack pnpm lint
corepack pnpm format:check
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
corepack pnpm storybook:build
```

Install the Playwright browser once on a new machine with `corepack pnpm --filter @wasl/web exec playwright install chromium`.
