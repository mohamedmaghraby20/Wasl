# 04: Member-ranked community discovery

**What to build:** Help visitors find active communities in their selected city, understand participation through visible member counts, and explore clearly labeled nationwide alternatives when no local communities exist.

**Blocked by:** 02 — City-aware upcoming event discovery.

**Status:** ready-for-agent

**Labels:** ready-for-agent

- [ ] Show up to four non-archived communities for the active city, or nationwide when none is selected, ranked by active member count descending and creation time descending for ties.
- [ ] Match existing detail count semantics: active memberships plus an individual owner only when that owner is not already represented by an active membership. Listing, card and detail counts agree; organization ownership does not fabricate an extra member.
- [ ] Expose public aggregate member counts and supported listing ordering through server contracts, regenerate affected clients/mocks and render counts on community cards throughout the app. Do not expose private membership records or query the database from the browser.
- [ ] Community cards retain name, short description, organizer, city and category. This slice remains functional with existing card presentation; ticket 01 independently supplies app-wide imagery.
- [ ] If a selected city successfully has no eligible communities, show nationwide results with an accurate heading. Do not top up nonempty local collections, change the active dropdown or let event fallback determine community scope.
- [ ] Community “View all” preserves effective geographic scope and member-count ordering without changing unrelated default listings unnecessarily.
- [ ] Provide independent loading, retryable error and nationwide empty states. A failed local request must not masquerade as an empty result or trigger nationwide fallback.
- [ ] API tests cover owner-inclusive counts, membership statuses, archived exclusion and ranking ties. Browser/component journeys cover city changes, independent fallback, count rendering, destination filters and errors.
- [ ] Provide Arabic/English count/section copy and verify RTL/LTR and responsive behavior. Final horizontal-row presentation belongs to ticket 07.
