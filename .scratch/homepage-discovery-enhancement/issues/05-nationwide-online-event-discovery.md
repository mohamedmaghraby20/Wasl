# 05: Nationwide online-event discovery

**What to build:** Give visitors a separate collection of upcoming online activities that remains useful regardless of their selected city, with a matching destination for deeper browsing.

**Blocked by:** 02 — City-aware upcoming event discovery.

**Status:** ready-for-agent

**Labels:** ready-for-agent

- [ ] Add a separate homepage collection of up to four online events nationwide, using public, non-cancelled, strictly future-start eligibility and soonest-first ordering.
- [ ] City selection, remembered city and local/nationwide fallback in other collections never restrict the online collection, including online events with no city or a different city.
- [ ] “View all” opens online-only nationwide event discovery with upcoming/non-cancelled filters preserved through URL state, server queries, pagination and navigation history.
- [ ] Hide this section only after a successful empty response. While loading show the appropriate loading state; on failure show an independent retryable error rather than hiding the section as empty.
- [ ] Use existing shared event cards without duplicating metadata or availability logic; ticket 01's image/count enhancements apply independently.
- [ ] Extend existing API/browser tests for online modality, time/cancellation/visibility boundaries, city independence, the four-result cap, matching destinations and loading/error/empty/retry behavior. Regenerate any changed contracts/mocks.
- [ ] Translate the section and feedback in Arabic/English and verify RTL/LTR and responsive presentation. Final horizontal-row styling belongs to ticket 07.
