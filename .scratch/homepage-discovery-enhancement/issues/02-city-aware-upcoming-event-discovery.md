# 02: City-aware upcoming event discovery

**What to build:** Let visitors select and remember a city, discover up to four upcoming in-person events there, and continue the same journey through search or “View all.” Make nationwide discovery useful before selection and when local events are absent.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Labels:** ready-for-agent

- [ ] Add an editable city dropdown using existing searchable selection controls. Keep one active city shared by its visible value, homepage queries, search and destinations; leave a usable integration point for explicit geolocation without implementing it here.
- [ ] Initialize from a valid remembered city or nationwide discovery. Remember only the city identifier in that browser; clearing to nationwide clears the remembered selection. Invalid identifiers and unavailable storage do not block discovery.
- [ ] Show up to four public, non-cancelled, in-person events with start instants strictly later than server time, ordered soonest first. Past, exactly-starting, ongoing, cancelled, online and unlisted events are excluded from this collection.
- [ ] When a selected city successfully returns no eligible events, automatically show nationwide in-person events under a clearly nationwide heading. Do not top up nonempty local results with other cities or trigger fallback on a failed request.
- [ ] Keep the selected city unchanged during nationwide fallback. Provide section loading skeletons, retryable errors and a concise nationwide empty state without blocking the rest of the homepage.
- [ ] Preserve keyword, selected city and explicit upcoming/non-cancelled eligibility when submitting homepage search to combined discovery. In that context, in-person events match the city while online events remain nationwide; community filtering remains city-scoped.
- [ ] In-person “View all” preserves eligibility and the collection's effective city/nationwide scope. Update discovery URL parsing, filter forwarding and server contracts end to end, regenerating clients/mocks as required.
- [ ] Use explicit filter context rather than silently eliminating historical browsing from unrelated existing routes. Retain existing category/date/pagination behavior and public access.
- [ ] API tests with controlled time cover eligibility, modality, city-plus-online search and preservation of existing unfiltered behavior. Browser journeys cover remembered/manual/cleared city, fallback versus error, search, destinations and rapid city changes.
- [ ] Provide Arabic/English labels and accessible loading/error/focus states; verify RTL/LTR and mobile/desktop behavior. Accessible horizontal rows and final hero styling are completed in ticket 07, not prerequisites for this working slice.
