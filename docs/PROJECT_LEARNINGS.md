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
