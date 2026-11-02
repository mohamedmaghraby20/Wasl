# 01: Image-led resource cards and event availability

**What to build:** Give visitors consistent image-bearing event and community cards throughout the app, with enough event participation information to distinguish available places, approval requests and waitlists. Use bundled illustrative covers, not a new upload workflow.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Labels:** ready-for-agent

- [ ] Audit all client event/community card presentations, including discovery and related collections, and give them consistent visible cover regions. Compact list rows may remain image-free; do not redesign their surrounding pages.
- [ ] Reuse suitable bundled community covers and select suitable bundled event assets with stable per-resource selection. Do not imply illustrative images depict actual activities, add image generation or implement uploads.
- [ ] Reserve image space, crop responsively and provide a graceful failure state that preserves titles, metadata and navigation. Decorative imagery does not repeat card content through alternative text.
- [ ] Event cards show title, organizer, date/time in Türkiye time, location or online status, category, accepted registration count and truthful availability. Existing community metadata remains intact; member-count enrichment belongs to ticket 04.
- [ ] Public event projections expose aggregate counts only, without registration identities or reliance on organizer-only endpoints. Regenerate affected API clients and mocks rather than editing generated output manually.
- [ ] Finite remaining capacity is the capacity minus accepted registrations, clamped at zero. Pending and waitlisted requests do not reserve places, and attendee-preview host adjustments do not reduce capacity.
- [ ] Full events remain discoverable and indicate waitlist availability. Approval-required registration never promises admission, and unlimited events do not show a fabricated finite remainder. Registration authorization and transactional enforcement remain unchanged.
- [ ] Focused public API and card tests cover accepted/pending/waitlisted registrations, host-count differences, full/unlimited/approval cases, cover failure and working card navigation.
- [ ] Verify representative card surfaces visually on mobile/desktop in Arabic RTL and English LTR, including readable availability and focus states. Record exact checks and any limitations.
