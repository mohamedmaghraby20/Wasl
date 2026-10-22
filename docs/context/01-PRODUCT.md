# Wasl — Product Context (Batch 01)
Source: Approved [PRD — MVP](https://app.notion.com/p/3ef578fa294481b596e9ca7bd1c138fd). Subsequent discussion policy: [Implementation Planning](https://app.notion.com/p/3f8578fa29448119ac8ed52270c10be9).

**Document role:** What the product does, NOT how the backend is implemented. This is a curated summary; consult the source for requirement IDs, edge cases and full acceptance criteria.

## Purpose and audience
Wasl is a nationwide Community and Event participation platform for Arabs in Türkiye. First priority: Arab university students, but the product also serves professionals, families, organizers, associations and organizations. It is not restricted to Istanbul.

Primary journey: **Discover → Evaluate → Join/Register → Admission → Participate → Manage → Communicate**.

The MVP is intentionally a *hybrid*: a useful product journey plus challenging but valuable engineering (permissions, capacity/waitlists, real-time chat, notifications).

## Users, hosts and visibility
- Visitors browse public Communities and public Events and read details without signing in. Actions require authentication.
- One person has one User identity, even when acting as organizer or Organization admin.
- Any registered User can create a Community or independent Event.
- A Community can be owned by a User or an Organization; all MVP Communities are public.
- Events may be hosted by a User, a Community or an Organization; Events may be **Public** or **Unlisted**. Unlisted Events are accessible by direct link but excluded from normal discovery.
- An Organization is a separate business entity managed by personal Users. It has one transferable Owner, may have Admins and a Pending/Verified/Rejected trust status.

## Communities, Events and Participation
- Communities and Events have public details, identity/host, category, location context, and admission configuration; Events additionally have date/time, status and optional capacity.
- Admission modes: instant/open, manual approval, or automatic acceptance while capacity remains.
- Community states: Pending, Waitlisted, Active, Rejected, Left, Removed.
- Event states: Pending, Waitlisted, Accepted, Rejected, Cancelled by User, Removed by Organizer, Attended, No-show.
- Full eligible resources use a waitlist. For **open/automatic** admission, promote in queue order when capacity opens. For **manual** admission, organizer approval/selection remains authoritative, including waitlist promotion.
- Waitlisted and Pending users do **not** gain Active/Accepted privileges. Capacity must never be exceeded.
- Organizers can review/approve/reject/remove, configure admission and capacity, manage moderation; can manually mark event attendance.
- Prefer Archive/Cancel over destructive deletion once participants exist. Canceled Events remain clearly viewable; archived Communities leave discovery.

## Search, chat, discussions, notifications
- Keyword search and practical city/location, category and Event date filters; public browsing nationwide. Unlisted Events stay out of public search.
- Real-time Community chat is for Active members and authorized organizers/moderators. Event chat is for Accepted attendees and authorized organizers/moderators. Direct Messages are for authenticated users with block/report controls.
- Event comments/replies and Community topics/replies are **native Wasl content in PostgreSQL**, not Stream chat. One reply nesting level in MVP.
- **Later approved discussion decision (Implementation Planning):** public resource discussions are publicly readable; Unlisted Event discussions are reachable through the unlisted Event URL, not discovery. Posting Community topics/replies requires Active membership or organizer authorization. Event commenting/reply requires Accepted attendance or organizer authorization. Excluded states cannot post. Closed threads and archived/canceled resources are read-only to ordinary users.
- Important outcomes produce in-app and email notices: admission decisions, waitlist promotion, event cancellation, removal, admin invitations and key verification changes. Lower-priority chat activity may be in-app only.

## Scope intentionally excluded from MVP
Paid events, tickets and QR check-in, advanced AI personalization/recommendations, newcomer guides, private Communities, advanced roles, enterprise analytics, push notifications, ratings, subscriptions and advanced monetization.

## What a beginner should remember
An **Event** is an entity. A **registration state** is a lifecycle. A **capacity rule** is a business invariant. The server, not React, must enforce that invariant.

## For Codex
Do not generate features from this summary alone. Consult the specific microtask's exact acceptance criteria. Do not implement the entire MVP while fixing repository foundations.
