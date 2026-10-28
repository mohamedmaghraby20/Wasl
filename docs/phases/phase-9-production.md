# Phase 9 — Production setup and operation

**Status:** planned; no production target is confirmed and no public deployment is authorized.

Production means the real public service. Keep it separate from the connected development project, which contains fake sample data and is used for testing.

## Current blockers found

- The local `client/.env.production` and `server/.env.production` point to the same Supabase project used for development. Do not deploy with these values.
- `server/.env.production` does not set `CLIENT_ORIGIN`; production validation falls back to the local address and rejects startup.
- The built client currently includes the development Supabase address. No production website/API address is configured.
- The client has no production API address. A hosted static site needs a configured API address or an explicit host rule that sends `/api` requests to the Nest service.
- There is no Render configuration, no GitHub Actions workflow, and no Git remote in this checkout.
- Resend has no verified domain. A test sender worked for development email only.
- The development project was reported to have leaked-password protection disabled.
- Privacy, age, consent, retention, deletion, support, budget, and performance decisions still need owner/reviewer approval.
- A database password was exposed in a tool result during review. Reset it in Supabase and update the ignored development `server/.env` before continuing to use it.

## Task plan

| Task                            | Who leads                               | Work                                                                                                                                                                                                                                                                   | Completion check                                                                                                                  |
| ------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 165. Approve decisions          | Owner                                   | Choose the domain, hosting account and spending limit, support contact, legal/privacy rules, expected traffic, acceptable page wait, and recovery goals.                                                                                                               | Decisions and qualified legal/privacy approval are recorded.                                                                      |
| 166. Create production services | Owner + agent                           | Owner confirms accounts, region, and spending; agent prepares separate Supabase, Render client/API, Resend, and Stream settings. For email, agent can add the domain and provide DNS records; owner or DNS provider adds them and chooses a sender after verification. | Production services are isolated from development; Resend shows the production domain as verified.                                |
| 167. Secure production settings | Agent; owner supplies/enters secrets    | Set production website/API origins, Auth redirects, Storage rules, email sender, admin access, and private server secrets. Owner enters secrets in provider settings, not chat.                                                                                        | The server starts in production mode; the client points only to production; secrets stay server-side; sample seeding is disabled. |
| 168. Prepare production data    | Agent; owner approves target and timing | Review migrations and backups; apply only reviewed migrations and approved reference data.                                                                                                                                                                             | Production schema and access controls are checked; fake sample users/content are absent.                                          |
| 169. Release to production      | Owner approves; agent deploys           | Promote the exact staging-tested build during an approved release window.                                                                                                                                                                                              | Public, sign-in, one authorized action, email, and chat checks pass; rollback steps are ready.                                    |
| 170. Make go/no-go decision     | Owner                                   | Review legal approval, safety checks, support, backup, and release evidence.                                                                                                                                                                                           | Owner records launch approval or a no-go decision.                                                                                |
| 171. Operate after launch       | Named support owner + agent             | Watch service health, email/chat delivery, backups, security updates, and user reports; record incidents and fixes.                                                                                                                                                    | A named person can respond, pause service, or roll back; recovery checks continue.                                                |

## Order and safety rules

1. Finish the existing pre-production and staging gates before this phase begins.
2. Do not create billable services until the owner confirms the account and spending limit.
3. Do not point production at the development Supabase project.
4. Do not copy fake development records into production.
5. Back up before production database changes. Review each migration and verify the target twice.
6. Keep production deploys manual until the owner approves an automatic release process.
7. Never perform load tests or restore practice against production.
8. The owner, not the agent, makes legal decisions and the final launch decision.

## Connections needed

- The current Supabase connection can work with the development database. Creating a production project or changing its Auth dashboard settings needs the owner dashboard or an authorized Supabase project-management connection.
- Resend is connected and can provide domain/DNS records. The owner must control the domain and add the records, unless an authorized DNS connection is added.
- Render and GitHub are not connected. An authorized connection can help create hosting services, protected environment settings, and CI/CD; account, budget, and production-release approval remain with the owner.
