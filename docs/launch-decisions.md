# WASL — Launch Legal, Privacy & Age Decisions

**Version:** 0.2 (engineering handoff draft; 18+ product-policy update)  
**Prepared:** 2026-10-28  
**Approval status:** **NOT LEGALLY APPROVED — launch blocked pending counsel review**  
**Scope:** WASL MVP in Türkiye, with Arabic/English interfaces.  
**Product age decision:** 18+ for MVP, approved by project owner on 2026-10-28 (legal implementation pending).  
**Owner / legal approver / approval date:** `WASL product owner` / `PENDING` / `PENDING`

> **Instructions to coding agents:** This document is self-contained. Implement the **APPROVED PRODUCT REQUIREMENTS** and the **SAFE TECHNICAL FOUNDATIONS** below. Treat anything marked `LEGAL DECISION REQUIRED` as configuration or a blocked launch gate, not as permission to invent a policy. Do not publish draft legal notices as approved texts, do not activate unreviewed processing, and do not claim legal compliance from technical controls. Never hard-code an invented retention period or verification method.

## 1. Product scope and binding engineering rules

- WASL connects people in Türkiye with Communities, Events and Organizations. Visitors browse public content without logging in; joining/registering, messaging, content creation and reporting require personal User authentication.
- People have one personal User account; Organizations are managed by Users, not shared logins.
- MVP Communities are public. Events are public or unlisted; unlisted events are excluded from normal discovery, but accessible by direct URL. Account data, messages, moderation tools and private participant data are never public discovery content.
- MVP supports user profiles, public discovery, participation, approval and waitlists, Organization roles, realtime DMs/group chats, persistent discussion posts, in-app and transactional email notifications, and reporting/moderation.
- **Adults-only MVP:** registered users must be 18 or older. Under-18 users cannot register or access authenticated features; do not implement teen/guardian accounts for MVP. Age assurance and public-content safeguarding remain subject to legal review.
- Data minimization and privacy-by-default apply throughout the application. Only collect data necessary for an identified purpose; restrict access by resource/role and authenticate sensitive operations.
- Architecture: React client; NestJS/Fastify server authoritative for authorization/business rules; PostgreSQL/Drizzle hosted at Supabase; Supabase Auth and Storage; Stream for realtime messages (message bodies/history primarily in Stream); Resend for transactional email. Third-party provider access, retention and deletion must be included in privacy processing and requests.
- Arabic and English are launch languages; use understandable, accessible notices in both. Turkish localization can be added later, but Turkish legal-language requirements need counsel review.
- No marketing email/SMS, advertising, paid tickets, payments, subscription or monetization at MVP launch. Do not implement marketing consent as required for ordinary participation.
- Preserve necessary security/moderation evidence only where a documented legal basis and retention rule support it. Avoid irreversible hard deletes of resources with members, attendees or history.

## 2. Decision register — approved product direction vs legal gaps

| ID     | Policy item                          | Status                                                  | Decision / action                                                                                                                                                                                                                                                                                  |
| ------ | ------------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LEG-01 | Controller identity                  | LEGAL DECISION REQUIRED                                 | Record legal entity/person, registered address, contact email, and data-subject request address; never invent.                                                                                                                                                                                     |
| LEG-02 | Legal notices and lawful bases       | LEGAL DECISION REQUIRED                                 | Counsel must approve versioned KVKK notices, purpose-by-purpose Article 5/6 basis and recipient/transfer descriptions. Do not treat acknowledgment as consent.                                                                                                                                     |
| LEG-03 | Minimum age                          | APPROVED PRODUCT DECISION; LEGAL IMPLEMENTATION PENDING | **18+ only for WASL MVP**. Reject account creation for users under 18 and deny authenticated access to accounts found to be underage. Counsel must still confirm suitable age-assurance measures and applicable platform obligations. This supersedes the older conditional 15+ product direction. |
| LEG-04 | Ages 15–17                           | OUT OF SCOPE FOR MVP                                    | **Do not allow or build registration, teen profiles, guardian consent or parental controls for minors.** A future decision to admit minors requires new product approval and legal review. Safeguarding obligations for public content must still be assessed.                                     |
| LEG-05 | Age-verification method              | LEGAL DECISION REQUIRED                                 | Select a legally sufficient, proportionate method for enforcing **18+**; maintain only the minimum age-eligibility result/evidence necessary. Do not assume a self-declared checkbox meets every applicable requirement, or collect full birth dates, national IDs or identity scans by default.   |
| LEG-06 | Retention schedule                   | LEGAL DECISION REQUIRED                                 | Set category-specific durations, start events, exceptions, provider policies and deletion methods; no invented blanket 30/90/365-day schedule.                                                                                                                                                     |
| LEG-07 | Access, correction, export, deletion | APPROVED CAPABILITY; OPERATIONAL DETAILS OPEN           | Provide user-facing request submission and case handling. Define identity verification, scope, exceptions, completion and provider propagation before production.                                                                                                                                  |
| LEG-08 | Rights request response              | VERIFIED BASELINE                                       | Turkish KVKK data-subject applications ordinarily require controller response within **30 days**. Track due dates; counsel reviews method, identity and any applicable exceptions.                                                                                                                 |
| LEG-09 | UGC/copyright and 5651               | LEGAL DECISION REQUIRED                                 | Counsel approves notice-and-action/takedown, complaint intake, escalation and appeal procedures; evaluate classification as content/hosting/social-network provider.                                                                                                                               |
| LEG-10 | GDPR/EU                              | CONDITIONAL REVIEW                                      | Determine whether Article 3 territorial scope applies; do not assume Turkish residency alone settles this. If applicable, enable EU rights, notices, lawful bases, transfer mechanisms and other obligations.                                                                                      |
| LEG-11 | International data transfers         | LEGAL DECISION REQUIRED                                 | Map Supabase, Stream, Render, Resend, CDN, logs and subcontractors, regions and transfer pathways; approve Turkish KVKK Article 9 transfer mechanism and GDPR Chapter V if applicable **before live personal data transfers**.                                                                     |
| LEG-12 | VERBIS                               | LEGAL DECISION REQUIRED                                 | Counsel documents applicability and any exemption and registration obligations.                                                                                                                                                                                                                    |
| LEG-13 | Security incidents                   | LEGAL DECISION REQUIRED FOR DEADLINES                   | Maintain incident identification, containment, evidence and escalation. Counsel maps reporting obligations and timelines by regime.                                                                                                                                                                |
| LEG-14 | Transactional messaging              | APPROVED MVP LIMIT                                      | Service/participation/security notifications only via Resend; no promotional content or marketing automation.                                                                                                                                                                                      |
| LEG-15 | User account closure lifecycle       | APPROVED DESIGN DIRECTION                               | Disable account activity; resolve Organization ownership; archive/cancel resources when participant history exists; erase/anonymize where lawful, retain narrowly justified legal/security evidence. Exact periods pending.                                                                        |
| LEG-16 | Cookie/tracker use                   | LEGAL DECISION REQUIRED                                 | Inventory essential and nonessential browser storage and SDK tracking. Do not enable optional analytics/marketing trackers until applicable notice/consent requirements are met.                                                                                                                   |
| LEG-17 | OTT / communications                 | LEGAL DECISION REQUIRED                                 | Assess whether DMs and community/event messaging trigger Law 5809 classification/obligations before public messaging launch.                                                                                                                                                                       |

**Supersession note:** The 18+ restriction is an updated **product decision**, replacing the conditional 15+ policy recorded in the earlier WASL SRS; it does not imply legal approval or that age verification is optional.

**Legal age note (time sensitive):** Law No. 7578 was adopted in April 2026 and published 1 May 2026. Reporting on the related age-verification regulation describes a 1 November 2026 effective date and child-specific safeguards. Counsel must inspect the actual law, regulation, transitional deadlines, applicability to WASL, and treatment of 15–17 year olds immediately before deployment. Do not implement age rules solely from a news summary or older project planning notes.

## 3. Required notices and records

Create the following **versioned document slots**; do **not** populate with fabricated controller information or automatically publish drafts:

| Document                                                                 | Required material                                                                                                                                                                  | Status                          |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `privacy-notice-tr.md` / `privacy-notice-ar.md` / `privacy-notice-en.md` | Controller/contact; data categories; processing purposes and lawful bases; recipients/processors; transfers; retention criteria; data subject rights and requests; changes/version | LEGAL TEXT REQUIRED             |
| `terms-of-use-*.md`                                                      | Eligibility/age; conduct; user-posted content rights; reporting, removal and appeal; account closure; organizer responsibilities                                                   | LEGAL TEXT REQUIRED             |
| `age-eligibility-policy-*.md`                                            | Adults-only 18+ terms, age-check explanation, rejection and appeal/support path                                                                                                    | LEGAL TEXT REQUIRED             |
| `cookie-notice-*.md` (if applicable)                                     | Actual cookies/SDK storage; purposes, durations, recipients; preference/withdrawal controls                                                                                        | INVENTORY + LEGAL TEXT REQUIRED |
| `takedown-procedure.md`                                                  | Intake, supporting evidence, notices, internal decision, urgent escalation, appeal, evidence retention                                                                             | LEGAL PROCEDURE REQUIRED        |
| `processor-transfer-register.md`                                         | Processor, purpose, category, country/region, subprocessor, contract and transfer mechanism                                                                                        | REVIEW REQUIRED                 |
| `retention-schedule.md`                                                  | Per-category trigger, duration, deletion/anonymization method, exceptions, provider propagation                                                                                    | REVIEW REQUIRED                 |

**Acknowledgment vs consent:** Record acceptance of applicable Terms/notice presentation with `document_type`, `version`, `user_id`, `timestamp` and minimal evidence only where needed. Do not claim a privacy notice creates a lawful processing basis. Use separate, affirmative, withdrawable consent records only where counsel determines consent is required (for example, optional nonessential cookies/marketing if later introduced). No prechecked marketing boxes.

## 4. Retention schedule — decision template (no durations invented)

| Data group                                     | Trigger / scope                     | Duration    | Handling / exception                                                                                    | Owner              |
| ---------------------------------------------- | ----------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------- | ------------------ |
| User credentials, auth provider records        | Registration / account closure      | `TBD-LEGAL` | Coordinate Supabase Auth closure; retain no unnecessary tokens                                          | Identity           |
| Public profile and preferences                 | Active account / deletion request   | `TBD-LEGAL` | Delete/anonymize subject to justified exceptions                                                        | Identity           |
| Age eligibility status/evidence                | Verification / expiration           | `TBD-LEGAL` | Prefer adult eligibility (`18_PLUS` / `UNVERIFIED` / `UNDER_18`) without full birth date or raw ID copy | Identity           |
| Terms acceptance and consent history           | Acceptance / withdrawal             | `TBD-LEGAL` | Preserve necessary minimal evidence                                                                     | Compliance         |
| Membership, registration and attendance        | Participation end / account closure | `TBD-LEGAL` | Preserve counts/integrity without exposing deleted user                                                 | Participation      |
| User-authored communities, events and media    | Archive/cancel/closure              | `TBD-LEGAL` | Prefer archive/cancel for resources with history; review ownership                                      | Communities/Events |
| Discussion posts/replies                       | Deletion, moderation or closure     | `TBD-LEGAL` | Anonymize/delete as approved; preserve narrowly justified evidence                                      | Discussions        |
| Stream DMs/group messages and attachments      | Message removal/account closure     | `TBD-LEGAL` | Configure Stream retention/deletion and reconcile Wasl IDs                                              | Messaging          |
| Reports, moderation actions, security evidence | Case closure                        | `TBD-LEGAL` | Restrict access; preserve only justified evidence                                                       | Moderation         |
| Email/notification delivery logs               | Delivery / account closure          | `TBD-LEGAL` | Minimize message content and provider metadata                                                          | Notifications      |
| Operational logs, backups                      | Creation / rotation                 | `TBD-LEGAL` | Set rotation and restore-based deletion policy                                                          | Operations         |
| Privacy requests and decisions                 | Case completion                     | `TBD-LEGAL` | Retain minimal auditable response evidence                                                              | Compliance         |

**Agent rule:** Implement `retention_policy` configuration, records and job interfaces if necessary, but do not enable automatic irreversible erasure until the corresponding period and exception logic are signed off. Do not silently convert `TBD-LEGAL` to a numeric default. Securely handle deletion requests in a queue/manual review until rules are approved.

## 5. Privacy rights: required implementation workflow

1. Provide an authenticated account/settings entry for access, correction, export and deletion requests, plus a verified non-login contact path where necessary.
2. Capture request type, time, verified requester, target records, status and audit history; never expose another person's data in an export.
3. Accept and acknowledge requests, calculate legal due dates and provide administrator review/escalation capability. For Turkish KVKK requests, track the 30-day response baseline.
4. Allow **secure export** of Wasl-owned profile, participation, discussions and other applicable personal data in a common machine-readable format where the applicable right requires it. Assess whether/how Stream and other providers contribute to the export.
5. For deletion: suspend new activity; resolve Organization ownership; archive/cancel resources with participation history as appropriate; delete/anonymize permissible data across Wasl, Supabase Auth/Storage, Stream and Resend where applicable; retain only separately justified exceptions.
6. Record each processor action, response and failure; retry or flag incomplete provider actions rather than reporting success prematurely.
7. Send a final response explaining completion, remaining lawful exceptions or refusal grounds after review; expose no sensitive details in email notifications.
8. Test account ownership dependencies, unauthorized request attempts, partial provider failure, repeated requests, backups and restore paths.

## 6. Adults-only (18+) age-eligibility implementation

- **Binding MVP product policy:** WASL is strictly **18+** for account registration and all authenticated features. This supersedes the earlier conditional 15+ direction.
- Permit anonymous public browsing only under the public-content access policy; do not provide registration, joining, event sign-up, creation, DM, group chat, reporting or other authenticated actions to under-18 users.
- Implement a server-enforced age-eligibility gate for registration/onboarding and protected operations; client-side UI checks alone are insufficient.
- Model minimal eligibility states such as `UNVERIFIED`, `18_PLUS`, and `UNDER_18` (names may match existing schema). Do not treat unverified accounts as age-eligible for protected actions once the policy is enforced.
- On an under-18 determination, stop account activation or restrict existing account access; provide a safe review/support process. Avoid disclosing personal verification evidence to other users.
- Do not build 15–17-specific roles, guardian identity collection, guardian consent or parental controls in the MVP.
- Do not store full birth dates, Turkish identity numbers or document scans unless a legally reviewed age-assurance method specifically requires them. Do not log sensitive verification inputs.
- **Still requires legal approval:** Determine an acceptable verification method, evidence retention, privacy notice, vendor/transfers if used, handling of false positives, and any mandatory platform-specific obligations. A self-reported age or checkbox is not automatically sufficient.
- Add tests covering under-18 rejection, unverified restrictions, adult success, bypass attempts through direct API calls, and revocation of underage accounts.
- Do not launch age-gated account creation until the method and legal text are approved. An 18+ rule does not replace moderation, protection of public content, KVKK, 5651 or other legal obligations.

## 7. Reports, user content and takedown

- Provide reports for users, communities, events, discussions, messages (via authorized provider interfaces where needed) and alleged copyright violations.
- Restrict report evidence and moderation notes to authorized reviewers. Keep platform moderation role separate from community/event moderator scope.
- Support states: received, under review, actioned, rejected and appealed if the approved procedure requires appeal.
- Support content hiding/restriction and archive/cancel lifecycle actions; do not erase relevant evidence prematurely.
- Log actor, rationale, time, resource, action and minimal evidence reference; never put message bodies, credentials or identity-document scans in generic audit logs.
- Implement urgent abuse escalation and legally mandated response/takedown timing only after the policy is approved; avoid invented deadlines.

## 8. Provider and cross-border review (mandatory before production data)

Complete a transfer map for:

- **Supabase**: database, authentication, storage, queues, backups and project region.
- **Stream**: real-time message bodies, attachments, participants, metadata and hosting region.
- **Render**: API hosting, static frontend, logs, operational telemetry and region.
- **Resend**: recipient addresses and transactional email contents/metadata.
- **Other SDK/CDN/analytics** actually installed: cookies, IPs, identifiers, region, subprocessors.

For each, record processing purposes, data subjects, category, lawful basis, processor terms, physical location/transfer, controls, deletion/incident obligations, and counsel-approved transfer instrument. Do not assume a Türkiye-hosted API eliminates transfers elsewhere. Block production use where a required transfer mechanism remains unresolved.

## 9. Release blocking checklist

- [ ] Controller legal identity/contact and rights contact approved.
- [ ] Privacy notices/Terms approved in required languages, with version/hash and publication dates.
- [ ] Personal-data inventory, lawful bases, processor/transfer map and applicable agreements reviewed.
- [ ] KVKK cross-border transfer mechanism, VERBIS applicability, retention and rights procedure approved.
- [ ] 5651/age-rule applicability, legally sufficient 18+ age-assurance method and OTT messaging classification signed off.
- [ ] UGC/copyright notice-and-takedown, reporting and escalation procedure approved.
- [ ] User-facing rights workflow and secure export/deletion processing tested.
- [ ] Provider-side data removal and privacy-request failure/retry paths tested.
- [ ] Required security controls, moderation access, incident procedures and auditability verified.
- [ ] Legal approver, approval date, reviewed legislation date and policy versions recorded here.

**Do not mark Tasks 147–149 as legally complete solely because code builds or tests pass.** They need approved policy inputs and verified launch procedures.

## 10. Approval record (must be filled by actual responsible parties)

| Role                             | Name / organization            | Date      | Policy version | Decision               |
| -------------------------------- | ------------------------------ | --------- | -------------- | ---------------------- |
| WASL product owner               | `PENDING`                      | `PENDING` | 0.2            | Pending review         |
| Turkish legal counsel            | `PENDING`                      | `PENDING` | 0.2            | Pending review         |
| EU counsel (only if applicable)  | `PENDING / N/A WITH RATIONALE` | `PENDING` | 0.2            | Pending scope decision |
| Engineering implementation owner | `PENDING`                      | `PENDING` | 0.2            | Pending verification   |

## 11. Research and project provenance (for owner; not an external dependency for agent)

Project rules above were extracted from WASL's approved Notion **SRS**, **PRD**, **Domain & Data Design**, **Functional Requirements & Use Cases**, and **Implementation Planning**, reviewed 2026-10-28, with the product owner’s subsequent 18+ MVP decision taking precedence over older 15+ planning. This file intentionally contains actionable requirements rather than telling the coding agent to read Notion.

Primary public legal references checked 2026-10-28:

- Turkish Parliament, Law No. 7578: https://www.tbmm.gov.tr/Yasama/Kanun/5F9CED52-3776-46E4-BE23-019CB8DA2666
- KVKK, controller response to data subject requests: https://www.kvkk.gov.tr/Icerik/2063/Sikayet-Hakki
- KVKK, international transfers: https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim
- Age-regulation reporting (secondary; counsel must confirm primary regulation text): https://www.cumhuriyet.com.tr/turkiye/sosyal-medyada-15-yas-siniri-yeni-yonetmelik-resmi-gazete-de-yayimlandi-2545289

These sources support legal review; they do not substitute for qualified counsel's applicability determination.
