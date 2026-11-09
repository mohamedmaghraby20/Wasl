# Wasl repository guidance

Project-specific operating instructions for coding agents working on Wasl, a bilingual Arabic/English community and event platform for Arabs in Türkiye.
This file contains references to other files under `./docs/`, each covering a specific aspect of the application. Only explore a referenced file when the current task relates to its subject.

---

## Tech Stack

Read this only when you need context about the technology stack used to build
the app [`/docs/03-TECH-STACK.md`](/docs/03-TECH-STACK.md).


## Commands & Scripts

- Install: `corepack pnpm install`
- Build: `corepack pnpm build`
- Test (all): `corepack pnpm test`
- Test (single file): `corepack pnpm --filter @wasl/web exec vitest run --config vitest.config.ts path/to/test-file.test.ts` or `corepack pnpm --filter @wasl/server exec vitest run --config vitest.config.ts path/to/test-file.spec.ts`
- Lint: `corepack pnpm lint`
- Typecheck: `corepack pnpm typecheck`
- Run locally: `corepack pnpm dev`

---


## Conventions specific to this repository

- Keep React in `client/`, NestJS domain logic in `server/`, and cross-boundary contracts in `shared/`.
- NestJS owns authorization and business rules. Do not query PostgreSQL from client code or share repositories across server modules.
- When a task matches an installed skill under `.agents/skills/`, read its `SKILL.md` and follow that skill's task-specific workflow.
- For every code-changing/task, read and follow `docs/GIT_CONVENTIONS.md` before making changes, regardless of the task type.

---

## Git Conventions

- Check git status and uncommitted code when a new session starts.
- Do not consider the task complete until its version control requirements found in `docs/GIT_CONVENTIONS.md` are satisfied. 

Reference [`/docs/GIT_CONVENTIONS.md`](/docs/GIT_CONVENTIONS.md)

---

## Front-end/client Conventions

Reference [`/docs/FRONTEND.md`](/docs/FRONTEND.md)

---

## Back-end/server Conventions

Reference [`/docs/BACKEND.md`](/docs/BACKEND.md)

---
## Design/UI/UX Conventions

Reference [`/docs/design`](/docs/DESIGN.md)

---

## Agent skills

### Issue tracker

Issues and specs use local Markdown under `.scratch/<feature>/`.
See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: root `GLOSSARY.md` and `docs/adr/`.
See `docs/agents/domain.md`.

---

## Project Learnings

Reference [`/docs/PROJECT_LEARNINGS.md`](/docs/PROJECT_LEARNINGS.md)

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
- Give the signed-in home sidebar its own column outside the narrow app content width; use the available viewport and keep event cards comfortably wide, with the sidebar on the left in English and mirrored in Arabic.

---

## Graphify

Reference [`/docs/GRAPHIFY.md`](/docs/GRAPHIFY.md)
