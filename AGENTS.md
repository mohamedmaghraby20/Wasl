# Wasl repository guidance

Project-specific operating instructions for coding agents working on Wasl, a
bilingual Arabic/English community and event platform for Arabs in Türkiye.
Read this file before every task and keep it aligned with the actual project
structure and commands.
This file contains references to other files under `./docs/`, each covering a specific aspect of the application. Only explore a referenced file when the current task relates to its subject.
Claude Code and Gemini CLI can read this file through the `@AGENTS.md` reference
in their project instructions.

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
- For every code-changing/task, read and follow `docs/VERSION_CONTROL.md` before making changes, regardless of the task type.

---

## Git Conventions

- Before starting any code-changing task and after completing any task, read and follow `docs/GIT_WORKFLOW.md` throughout the entire task. Do not consider the task complete until its version control requirements are satisfied.

[`/docs/GIT_WORKFLOW.md`](/docs/GIT_WORKFLOW.md.md)

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

---

## Graphify

Reference [`/docs/GRAPHIFY.md`](/docs/GRAPHIFY.md)
