# 06: Content-backed interest browsing

**What to build:** Let visitors browse up to six interests that actually lead to eligible content, retaining their selected city while allowing nationwide online events.

**Blocked by:** 02 — City-aware upcoming event discovery.

**Status:** ready-for-agent

**Labels:** ready-for-agent

- [ ] Show at most six existing reference categories in deterministic reference order, with translated labels and no new popularity/recommendation algorithm.
- [ ] With a selected city, qualify a category when it has a non-archived community in that city, a public non-cancelled future-start in-person event there, or an eligible online event nationwide. Without a selected city, evaluate communities and events nationwide.
- [ ] Past, ongoing, exactly-starting, cancelled or unlisted events and archived communities do not qualify categories. Full but otherwise eligible events still qualify.
- [ ] Compute eligibility against all qualifying content on the server, not only the four cards already fetched for another section. Add only the public projection needed and regenerate changed contracts/mocks.
- [ ] Category links open combined discovery preserving category, selected city and event eligibility context, with nationwide online inclusion. Categories retain selected-city scope even when another collection falls back nationwide.
- [ ] Hide the section after a successful response with no qualifying categories. Provide independent loading and retryable errors without disabling keyword search or corrupting the active city label.
- [ ] Preserve the complete reference-category list and behavior for creation and unrelated filters. Do not reuse the creation multi-select in a way that introduces selection limits or form semantics into discovery.
- [ ] API tests cover each qualifying resource type, geographic scope, exclusion cases, four-card independence and the six-category cap. Browser journeys verify destinations, city changes, empty/error/retry states and matching results.
- [ ] Verify Arabic/English labels, keyboard navigation, focus feedback, responsive layout and RTL/LTR behavior.
