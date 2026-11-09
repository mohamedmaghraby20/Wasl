# Design system migration inventory

Status: **initial inventory, incomplete**. This is preparation for a design-folder review; it is not an approved design or a record of application changes. The new kit is in `../new desdign system/`. Preserve existing files and behavior while completing the inventory and mapping.

## Existing foundations

| Area | Existing source | Candidate direction / decision |
| --- | --- | --- |
| Design preview | `index.html`, `styles.css`, `theme-controller.js` | Retain existing examples and controls while adapting the visual language. Compare actual screenshots before calling the result verified. |
| Theme tokens | `tokens.css`, `tokens.json` | Map the existing semantic contract to candidate Cacao and Terracotta values; keep both representations consistent. The current contract has more tokens than the candidate. |
| shadcn bridge | `shadcn-variables.css` | Keep current semantic variable names, including chart and sidebar aliases, and map through the existing tokens. |
| Tailwind bridge | `tailwind-theme.css` | The client uses Tailwind 4.1.13; merge compatible mappings, do not replace the file. |
| Theme modes | `tokens.css`, `theme-controller.js` | Keep existing dark values and Wasl, Ocean and Plum preview options. The candidate does not define an approved dark design. |
| Density | `tokens.css`, `theme-controller.js` | Preserve comfortable and compact behavior and control sizing. |
| Typography | `tokens.css`, `index.html` | Existing Manrope/Tajawal differs from the candidate Arial/Tahoma fallback. Typography remains a review decision; preserve Arabic shaping and legibility. |
| Geometry | `tokens.css`, `styles.css` | Candidate proposes 4px control/card corners, strong borders and no default card shadow. Map these without dropping existing sizing and state tokens. |
| Accessibility | preview and component sources | Check contrast, keyboard, focus, long labels, Arabic/RTL, reduced motion, reflow and image failures; none are verified by this inventory. |

No `components.json` was found in the repository outside ignored dependency/worktree directories during this initial search. The client uses Radix packages and existing local UI components; do not initialize or overwrite a shadcn configuration without a separate decision.

## Initial component mapping

Paths below are relative to the repository root. These are preservation targets, not claims that every implementation detail has been audited. Review each source, its call sites and states before marking it complete.

| Existing component | Source path | Known variants or states | Candidate equivalent and preservation target | Status |
| --- | --- | --- | --- | --- |
| Button | `client/src/components/ui/Button.tsx` | primary, secondary, outline, ghost, danger, danger-ghost, link; sm, md, lg, icon, icon-sm; success/danger/warning intents, block, asChild | Buttons and links; preserve all variants, sizes, intents and composition API. | Source inspected; preview mapping pending |
| IconButton | `client/src/components/ui/IconButton.tsx` | Button variant; accessible label; icon-sm | Icon action; retain label and touch sizing. | Source inspected; preview mapping pending |
| Badge | `client/src/components/ui/Badge.tsx` | neutral, primary, outline, success, warning, danger, info | Badge/status; preserve all variants and text cues. | Source inspected; preview mapping pending |
| Card | `client/src/components/ui/Card.tsx` | Composable container | Card primitive; preserve composition. | Source inspected; preview mapping pending |
| Input, Textarea, Label, Field, Checkbox | `client/src/components/ui/` | Inspect each source and usages | Form controls; preserve labels, errors, disabled and input behavior. | Pending |
| Select, SearchableSelect, SearchInput, TagInput | `client/src/components/ui/` | Inspect each source and usages | Select, search and filters; retain keyboard and selection behavior. | Pending |
| Calendar, DatePicker, DateTimePicker | `client/src/components/ui/` | Inspect each source and usages | Date/time selection; retain locale, keyboard and validation behavior. | Pending |
| Dialog, AlertDialog, ConfirmDialog, DeleteDialog, TextPromptDialog | `client/src/components/ui/` | Inspect each source and usages | Overlays and confirmation; retain focus, dismissal, content and callbacks. | Pending |
| DropdownMenu, Popover, Sheet | `client/src/components/ui/` | Inspect each source and usages | Menus and overlays; retain interaction and focus behavior. | Pending |
| EmptyState, Skeleton | `client/src/components/ui/` | Inspect each source and usages | Empty and loading states; retain existing APIs. | Pending |
| LoadingSkeleton, LoadingState, QueryError | `client/src/components/feedback/` | Inspect each source and usages | Loading and error feedback; retain recovery behavior. | Pending |
| EmailValidationForm | `client/src/components/forms/EmailValidationForm.tsx` | Inspect source and usages | Form and validation states; retain interaction and error handling. | Pending |
| GlobalSearch, AppFooter | `client/src/components/layout/` | Inspect source and usages | Navigation and search; preserve responsive and signed-in/out behavior. | Pending |
| ResourceCard | `client/src/features/resources/ResourceCard.tsx` | Inspect community and event variants and usages | Event/community card anatomy; use supported fields and preserve actual links and states. | Pending |
| Discovery filters, pagination, sections | `client/src/features/discovery/` | Inspect source and usages | Filters, results and pagination; preserve URL and interaction behavior. | Pending |
| Other feature-specific compositions | `client/src/features/` | Inventory remaining components, variants and usages individually | Adapt existing patterns, including participation, authentication, profile, messaging and notifications, without inventing features. | Not yet inventoried |

## Remaining work before design review

1. Complete the source-level inventory, including component exports, call sites, dependencies and every supported variant and state. The table above is not exhaustive.
2. Compare the existing preview and candidate against the actual supplied visual references; document intentional deviations.
3. Adapt the existing design-folder tokens and preview without removing existing coverage or changing the app. Resolve candidate token conflicts and keep dark-mode values intact.
4. Review actual event/community card anatomy and representative layouts without changing app page layouts or behavior.
5. Verify desktop/mobile, RTL/LTR, keyboard, contrast and relevant states in a browser; record results and gaps.
6. Present the design-folder changes for review before any application-wide migration.
