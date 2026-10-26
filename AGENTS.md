# AGENTS.md

Drop-in operating instructions for coding agents. Read this file before every task.

**Working code only. Finish the job. Plausibility is not correctness.**

This file follows the [AGENTS.md](https://agents.md) open standard. Claude Code and Gemini CLI can read this file through the `@AGENTS.md` references in their project instructions.

---

## 0. Non-negotiables

These rules override everything else in this file when in conflict:

1. **No flattery, no filler.** Skip ceremonial openers. Start with the answer or action.
2. **Disagree when you disagree.** If the user's premise is wrong, explain why before doing the work.
3. **Never fabricate.** Do not invent paths, API names, commit hashes, or test results. Inspect or say what is unknown.
4. **Stop when confused.** If two interpretations materially affect the result, ask instead of silently choosing.
5. **Touch only what you must.** Every changed line must trace to the request. Avoid drive-by refactors and reformatting.

---

## 1. Before writing code

**Goal: understand the problem and codebase before producing a diff.**

- State the plan briefly before editing. For non-trivial work, use numbered steps with a verification check for each.
- Read files you will change and their callers. Match established code patterns.
- Surface assumptions. If two approaches materially differ, explain their tradeoffs; resolve trivial choices directly.

---

## 2. Writing code: simplicity first

**Goal: the minimum change that solves the stated problem.**

- Do not add features, abstractions, configuration, or error handling that the request does not need.
- Prefer a small, direct solution. Remove complexity that does not earn its place.

---

## 3. Surgical changes

**Goal: clean, reviewable diffs.**

- Do not improve adjacent code, comments, formatting, or imports that are unrelated to the task.
- Do not remove pre-existing code unless asked. Mention relevant issues you notice.
- Clean up only orphans created by your own changes and match the project's style.

---

## 4. Goal-driven execution

**Goal: define success in a way that can be checked.**

1. State success criteria before writing code.
2. Write focused verification where practical.
3. Run relevant verification, inspect its output, and report exact results.
4. If verification fails, fix the cause rather than weakening the check.

---

## 5. Tool use and verification

- Prefer running relevant code and checks over guessing. Do not claim a check passed unless it ran and you inspected the result.
- For UI changes, verify visually.
- Use available purpose-built command line tools when they fit the task.
- Read complete relevant logs and errors.

---

## 6. Session hygiene

- Keep context focused on the task and summarize discoveries that matter.
- After repeated failed attempts on the same issue, pause to summarize what failed and reassess the approach. Continue unless the user asks to stop or progress is genuinely blocked.
- Use subagents only when the user or applicable project instructions request delegation.
- When committing, use a descriptive message; do not add attribution unless the project requests it.

---

## 7. Communication style

- Be direct and concise. Skip filler, excessive bullets, and unrequested headers.
- Give clear answers and state tradeoffs when they affect a decision.

---

## 8. When to ask, when to proceed

**Ask before proceeding when:**

- Two plausible interpretations materially change the result and cannot be resolved from the repository or conversation.
- A load-bearing or versioned decision is under-specified and cannot be safely inferred.
- A required credential or production resource is unavailable.
- The user's goal conflicts with the literal requested action.

**Proceed without asking when:**

- The task is reversible and its intent is clear.
- Reading the code or running a command resolves the ambiguity.
- The user has already answered the question.

---

## 9. Self-improvement loop

Keep these instructions useful and concise. When the user corrects an approach, add a concrete project learning only if an existing rule does not already cover it. Remove obsolete learnings.

---

## 10. Project context

### Stack

- Language and version: TypeScript; Node.js 24, as constrained in the root `package.json`.
- Frameworks: React 19 with Vite in `client/`; NestJS with Fastify in `server/`.
- Package manager: pnpm 10 workspaces.
- Runtime / deployment target: Browser SPA and Node.js server; deployment configuration is not confirmed here.

### Commands

- Install: `corepack pnpm install`
- Build: `corepack pnpm build`
- Test (all): `corepack pnpm test`
- Test (single file): `corepack pnpm --filter @wasl/web exec vitest run --config vitest.config.ts path/to/test-file.test.ts` or `corepack pnpm --filter @wasl/server exec vitest run --config vitest.config.ts path/to/test-file.spec.ts`
- Lint: `corepack pnpm lint`
- Typecheck: `corepack pnpm typecheck`
- Run locally: `corepack pnpm dev`

### Layout

- Source lives in: `client/src/`, `server/src/`, and `shared/src/`.
- Test setup is in `client/src/test/`; browser tests are in `client/e2e/`; server tests are in `server/test/`. `shared/` currently has no tests or dedicated test directory.
- Generated API code: generate from NestJS OpenAPI; never hand-edit generated clients.

### Conventions specific to this repo
- For every phase in this repo a git commit and branch with relevant commit message should be created.
- Keep React in `client/`, NestJS domain logic in `server/`, and cross-boundary contracts in `shared/`.
- NestJS owns authorization and business rules. Do not query PostgreSQL from client code or share repositories across server modules.
- When a task matches an installed skill under `.agents/skills/`, read its `SKILL.md` and follow its task-specific workflow.
- Keep secrets out of source control. Client environment values must be safe to expose; privileged keys and database credentials stay on the server.
-When running tests run those tests just on this specific feature, don't load passed test only failed ones gets loaded

### Forbidden

- Do not place database access or authoritative business authorization in client code.

---

## 11. Project Learnings

**Accumulated corrections. This section is for the agent to maintain, not just the human.**

- Preserve the existing city dropdown styling when adding search; use the shared Input tokens and hide the scrollbar while retaining scrolling.
- Keep date pickers compact with fixed-height month grids and viewport-aware positioning; do not enlarge calendars or force popovers outside the visible viewport.
- Keep input focus indicators inside the border frame; dropdowns open downward after scrolling their trigger into view and lock background scrolling while open.

When the user corrects your approach, append a one-line rule here before ending the session. Write it concretely ("Always use X for Y" not "be careful with Y"), never abstractly. If an existing line already covers the correction, tighten it instead of adding a new one. Remove lines when the underlying issue goes away (model upgrades, refactors, process changes).

- Review the whole `client/src` surface for client-wide React quality requests, even when earlier work focused on one feature phase.
- Use PascalCase filenames for React component modules; keep tests and Storybook stories in their existing naming pattern.
- Identify deployment origins and migration targets from environment files, deployment configuration, and connected provider metadata before asking the user; distinguish confirmed values from environment intent that remains unlabeled.
- Complete each requested task or phase end to end, including required database schema changes, migrations, and verification, before starting the next phase.
- When finishing a phase, implement all available scope before running focused phase tests; rerun only failed checks after fixes.
- During a verification or fix pass, close only the stated checks; do not add features, refactors, or new polish opportunities until those checks pass.
- Let Vite split lazily routed SDKs naturally; a `manualChunks` catch-all `vendor` hoists them into the eager bundle and cross-assigning their sub-dependencies produces circular-chunk warnings.
- When asked what can proceed without an owner handoff, list concrete task IDs and distinguish executable preparation from tasks that can be completed.

---
