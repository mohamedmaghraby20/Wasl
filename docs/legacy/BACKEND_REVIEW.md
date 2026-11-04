# Backend NestJS Best-Practices Review

Scope: static review of `server/src`, `server/test`, database migrations, and backend package configuration against the ten categories in the NestJS best-practices skill. This is a prioritized engineering review, not a penetration test or production deployment audit. No source code was changed and tests were not run. The local skill provided its category summary but did not include the individual rule documents; its linked reference site was reachable only as a title page, so findings are mapped to the listed skill principles.

## Executive summary

The backend has a solid foundation: feature-oriented Nest modules, constructor injection, a global validation pipe and exception filter, bearer-token authentication and explicit authorization guards, environment parsing, rate limiting, database migrations, meaningful transaction usage, health/readiness endpoints, graceful shutdown hooks, and a sizeable unit/integration test suite.

Highest-value follow-up is to harden externally controlled API inputs consistently (including query/path parameters), remove nullable database/runtime dependencies from normal application operation, and make integration effects resilient to retries and concurrent workers. Improve API response contracts, error observability, and test harness consistency after those items.

## Findings by skill category

### 1. Architecture — strong foundation; verify module boundaries (low/medium)

- **Positive:** `server/src/modules/*` is organized by feature, services encapsulate most domain/database work, and modules export only selected providers. Existing modules avoid `forwardRef`, so there is no evident module cycle from this inspection.
- **Watch:** `DiscussionsService` makes `ModerationService` optional (`@Optional()`), and `ParticipationService` similarly has optional messaging/notification dependencies. This allows application startup with silently reduced behavior if imports/providers change. Review whether these are deliberate deployment modes; otherwise make dependencies explicit and required.
- **Plan:** map module imports/exports and service responsibilities; replace accidental optional integration behavior with required DI or an explicit no-op/feature boundary. Avoid introducing repositories or events merely for abstraction; current feature services and Drizzle usage are direct and understandable.

### 2. Dependency injection — good patterns; optional DB weakening startup guarantees (medium)

- **Positive:** services use constructor injection and interface-like integrations use tokens (`DATABASE`, Supabase clients). Lifetimes are predominantly singleton, which suits current providers.
- **Finding:** `DatabaseConnection` returns `Database | undefined`, and many services repeat a late `database()` guard. This intentionally permits app startup without a database, but also delays configuration failures until affected requests; production env validation requires `DATABASE_URL` while non-production behavior remains permissive. Health readiness catches some of this, but application-level dependency contracts remain weaker than necessary.
- **Plan:** explicitly document/encode which modes may run without Postgres. Consider a required database provider in production and a deliberate optional/test provider only where needed; preserve health checks and avoid a broad refactor of existing unit-test injection.

### 3. Error handling — centralized response; improve diagnostics and safe boundaries (medium)

- **Positive:** `HttpExceptionFilter` normalizes Nest HTTP errors and masks unknown errors as a generic 500. Domain failures generally use Nest HTTP exceptions.
- **Finding:** unknown exceptions are not logged by the filter, reducing production diagnosis. A few invariant helpers such as `getAuthenticatedUser()` throw plain `Error`, which becomes a generic 500 rather than an explicit internal/authentication boundary. `server/src/db/migrate.ts` and `seed.ts` throw at CLI boundaries; that is appropriate but migration pool cleanup is not protected with `finally` if migration fails.
- **Plan:** add structured error logging with request correlation while keeping response details sanitized; use an explicit Nest exception for violated request invariants; ensure CLI resources close in `finally`. Do not expose provider/database error details to clients.

### 4. Security — strong base; close input-validation and deployment gaps (high)

- **Positive:** `main.ts` enables Helmet, restrictive configured CORS, global `ValidationPipe` (`whitelist`, `transform`, `forbidNonWhitelisted`), and throttling. Auth uses Supabase `getUser` to verify the bearer token; platform-admin routes require an allowlisted Wasl identity and `aal2`. DTOs use `class-validator`; security/integration tests are present.
- **Finding:** query input coverage is inconsistent. Discovery uses `Record<string, string | undefined>` and manual validation; discussion pagination passes raw strings to service parsers. This provides some bounds but bypasses the common DTO/pipe contract and makes future parameters easy to omit. Several route IDs (notably discussion resource/topic/post IDs and messaging community/event IDs) are raw strings; some intentionally accept slugs as well as IDs, so validation should explicitly model that rather than blindly applying UUID pipes.
- **Finding:** CORS and port in `main.ts` are read directly from `process.env`, despite validated configuration in `ConfigModule`; the `Number(PORT)` conversion can diverge from its validated value if runtime setup changes. The global throttler is one generic per-client policy; verify proxy/IP handling and tune sensitive auth, reporting, and write routes for deployment traffic.
- **Plan:** introduce validated query DTOs (including transformed numeric pagination, enums, and dates) and explicit path parsers for UUID-or-slug identifiers. Read runtime settings from validated `ConfigService`. Verify reverse-proxy trust, rate-limit identity, and route-specific limits in deployed topology. Add negative tests for malformed/oversized inputs and auth boundaries.

### 5. Performance — bounded lists; review query scaling and background scans (medium)

- **Positive:** most result lists are bounded; discovery paginates with a maximum page size and count/data queries run concurrently. Transactions lock relevant resource/membership rows in participation flows.
- **Finding:** `DiscussionsService.postPage()` runs an unbounded count and uses offset pagination; deep offsets and exact counts may become costly. `MessagingService.reconcilePendingMemberships()` selects all users with sync rows, then processes users and memberships sequentially; work grows with stored history and can monopolize a worker cycle. Discovery `ilike '%keyword%'` requires suitable indexing to scale.
- **Plan:** measure representative query plans and table growth first. Add/verify indexes for actual filter/order/join patterns; consider cursor pagination or bounded worker batches and a durable checkpoint/claim strategy. Use trigram/full-text search only if measurement and product semantics justify it. Preserve existing query bounds and do not add speculative caching.

### 6. Testing — broad suite; improve integration and concurrency confidence (medium)

- **Positive:** unit specs exist across core services/guards; `server/test` contains PostgreSQL/provider integration suites for privacy, messaging, participation, notifications, moderation, and organizations. Focused Nest-adjacent behavior is exercised.
- **Finding:** a number of service tests rely on hand-built, loosely typed Drizzle query mocks (some explicitly disable `any` checks). Such mocks can miss real query behavior, transaction locking, and schema constraints. Worker scheduling/retry and failure behavior appear less directly covered than domain services. Some integration tests likely require external services/database, so the CI environment contract should be explicit.
- **Plan:** retain fast unit tests, add focused PostgreSQL tests for transaction/isolation and race-sensitive cases, and deterministic worker tests using fake timers and provider failure injection. Type query fakes where practical; avoid broad test rewrites. Document required test services and make integration execution separable from unit tests.

### 7. Database & ORM — migrations and transactions present; integration atomicity needs attention (high)

- **Positive:** Drizzle migrations are present through `0022`; services use transactions for multi-row state transitions and `FOR UPDATE` in capacity/participation paths. Database pool shutdown is implemented. Seed has an explicit production guard.
- **Finding:** messaging workflows span Postgres and Stream. For example, channel/member operations persist desired state and reconcile asynchronously, which is a useful outbox-like pattern, but there are paths where provider calls and DB writes are coordinated with compensating updates. Review all such flows for concurrency/idempotency, not only exception handling. Notification delivery calls Resend from inside a DB transaction while holding a row lock; slow provider latency can hold locks, and a successful provider send followed by transaction failure may cause a duplicate email retry. `MessagingSyncWorker` has only a process-local timer, and reconciliation reads all sync users; multiple server replicas may duplicate work unless DB claims/locking and provider idempotency make it safe.
- **Plan:** prioritize idempotent, durable integration workflows: claim/lease queue rows or use queue visibility/locking, keep external network calls outside long DB transactions where possible, persist attempt state with safe recovery, and make duplicate side effects detectable. Add concurrency tests. Audit indexes/constraints against schema and migrations before adding any migration; never edit already-applied migration files.

### 8. API Design — DTOs and OpenAPI exist; response DTOs are documentation-only (medium)

- **Positive:** endpoints document response types with Swagger and input DTOs cover many writes. OpenAPI generation is scripted and generated output is available.
- **Finding:** response DTOs generally declare Swagger fields but do not use response serialization/validation (`ClassSerializerInterceptor`/`class-transformer` exposure rules); currently they act as documentation shapes, not enforced projections. Query DTO use is uneven. Several controllers use `@ApiOkResponse` for create operations, so status semantics should be checked against the actual contract (not assumed incorrect without endpoint expectations). `DiscoveryController` combines controller and database query logic, whereas most feature controllers delegate to services.
- **Plan:** make response shaping explicit where sensitive fields could leak (prefer service projections or serialization tests; do not rely on DTO declarations alone). Align query DTOs and OpenAPI behavior. Review status codes and API versioning policy as a product contract decision. Consider moving discovery query logic into a feature service when it improves testability without expanding scope.

### 9. Microservices / integrations — adapters and queues exist; resilience is uneven (medium/high)

- **Positive:** Stream and Resend are behind adapters; email uses a persistent PGMQ queue, and messaging has persisted desired/provider membership state with retry reconciliation.
- **Finding:** email and messaging workers use `setInterval` per process; timers are shut down, but multi-replica ownership, overlap, batch limits, retry exhaustion/dead-letter visibility, and operational metrics need explicit verification. Worker logs often omit the caught exception (`NotificationEmailWorker` catches without including it), which obscures root cause. The email worker also calls the external provider while inside a transaction (see database finding).
- **Plan:** define operational SLOs and retry/dead-letter policy; add bounded, concurrency-safe claiming and metrics/alerts; log sanitized provider error class/request context; test multiple workers and crash recovery. A dedicated queue framework is not automatically required—the existing PGMQ design can be hardened.

### 10. DevOps & deployment — useful config and shutdown setup; startup/config parity to resolve (medium)

- **Positive:** Zod validates environment variables, production checks require database/email/origin, health and readiness endpoints exist, `enableShutdownHooks()` is enabled, and pool/workers clean up on shutdown. Package scripts cover build, typecheck, lint, tests, migrations, and OpenAPI.
- **Finding:** `main.ts` reads `CLIENT_ORIGIN`/`PORT` directly from `process.env` instead of consuming the validated config object. Production validation does not appear to require Supabase auth credentials, and service-dependent settings are optional; this may be an intentional partially enabled deployment but should be explicit. `DatabaseConnection` uses a fixed pool size of 10 and migration pool shutdown is not in `finally`. Worker error logs are sparse.
- **Plan:** establish a deployment-mode matrix and validate all required integrations for each mode at startup; use `ConfigService` consistently; set pool limits/timeouts from deployment capacity evidence; ensure startup/migration failures close resources; add structured logging and deploy-time readiness checks.

## Suggested fix plan

### Phase 1 — close request-boundary gaps (highest priority)

1. Inventory every controller parameter and classify it as body/query/path; identify raw strings and manual parsers.
2. Add validated DTOs for discovery and discussion pagination/filtering (`@Type`, `@IsInt`, bounds, enums, date formats) and use them in controllers. Preserve slug-capable routes with an explicit UUID-or-slug pipe/parser.
3. Read port and CORS origin from validated `ConfigService`; establish proxy-aware throttling and tighter write/auth route policies where appropriate.
4. Add focused controller tests for invalid query/path values, unknown fields, boundary pagination, and auth failures.

**Exit check:** typecheck/lint pass; malformed inputs consistently return 400; documented OpenAPI query contracts match runtime validation.

### Phase 2 — make integrations safe under retries and replicas

1. Trace Stream and Resend workflows from domain transaction through provider call, persisted state, retry, and shutdown.
2. Remove slow provider calls from long-held transactions where feasible; add idempotency/claiming and durable retry/dead-letter visibility.
3. Batch and coordinate background reconciliation across replicas; instrument attempt age, failures, queue depth, and retry outcome.
4. Add PostgreSQL/provider tests for duplicate delivery, crash between provider success and DB commit, concurrent claims, and authorization revocation.

**Exit check:** integration side effects are safe to retry and no two workers can corrupt queue/provider state; failures are observable without leaking secrets.

### Phase 3 — tighten runtime contracts and diagnostics

1. Decide which non-production modes may omit Postgres, Supabase auth, Stream, or email; enforce required dependencies at startup for each mode.
2. Improve sanitized structured error logging and request correlation; convert plain-error request invariants to intentional exception behavior.
3. Ensure migration CLI cleanup in `finally`; verify shutdown drains/stops workers predictably.
4. Document deployment environment variables, proxy trust, readiness/liveness behavior, and test service requirements.

**Exit check:** missing required production configuration fails fast; health/readiness behavior and shutdown are covered by tests.

### Phase 4 — scale and contract assurance

1. Capture `EXPLAIN (ANALYZE, BUFFERS)` on representative discovery, discussion, messaging, and notification queries with realistic data.
2. Add only evidence-backed indexes/migrations; evaluate discussion keyset pagination and bounded reconciliation batches.
3. Add response-shape tests and decide where serialization/projection enforcement is required.
4. Keep unit tests fast and mocks typed; run PostgreSQL/provider suites in explicit CI jobs.

**Exit check:** baseline query latency and worker throughput are measured; migrations are reversible/validated as appropriate; response contracts have regression coverage.

## Verification status

- Static source/config/test inventory completed.
- No code changes made.
- Tests, lint, typecheck, and build were not run because this request was an analysis/report, not a remediation phase.
