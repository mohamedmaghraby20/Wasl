# Graphify

This project has a knowledge graph at `graphify-out/` with god nodes, community structure, and cross-file relationships.

## Activation

- When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

## Codebase Navigation

- When `graphify-out/graph.json` exists, run `graphify query "<question>"` before the first grep, search, or source-file read for a codebase question.
- Include this rule in every subagent prompt that explores code.
- Read raw files only for lines the graph or an earlier read already located.
- Use `graphify path "<A>" "<B>"` for relationships.
- Use `graphify explain "<concept>"` for focused concepts.
- Use `graphify-out/wiki/index.md` for broad navigation when available.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture reviews or when query/path/explain do not provide enough context.

## Graph Maintenance

- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- Dirty `graphify-out/` files are expected after hooks or incremental updates; do not skip Graphify because of them.
- Skip Graphify only when the task concerns stale or incorrect graph output, or the user explicitly says not to use it.
- A committed `graphify-out/graph.json` is rewritten in full on every build. Treat large diffs as expected; do not flag them as churn or suggest skipping graph rebuilds or hooks.
