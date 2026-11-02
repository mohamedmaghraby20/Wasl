# 07: Complete homepage presentation and participation prompts

**What to build:** Bring the completed discovery journeys together into a compact, image-led, event-first homepage with accessible horizontal browsing and contextual signup/creation prompts, then verify the complete experience.

**Blocked by:**
- 01 — Image-led resource cards and event availability.
- 02 — City-aware upcoming event discovery.
- 03 — Explicit geolocation with manual correction.
- 04 — Member-ranked community discovery.
- 05 — Nationwide online-event discovery.
- 06 — Content-backed interest browsing.

**Status:** ready-for-agent

**Labels:** ready-for-agent

- [ ] Use the agreed order: compact value-proposition hero/search/location, in-person events, communities, online events, categories, guest signup prompt and event/community creation prompt. Keep useful discovery close to the top, not below an oversized hero.
- [ ] Render each event/community collection as a manually scrollable horizontal row capped at four total cards. Add accessible previous/next controls when overflow exists and preserve each collection's correctly scoped “View all” destination.
- [ ] Support keyboard and touch browsing, natural RTL/LTR behavior, one/fewer-than-four items, narrow screens, zoom, visible focus and reduced motion. Use existing icon-only action controls, translated accessible labels/tooltips and appropriate hit targets. No autoplay, infinite loading or homepage pagination.
- [ ] Keep city controls editable and synchronized across manual selection, remembered location, geolocation, search and collection changes. Preserve independently labeled nationwide fallbacks without changing selected-city category scope.
- [ ] Present skeletons with stable image-card dimensions and independent section errors/retries. Hide successfully empty online/category sections, retain nationwide in-person/community empty states and never substitute errors for emptiness.
- [ ] Show one contextual signup prompt only to guests after discovery, without gating public browsing/search or showing signup popups. Authenticated visitors retain the same discovery content without that prompt.
- [ ] Provide a compact creation prompt linking to event and community creation. Reuse existing sign-in/signup return-to behavior and existing authorization, including confirmation-email return intent where supported.
- [ ] Reuse existing house design tokens, search and selection controls; preserve dropdown styling, viewport behavior and focus conventions. Do not add a competing UI framework or redesign the global header/navigation.
- [ ] Complete integrated browser journeys for guest/authenticated discovery, city correction/persistence, geolocation outcomes, row controls, search/category/View-all destinations, fallback consistency and authentication return-to. Tests in prior slices remain required, not deferred to this ticket.
- [ ] Visually verify representative mobile/desktop widths in Arabic RTL and English LTR, including imagery/failure states, typography, metadata, availability, loading stability and keyboard/touch controls. Run relevant feature-focused tests and contract/type checks, record exact results and fix failures without weakening checks.
- [ ] Keep dedicated organization discovery, real cover uploads, personalization, popular cities, a separate explainer section, onboarding and unrelated page redesigns out of scope. Confirm the app-wide card audit is complete without turning compact list rows into cards.
