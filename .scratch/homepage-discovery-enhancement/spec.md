# Homepage Discovery Enhancement

Status: done
Labels: implemented, verified

## Problem Statement

Visitors cannot quickly discover relevant activities and communities across Türkiye from the current homepage. It presents three newest communities and three chronologically ordered public events without location context, cover images or useful participation counts. Event recommendations can include past and cancelled events. Visitors must leave the homepage to filter by city or interest.

Guests and authenticated users need useful public discovery immediately, without onboarding or sign-in gates. The experience must help visitors find an upcoming event first, then a community to belong to, while keeping location selection understandable and controllable.

## Solution

Create an event-first homepage with image-led discovery, prominent keyword search, an editable city selector and an explicit “Use my location” action. Show content across Türkiye immediately when no city is remembered. Selecting or detecting a city updates the homepage and search context; remember only the city in that browser.

Present, in order:

1. A compact hero explaining Wasl, with search and location controls.
2. Upcoming in-person events for the selected city, or across Türkiye.
3. Communities for the selected city, or across Türkiye.
4. Upcoming online events, independent of city.
5. Interests/categories leading to filtered discovery.
6. A guest-only signup prompt.
7. A compact event/community creation prompt.

Each event/community collection contains at most four cards in a manually browsable horizontal row with accessible controls and a “View all” link. There is no autoplay, homepage pagination or infinite loading. If a city has no eligible in-person events or communities, independently fall back to nationwide content with a clearly changed heading; do not pretend those results are local. A successfully loaded, empty online collection is hidden.

Image-bearing event and community cards are required throughout the app, not only on the homepage. Compact list rows may omit imagery when it adds no value. Use bundled cover assets initially; uploading actual resource covers is not part of this release.

## User Stories

1. As a visitor, I want to understand Wasl's purpose immediately, so that I know whether it can help me find activities and communities.
2. As a visitor, I want upcoming events to lead the homepage, so that I can find a concrete activity to attend.
3. As a guest, I want to browse and search without signing in, so that I can evaluate Wasl before creating an account.
4. As an authenticated visitor, I want the same public discovery experience without a signup prompt, so that discovery stays useful without redundant promotion.
5. As a first-time visitor, I want nationwide content before choosing a location, so that the homepage is immediately useful.
6. As a visitor, I want an explicit “Use my location” action, so that I control when browser location permission is requested.
7. As a visitor, I want detected location mapped to a supported city, so that I see relevant local content without entering my city manually.
8. As a visitor, I want the city dropdown to reflect my detected city, so that I can understand and correct the active location.
9. As a visitor, I want to change the active city manually at any time, so that I can explore somewhere other than my current location.
10. As a returning visitor, I want my city remembered in the same browser, so that I do not repeat location selection on every visit.
11. As a privacy-conscious visitor, I want only my city remembered, so that precise coordinates are not persisted.
12. As a visitor who denies location permission, I want manual selection and discovery to remain usable, so that refusing permission does not block the service.
13. As a visitor whose location cannot be resolved, I want a brief explanation and an unchanged valid location context, so that an error does not silently replace my selection.
14. As a visitor outside Türkiye, I want manual city selection rather than a guessed Turkish city, so that recommendations are not misleading.
15. As a visitor, I want future public, non-cancelled events ordered soonest first, so that recommendations are actionable.
16. As a visitor, I want events that have already started excluded from upcoming recommendations, so that I am not encouraged to arrive too late.
17. As a visitor, I want local in-person events separated from online events, so that I understand how participation works.
18. As a visitor, I want online events available regardless of selected city, so that location does not hide accessible activities.
19. As a visitor in a city without upcoming events, I want nationwide events shown automatically and honestly labeled, so that discovery still offers useful alternatives.
20. As a visitor, I want full events to remain discoverable with accurate waitlist information, so that I can decide whether to join their waitlist.
21. As a visitor, I want approval-required registration distinguished from guaranteed admission, so that I understand what requesting a place means.
22. As a visitor, I want event cards to show a cover, title, organizer, date/time, location or online status, category, registration count and availability, so that I can compare activities quickly.
23. As a visitor, I want community discovery immediately after in-person events, so that I can find an ongoing group as well as a one-time activity.
24. As a visitor, I want communities ranked by active member count, so that I have an understandable indication of participation.
25. As a visitor, I want community cards to show a cover, name, description, organizer, city, category and member count, so that I can judge their relevance.
26. As a visitor in a city without communities, I want clearly labeled nationwide alternatives, so that the section remains useful.
27. As a visitor, I want interest links with matching content, so that category browsing does not lead to avoidably empty results.
28. As a visitor, I want category links to retain the active city while allowing nationwide online events, so that their destination matches the advertised scope.
29. As a visitor, I want keyword search to retain my selected city, so that I do not need to select it again on discovery.
30. As a visitor, I want city-scoped search to include nationwide online events, so that online activities are not incorrectly excluded.
31. As a visitor, I want “View all” to retain a collection's location and eligibility filters, so that its destination continues the same discovery journey.
32. As a mobile visitor, I want short, manually scrollable card rows, so that I can browse without a long stack of cards.
33. As a keyboard user, I want named, focus-visible row controls and usable card links, so that browsing does not depend on touch or a mouse.
34. As a visitor, I want images on event and community cards across the app, so that resource presentation is consistent after leaving the homepage.
35. As a visitor, I want readable cards when images fail, so that titles and essential details remain usable.
36. As a visitor, I want section-level loading and retry states, so that one failing collection does not block everything else.
37. As a visitor, I want clear nationwide empty states without fabricated content, so that I understand when nothing is available.
38. As a visitor, I want an empty online section omitted, so that the homepage does not devote space to an unavailable collection.
39. As an Arabic-speaking visitor, I want translated copy and correct RTL behavior, so that discovery and horizontal browsing feel natural.
40. As an English-speaking visitor, I want equivalent LTR functionality, so that language does not change feature availability.
41. As a visitor who prefers reduced motion, I want browsing without unnecessary animation, so that the page remains comfortable.
42. As a guest, I want a contextual signup invitation after seeing useful content, so that account creation follows demonstrated value.
43. As a prospective organizer, I want a compact prompt to create an event or community, so that I can start bringing people together.
44. As a guest choosing creation, I want sign-in to return me to the chosen creation flow, so that authentication does not lose my intent.

## Implementation Decisions

### Existing behavior and boundaries

- Enhance the existing homepage, shared resource cards, discovery listings and their contracts rather than create a parallel discovery system.
- Keep authorization and authoritative filtering/counting on the server. Public discovery must not depend on organizer-only participation endpoints or direct database access from the browser.
- Reuse existing search, searchable city selection, category/reference data, date formatting, feedback components, design tokens and Radix-based house controls. CLI-configured shadcn is not established in the inspected repository; do not introduce a competing design system merely to satisfy a library label.
- Reuse the current event/community creation and validated authentication return-to flows. Creation prompts do not bypass existing permissions.
- Regenerate API clients and mocks from server contracts when those contracts change; do not hand-edit generated clients.

### Location state and privacy

- Maintain one active city selection shared by the homepage dropdown, collections, category destinations and search submission. A valid remembered city initializes that selection; otherwise it is nationwide.
- Request browser geolocation only after the explicit location action, never automatically on page entry or return visits. Do not add background location watching.
- Resolve coordinates to an existing Türkiye province/city identifier. Do not silently substitute the nearest Turkish city for outside-country or unmatched coordinates.
- On success, update the editable dropdown and remember the resolved city. Manual selection has the same visible effects. Clearing to nationwide removes the remembered city selection.
- When permission is denied, geolocation is unsupported, resolution fails or the result is outside Türkiye, retain the current valid city or nationwide state, explain briefly and preserve manual selection.
- Store the city identifier only, not precise coordinates. Failure of browser persistence must not block discovery. Invalid remembered identifiers must not leave an unusable selection.
- The coordinate-to-city mapping source is intentionally not selected by this spec. Choose a supported, privacy-conscious method during implementation after verifying accuracy, licensing, runtime/network requirements and any provider credentials. No provider readiness is implied. Avoid durable precise-coordinate storage/logging or unrelated location analytics.

### Collection eligibility, ordering and fallback

- Upcoming means the start instant is strictly later than the server's current instant. An ongoing event is excluded even if its end is in the future. Eligible events must also be public and not cancelled.
- In-person recommendations exclude online events, use the active city when present, and sort by start time ascending. Show at most four eligible results.
- If a city returns zero eligible in-person events, request nationwide in-person results and clearly label the section as across Türkiye. Do not top up a nonempty local collection with other cities.
- Communities exclude archived records, use the active city when present, and sort by active member count descending, then creation time descending. Show at most four results.
- Reuse the existing community detail member-count meaning: active memberships plus an individual owner if not already represented by an active membership. Keep listing and detail counts consistent.
- If a city has zero eligible communities, independently fall back to nationwide communities with an accurate heading. An event fallback does not automatically change community scope or the dropdown.
- Online recommendations use the same upcoming/public/non-cancelled eligibility, ignore city and sort soonest first. Show at most four results; hide the section only after a successful empty response, not while loading or on failure.
- A failed local request is an error, not proof of no local content; do not trigger geographic fallback on errors. Nationwide empty in-person/community collections retain concise empty states.

### Search, destinations and categories

- Keep keyword search submission to the existing combined discovery experience. Preserve the active city and keyword in its URL-backed state.
- For combined city-scoped discovery, eligible in-person events match that city and eligible online events remain nationwide. Community city filtering stays strict.
- Add the minimum explicit event filters required for online/in-person selection and upcoming/non-cancelled eligibility. Homepage searches/category links and event “View all” links carry the appropriate eligibility context. Do not silently remove historical browsing from unrelated existing routes.
- In-person “View all” uses the collection's effective scope, including nationwide scope after fallback; online “View all” is nationwide and online-only. Both preserve upcoming/non-cancelled eligibility. Community “View all” preserves effective scope and member-count ordering.
- Expose no more than six homepage categories from existing reference categories. A category qualifies if it has a non-archived community in the selected city, an eligible in-person event there, or an eligible online event nationwide. Without a selected city, evaluate all content nationwide.
- Category links retain the selected city and lead to matching combined discovery. Categories follow selected scope, not the independent nationwide fallback of another row; hide the category section if none qualify. Use deterministic reference ordering rather than introduce category popularity scoring.
- Keep existing full reference-category data available for creation and general filters; homepage content-aware eligibility must not remove options from unrelated consumers.

### Images, metadata and availability

- Give image-led event/community cards a consistent cover region throughout the client, including discovery, related collections and other card presentations. Audit all card usages, not just the homepage's shared component. Compact list rows are exempt; this does not authorize surrounding page redesigns.
- Use suitable bundled assets and stable per-resource cover selection, reusing existing community covers where suitable. They are illustrative, not photographs asserted to depict the actual group or event. No image-generation or upload workflow is required.
- Covers must reserve layout space, crop responsively and fail gracefully without losing metadata or navigation. Avoid repetitive alternative text for decorative imagery; use meaningful alternatives only where the image conveys information.
- Event cards expose cover, title, organizer identity, date/time, location or online label, category, accepted registration count and availability. Community cards expose cover, name, short description, organizer identity, city, category and active member count.
- Compute availability using accepted registration rows, as registration capacity enforcement currently does; pending and waitlisted requests do not occupy seats. Do not use attendee-preview totals or add an unregistered host to the capacity calculation.
- For finite capacity, remaining places equal capacity minus accepted registrations, clamped at zero. Full events remain eligible and indicate waitlist availability. Approval-required events distinguish requesting approval from confirmed admission. Unlimited capacity must not display a fabricated finite remainder.
- Public counts are aggregates only. Do not expose identities, private registrations or organizer-authorized data through new public projections. Availability is informational and must not replace transactional capacity checks when registering.

### Presentation and resilience

- Use the agreed section order, with events prominent immediately after a compact hero. Imagery must not bury discovery below an oversized introduction.
- Each collection supports manual touch scrolling and accessible previous/next actions where overflow exists. No autoplay, automatic advancement, infinite loading or homepage page controls. Match existing icon-only action, tooltip, hit-target and focus conventions.
- “Up to four” is a total collection cap, not four cards visible on every viewport. Keep rows usable with one item, fewer than four items, zoom and narrow screens.
- Translate all new copy and accessible labels in Arabic and English, use logical layout directions and verify RTL scrolling/control behavior. Continue displaying event dates/times consistently in Türkiye time.
- Loading skeletons reserve the intended card layout. Each data section independently supports retryable errors without hiding other successfully loaded content. Empty states must be distinguishable from errors.
- Category/reference loading failures must not disable otherwise usable keyword search or replace a valid selection with a misleading city label.
- Keep one guest-only signup prompt after useful discovery. Keep a compact creation prompt for both guests and authenticated visitors, subject to existing authorization. No modal signup interruptions or discovery gates.

## Testing Decisions

- Testing seams were explicitly confirmed by the owner: browser journeys first, existing discovery API integration tests for authoritative behavior, and focused shared-card tests for app-wide image coverage. Do not create a new test-only architecture.
- Good tests exercise observable navigation, rendered information, accessible controls and public API results, not component internals, hook calls, SQL formatting or arbitrary DOM class structure.
- Use existing browser discovery/authentication journeys as prior art for homepage integration: public access, URL filters, history, authentication return-to and keyboard interaction. Stub permission/geolocation and coordinate resolution deterministically; real browser location services must not make CI flaky.
- Browser acceptance covers initial nationwide content; remembered/manual/detected city reflected in the dropdown; explicit-only permission requests; manual correction; persistence; denied/unsupported/error/outside-country behavior; and no persisted precise coordinates.
- Exercise rapid selection changes and delayed location responses so displayed city and results cannot contradict the current user selection. Verify navigation and search retain the committed scope.
- API tests use a controlled clock and fixtures for past, exactly-starting, ongoing, future, cancelled, public, unlisted, in-person, online, full, unlimited and approval-required events. Assert collection eligibility and ordering through endpoint results.
- Verify local-empty versus local-error behavior, independent community/event fallbacks, accurate nationwide headings/destinations, no mixed-city top-ups, online independence and the four-card cap.
- Test community ranking, creation-time ties and owner-inclusive active membership counts against detail semantics. Verify archived communities cannot qualify a category or recommendation.
- Test category eligibility with local communities, local upcoming events, nationwide online events, cancelled/past-only content, no matches and nationwide scope. Assert category destinations produce the advertised matching scope.
- Test capacity labels and aggregates with accepted, pending and waitlisted registrations; ensure an extra host in attendee previews does not reduce remaining capacity. Keep existing registration authorization/capacity tests intact.
- Exercise search and each “View all” destination through discovery URLs, including city plus online results, future/non-cancelled eligibility, nationwide fallback scope and preservation of unrelated historical browsing.
- Reuse homepage and discovery component-test patterns for isolated loading/error/empty/retry behavior and card navigation. Audit other resource-card surfaces for covers; verify compact list rows need not gain images.
- Visually verify representative desktop/mobile widths, Arabic RTL and English LTR, cover cropping/failure, focus visibility, readable availability, reduced motion and loading layout stability. Test carousel controls by keyboard and touch without relying on swipe alone.
- Reuse development fixtures containing online, past, cancelled, full, unlisted and archived resources; extend only missing scenarios. Seed data is not proof of deployed content volume.
- During implementation, run feature-focused tests and relevant contract/type checks. After fixes rerun failed checks rather than unrelated passing suites. Record exact commands/results and any unavailable visual checks.

## Out of Scope

- Global header/navigation redesign, personalized authenticated discovery and advanced recommendations.
- Organization directory/listing or a dedicated homepage organization section; existing organizer information and organization profiles remain available.
- Real event/community cover uploads, storage/schema expansion for uploaded covers and corresponding creation/edit workflows.
- Popular-city sections, a separate “How Wasl works” section, onboarding redesign, new notifications or messaging.
- New registration, waitlist or organizer permission semantics; availability only reflects existing business rules.
- Background geolocation, automatic permission prompts, durable precise-coordinate tracking and location analytics.
- A replacement search architecture, arbitrary ranking configuration, unrelated listing-page redesigns, homepage infinite loading and autoplay.
- New Turkish UI localization as part of this Arabic/English feature; preserve existing reference-data language support.

## Further Notes

- This spec records the completed grilling session and the owner's confirmation of testing seams. It is ready for agent implementation, not a claim that implementation or verification has already happened.
- The app currently has city/category/date discovery filters and multilingual reference data, but no established coordinate-to-city mapping, public organization listing, content-aware homepage categories or public event occupancy projection. These are not assumed to exist.
- Public count/filter projections and generated contracts must be completed with the UI; client-side filtering of a four-item response cannot correctly implement server eligibility, ranking or fallback.
- No database schema change was agreed. Aggregate counts and discovery filters can use existing data. Assess mapping needs during implementation rather than invent a migration solely for this spec.
- No relevant glossary or ADR files were present during inspection. Use existing domain terms: event, community, organization, city, category, accepted registration and active membership.
- Existing development samples span multiple cities and include useful edge cases, but live database contents, provider credentials, deployment geolocation readiness and deployed authentication allowlists were not verified.
- Shared image cards intentionally broaden the original homepage-only scope; changes to supporting discovery filters and destinations are limited to making the agreed homepage journeys work consistently.

## Completion — 2026-11-02

- Tickets 01–07 are done with every scope checkbox checked. Implementation, acceptance text and historical evidence above remain unchanged; the initial readiness notes describe the planning baseline, not the current state.
- Both supplied P2 findings were fixed, merged and independently verified with no remaining scoped findings. See `review.md` for exact producer/integration checks and `closure.md` for final tracker, graph and cleanup disposition. Closure starts from integration `e79612ae2be2dace100bd23c97986f0e74154e27`; no product code changes or passed-suite reruns were needed.
- Verification limits remain: global lint has four pre-existing privacy-test errors; builds retain existing dependency/chunk warnings. Browser evidence is Chromium with deterministic API/auth boundaries, not real auth/email, physical-device/GPS or production HTTPS/policy verification. These are verification limits, not unchecked implementation scope.
