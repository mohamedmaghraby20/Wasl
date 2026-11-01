# Issue tracker: Local Markdown

Issues and specs live as Markdown files under `.scratch/`.
Do not create GitHub issues for this repo.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`.
- Specs: `.scratch/<feature-slug>/spec.md`.
- Tickets: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`,
  numbered from `01`, one file per ticket.
- Record ticket state in a `Status:` line near the top.
- Append discussion under `## Comments`; preserve existing history.

## Publishing

Create or update the appropriate spec or ticket file,
creating its directory if needed.

## Fetching tickets

Read the referenced file. If given only a ticket number,
resolve it within the relevant feature directory; ask if ambiguous.
