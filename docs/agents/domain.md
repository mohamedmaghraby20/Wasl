# Domain Docs

Wasl uses a single shared domain context across client, server,
and shared packages.

## Before exploring

- Read root `GLOSSARY.md`, if present.
- Read relevant decisions under `docs/adr/`, if present.
- Follow the graphify exploration rules in `AGENTS.md`.

If domain docs are absent, proceed silently. Do not create
placeholder documents; document terms and decisions when resolved.

## Layout

- `GLOSSARY.md`: shared domain vocabulary.
- `docs/adr/`: architectural decision records.

## Vocabulary

Use glossary terms consistently in issues, specs, code, and tests.
If a needed term is missing, identify the gap rather than inventing
a conflicting synonym.

## Decision conflicts

Explicitly flag proposals that contradict an existing ADR,
identify the ADR, and explain why reconsidering it may be warranted.
