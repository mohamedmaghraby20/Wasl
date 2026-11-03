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

### Client

- Use Meetup-like compact Lucide outline icons throughout `client/src`: 14px for metadata, 16px beside labels and in compact actions, 18px for standalone actions, and 20px for prominent navigation or feedback; use a consistent 1.75 stroke. Larger icons belong only in proportional avatar/illustration placeholders, not action controls.
- Let shared controls own icon sizing; keep icons centered and non-shrinking. Compact icon buttons are 36px for fine pointers and at least 44px for touch; do not enlarge the glyph to fill its hit target.
- Use icon-only controls for secondary row, panel, and toolbar actions across the whole client (including remove, moderator, attendance, edit, reply, report, and pagination actions), not icons beside visible action text. Use `IconButton` with a translated accessible label and matching tooltip; retain text for headings, statuses, navigation destinations, primary form submissions, and explicit confirmation dialogs.
- Give all actions hover and keyboard-focus feedback using semantic tokens: pale-red surfaces with readable red icons for delete/reject/remove, green for approve/promote, amber for caution/archive, and brand emphasis for ordinary actions. Preserve disabled/loading states, accessible names and titles for icon-only actions, and visible controls on touch devices; never convey an action by color alone.

### Forbidden

- Do not place database access or authoritative business authorization in client code.

---

## Agent skills

### Issue tracker

Issues and specs use local Markdown under `.scratch/<feature>/`.
See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: root `GLOSSARY.md` and `docs/adr/`.
See `docs/agents/domain.md`.

---

## 11. Project Learnings

**Accumulated corrections. This section is for the agent to maintain, not just the human.**

- Keep repo-wide agent configuration in `AGENTS.md` and keep `CLAUDE.md` as an `@AGENTS.md` reference.

- Preserve the existing city dropdown styling when adding search; use the shared Input tokens and hide the scrollbar while retaining scrolling.
- Keep date pickers compact with fixed-height month grids and viewport-aware positioning; do not enlarge calendars or force popovers outside the visible viewport.
- Keep input focus indicators inside the border frame; dropdowns open downward after scrolling their trigger into view and lock background scrolling while open.

When the user corrects your approach, append a one-line rule here before ending the session. Write it concretely ("Always use X for Y" not "be careful with Y"), never abstractly. If an existing line already covers the correction, tighten it instead of adding a new one. Remove lines when the underlying issue goes away (model upgrades, refactors, process changes).

- Review the whole `client/src` surface for client-wide UI requests; cover secondary actions in every state, including active-member removal, moderator roles, attendance and admin rows—not only request previews.
- Use PascalCase filenames for React component modules; keep tests and Storybook stories in their existing naming pattern.
- Identify deployment origins and migration targets from environment files, deployment configuration, and connected provider metadata before asking the user; distinguish confirmed values from environment intent that remains unlabeled.
- Complete each requested task or phase end to end, including required database schema changes, migrations, and verification, before starting the next phase.
- When finishing a phase, implement all available scope before running focused phase tests; rerun only failed checks after fixes.
- During a verification or fix pass, close only the stated checks; do not add features, refactors, or new polish opportunities until those checks pass.
- Let Vite split lazily routed SDKs naturally; a `manualChunks` catch-all `vendor` hoists them into the eager bundle and cross-assigning their sub-dependencies produces circular-chunk warnings.
- When asked what can proceed without an owner handoff, list concrete task IDs and distinguish executable preparation from tasks that can be completed.
- Keep owner-facing MVP checklists standalone when requested: use a new file, remove the old handoff and its incoming references, and add no cross-file links.
- For development Supabase data, accept the owner's authorization and seed samples directly; explain owner-only admin setup as exact signup and browser steps, never ask the owner to find internal Wasl IDs.
- Use tall host-first attendee cards with an overlapping light-green badge for events; use separate organizer/message and compact member-avatar cards for communities.
- Show pending/waitlisted requests only under Members as at most five compact stacked rows with icon-only approval/rejection controls; hide the preview when both queues are empty and link to the reusable review page.
- Use the shared SearchInput for app search fields, preserving each caller's submit/filter semantics and responsive width.
- Use the reusable typed-name deletion workflow for every delete action, including impact warnings, pending/error states, and completion feedback.
- Give community category legends explicit bottom spacing; fieldset grid gaps do not separate the legend from its options.
- Request native browser location permission automatically on home-page entry; use manual city selection as fallback, without a custom consent question or location button.
- Show optional geolocation failures as neutral guidance, not red alerts; infer discovery city from the estimated point rather than requiring its whole accuracy radius to fit one province.

---

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
