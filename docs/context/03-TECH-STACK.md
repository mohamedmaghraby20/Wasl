# Wasl — Approved Technology Context (Batch 01)
Source: [Technology Selection](https://app.notion.com/p/3f0578fa2944812e95e4cf7822b1d293).

**Document role:** Approved baseline technologies. It is a plan, not evidence of which dependencies are already installed. Inspect actual `package.json` files before changes.

## Monorepo and frontend
- **pnpm workspaces**; client/web for React, server as a separate API, packages for reusable boundaries. No Turborepo initially.
- **React 19 + TypeScript + Vite** client-side SPA. React Router **Data Mode**. No Next.js, SSR, or React Server Components.
- **Tailwind CSS + shadcn/ui + Lucide**, Sonner toasts, React Hook Form for forms.
- **TanStack Query** owns server data/caching; **Zustand** only for genuinely global client-only state; local React state for local UI; URL/search params for navigation/filter state.
- **Zod** for validation.
- **i18next/react-i18next**, Arabic/English and RTL-aware layout.
- SPA SEO through Unhead metadata, JSON-LD, canonical URLs, sitemap/robots, semantic HTML and supported social metadata.
- Testing: Vitest, React Testing Library, MSW, Playwright and Storybook; quality tools ESLint/Prettier.

## Backend and contracts
- **Node.js 24 LTS + TypeScript + NestJS**, Fastify adapter, REST/JSON, one modular monolith.
- Input validation: Zod through the planned Nest Standard Schema integration.
- **NestJS OpenAPI/Swagger** produces the API contract; **Orval** generates typed fetch/TanStack Query clients and MSW mocks from it. Generated code should not be manually edited.
- PostgreSQL using **Drizzle ORM + node-postgres (pg)**, Drizzle Kit SQL migrations. Transactions/locking for waitlist, capacity, ownership and other critical changes.

## Managed external providers
- **Supabase:** hosts PostgreSQL; Supabase Auth for identity and MFA for privileged accounts; Storage for media, signed/private uploads and CDN; Queues (pgmq) and Cron as needed.
- **Stream Chat:** initial real-time messaging provider, isolated behind Wasl Messaging integration and governed by Wasl permission rules.
- **Resend:** asynchronous transactional email.
- **Render:** web static site and NestJS backend service/container, with regions chosen to minimize database latency.
- **GitHub Actions:** test, lint, typecheck, build and security checks.

## Operations, security and future scale
- Rate limiting: @nestjs/throttler; structured logging: Pino; health: @nestjs/terminus; error tracking: Sentry.
- Server-side auth/validation, strict CORS, security headers, secret handling and privileged-account MFA.
- PostgreSQL search and indexes first; pg_trgm where useful.
- Do NOT add Redis, Kafka, Kubernetes, Elasticsearch, microservices, a custom load balancer, or custom Socket.IO chat without a measured/approved need.
- Mobile is a **future client** of the shared API; no mobile application should be scaffolded yet.

## What a beginner should remember
**Framework** (NestJS/React), **runtime** (Node.js), **HTTP engine** (Fastify), **database engine** (PostgreSQL), **managed host** (Supabase/Render), **code generator** (Orval) solve different problems. Not every dependency belongs in the initial setup task.

## For Codex
This document is reference context, not a directive to install every listed tool immediately. Only implement the dependencies needed for the approved current microtask. Read actual repository state first.
