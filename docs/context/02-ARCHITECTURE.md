# Wasl — Architecture Context (Batch 01)
Source: Approved [System Design & Architecture](https://app.notion.com/p/3f0578fa294481b183a6d61de81b0c47). See [Implementation Planning](https://app.notion.com/p/3f8578fa29448119ac8ed52270c10be9) for later module-ownership details.

**Document role:** Who owns decisions/data, how components communicate, and which boundaries are protected. Condensed; no assumption that today's local repository already implements it.

## One backend, multiple clients
The React web app and a future mobile client use a shared REST/JSON API. Browser and mobile display and interact; **NestJS is authoritative for business rules, authorization, and concurrency-sensitive state changes**. Public reads can happen without sign-in; protected actions are checked server-side.

## Modular monolith
Start with **one deployable NestJS server**, not microservices. Inside it, organize business capabilities as modules:
- **Identity & Profiles:** Wasl Users and public/private profiles, separate from the Supabase authentication identity.
- **Organizations:** Organization roles, delegation, verification, ownership transfers.
- **Communities:** Community details, ownership, public lifecycle and organizers.
- **Events:** Event details, hosts, visibility, cancellation and lifecycle.
- **Participation:** Memberships, registrations, admission/approval, waitlists, capacity and transitions.
- **Discovery:** Read-oriented search/results; does not mutate source resources.
- **Messaging:** Stable Wasl conversations/IDs and Stream-specific mappings, access and synchronization.
- **Discussions:** Native Event comments and Community topics/replies, moderation and authorization.
- **Notifications:** In-app/email delivery and delivery records.
- **Moderation/Administration:** Reports, restrictions and audit references.

## Boundary rules
1. **Owning module writes its own data.** Other modules do not import its internal repositories, ORM models or directly mutate its tables.
2. **Cross-module collaboration uses narrow public application contracts.** In-process method calls now, network APIs only if actually extracting services later.
3. **Dependency direction:** domain/business decisions do not directly import HTTP frameworks, database adapters or vendor SDKs.
4. **Ports/adapters where meaningful:** vendor dependencies (Stream, Supabase Auth/Storage, Resend) stay localized in the owning feature. Don't wrap trivial utilities solely to create patterns.
5. **Stable Wasl IDs:** vendor IDs belong to adapter-owned mappings, not core resource identity.

## Request example: Join Event
React → HTTP endpoint/controller → Participation application operation → Events public contract for Event state → authoritative authorization/capacity check → PostgreSQL transaction → accepted/pending/waitlisted result → JSON response → React.

Only the server decides registration. It must guard concurrent final-seat requests with transactions/appropriate locking and avoid double registration.

## Realtime vs durable discussions
Stream Chat supplies real-time DMs, Community and Event chats. Wasl controls chat eligibility (members/attendees/roles/blocks), secure token issuance and provider-side access changes. Membership revocation must propagate even if a provider call fails, with appropriate retry/reconciliation.

Event comments and Community discussions are **not** Stream data; they're Wasl-owned PostgreSQL records. Don't merge these features.

## Reliability, privacy, scaling
- Validation and contextual authorization at every protected server operation.
- Handle retries, timeouts, duplicate requests and failed providers; slow secondary notifications can be asynchronous.
- Sensitive media stays private; minimize personal data; avoid leaking secrets and logs.
- PostgreSQL is the authoritative store for participation/permissions; stale caches cannot authorize or allocate seats.
- Scale later based on evidence; no Kubernetes, Kafka, independent microservices or Redis cache by default.
- Respect bilingual Arabic/English requirements and RTL on the web side.

## What a beginner should remember
**Module** = one business responsibility. **Boundary** = what other modules are permitted to access. **Contract** = an allowed operation/data shape. **Adapter** = the replaceable technological implementation of a capability.

## For Codex
Do not create empty full-domain module trees to look professional. Implement only the actual microtask's relevant boundary and verification check. Explain any abstractions introduced.
