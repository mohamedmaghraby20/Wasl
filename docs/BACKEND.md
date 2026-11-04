# Backend Development Rules

Scope: `server/`. Follow root `AGENTS.md`, the applicable task requirements, and existing repository conventions. Keep this document backend-specific.

## 1. Stack

- Use Node.js 24, TypeScript, NestJS 11, and Fastify through `@nestjs/platform-fastify`.
- Use PostgreSQL hosted on Supabase; access it with Drizzle ORM and version schema changes with Drizzle Kit migrations.
- Use Supabase Auth for authentication; enforce WASL authorization in NestJS.
- Use `@nestjs/swagger` for OpenAPI, `@nestjs/config` for configuration, `@nestjs/throttler` for rate limiting, and `@nestjs/terminus` for health checks.
- Use Zod and the existing `class-validator` / `class-transformer` conventions where they are already established; do not introduce redundant validation layers.
- Keep Stream Chat in the messaging integration. Use Supabase Storage for media and Resend for transactional email when those features are implemented.
- Use pnpm workspaces and existing installed dependencies; do not introduce substitutes without a concrete need.

## 2. Modules and Architecture

- Keep one NestJS modular monolith; organize code by business feature, not artificial microservices.
- Keep controllers thin; put business workflows in application services and persistence in module-owned data-access code.
- Give each module ownership of its rules, tables, and writes. Access another module through its public application interface, not its repository.
- Keep domain decisions independent of HTTP handlers, database details, and external provider SDKs.
- Introduce interfaces/adapters only for genuine boundaries such as authentication, chat, storage, and email; avoid boilerplate abstractions.
- Use clear, descriptive names and small cohesive methods; follow root documentation rules.

## 3. APIs and Validation

- Expose consistent REST endpoints and documented OpenAPI request/response contracts.
- Validate inputs at the API boundary and return a consistent, safe error shape.
- Reuse `shared/` contracts where appropriate; do not leak database models or sensitive fields through public DTOs.
- Paginate potentially large lists and use stable filtering/sorting conventions.
- Never hand-edit generated frontend API clients.

## 4. Authentication and Authorization

- Verify Supabase authentication tokens on the server; never trust client-provided user IDs or roles.
- Authenticate and authorize every protected operation on the server.
- Enforce resource-level authorization and deny access by default.
- Never expose private or sensitive data through public APIs.
- Follow `docs/launch-decisions.md` for approved legal and privacy requirements.

## 5. Database and Business Integrity

- Use Drizzle ORM and Drizzle Kit for database access and migrations.
- Review generated SQL before applying migrations.
- Enforce data integrity using appropriate PostgreSQL constraints and transactions.
- Handle concurrent operations safely; use locking or isolation mechanisms when required.
- Keep schema changes backward-compatible when practical.
- Use indexes and query plans to optimize demonstrated performance issues.
- Avoid unnecessary caching, database abstractions, or infrastructure unless asked to do or see a chance for implementing.

## 6. External Services & Reliability

- Keep secrets server-side; validate environment configuration and never log sensitive credentials.
- Isolate external providers behind clear integration boundaries.
- Keep business identifiers and authorization independent of provider-specific implementations.
- Handle external service failures with appropriate timeouts, retries, and error handling.
- Decouple critical database transactions from unreliable external operations when necessary.
- Use security headers, rate limiting, structured logging, consistent error responses, and health checks.

## 7. Testing & Verification

- Use Vitest and `@nestjs/testing` for backend unit and integration tests.
- Test validation, authentication, authorization, error handling, and edge cases.
- Test concurrency, transactions, and idempotency where applicable.
- Test external service failures and recovery behavior.
- Use isolated PostgreSQL databases for integration tests involving real database behavior.
- Run relevant tests, lint, type checks, and builds; report actual results.
- Never execute destructive migrations or modify production data without explicit approval.

## 8. Code Quality

- Keep changes surgical; avoid unrelated refactors, excessive helper layers, and premature optimization.
- Prefer explicit control flow and meaningful errors over clever or silent behavior.

## 9. Agent Skills

| Skill | Use for |
| --- | --- |
| `nestjs-best-practices` | NestJS modules, dependency injection, controllers, services, security, and API patterns. |
| `supabase-postgres-best-practices` | PostgreSQL schema, indexes, SQL performance, transactions, concurrency, and migrations. |
| `supabase` | Supabase Auth, Storage, database platform configuration, and provider integration. |
| `domain-modeling` | Modeling participation states, permissions, ownership, and business invariants. |
| `diagnosing-bugs` | Investigating backend errors, failing tests, and unexpected behavior. |
| `tdd` | Implementing testable backend behaviors and regression tests. |

## 10. Resources

<!-- Add approved backend references, documentation links, patterns, and examples here. -->
