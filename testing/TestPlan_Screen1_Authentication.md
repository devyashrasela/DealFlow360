# Test Plan — Screen 1: Authentication & Identity Resolution

**Product:** DealFlow360
**Source:** Authentication spec (Executive Summary, Epics 1–5, Sections 5–6)
**Scope note:** This is the highest-priority test plan in the whole product. Every other screen's access control (internal vs. customer, role scoping, multi-tenant isolation) depends on this layer being correct. A bug here is a security incident, not a UI bug.

---

## 1. Test Scope

Covers: login (dual identifier formats), session/token behavior, post-login routing, relationship/onboarding invitations, contextual authorization (RBAC + ABAC), quotation-state audit logging as it relates to identity, and all 10 documented edge cases (identity collisions, tenant leakage vectors, lifecycle interruptions, concurrency races).

Out of scope for this plan: quotation business logic itself (covered in Screen 4/17/18 test plans) — only tested here insofar as it intersects with auth/redaction.

---

## 2. Preconditions / Test Data Setup

- At least 2 distinct provider organizations (e.g., "Acme" as provider) and 2+ customer organizations, with an `organization_relationships` record linking them.
- Users with overlapping `employee_id` across different orgs (for Edge Case 1).
- One user (Carol) holding memberships in two different provider orgs (for Edge Case 2).
- One user (Dave) with an existing account being invited into a second organization (for Edge Case 3).
- A Sales Rep with `scope_type = 'assigned_only'` and only partial relationship assignments (for ABAC tests).
- A quotation in `sent` status with a customer session actively viewing it (for concurrency tests).

---

## 3. Test Cases — Multi-Format Authentication (FR-1.1)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| AUTH-01 | Standard email login | Log in with `jane.doe@example.com` + correct password | Authenticates successfully | Must |
| AUTH-02 | Scoped tenant identifier login | Log in with `EMP-1042.acme` + correct password | Authenticates successfully, scoped to `acme` org | Must |
| AUTH-03 | Wrong password, either format | Submit valid identifier, wrong password | Rejected with generic error (no hint whether identifier or password was wrong) | Must |
| AUTH-04 | Password hashing verification | Inspect stored credential (via DB, not UI) | Password stored as Argon2id hash, never plaintext or reversible encoding | Must |
| AUTH-05 | Cross-org identifier collision | See Edge Case 1 table below | Correct org-scoped user resolved, not the other org's identically-numbered employee | Must |

---

## 4. Test Cases — Session & Token Strategy (FR-1.2)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| AUTH-06 | Access token expiry | Log in, wait 15+ minutes, make an API call using the original access token | Token rejected as expired; refresh flow required | Must |
| AUTH-07 | Token payload minimalism | Decode issued JWT | Contains only `user_id` and `session_id` — no roles, no org list, no permissions baked in | Must |
| AUTH-08 | Dynamic permission evaluation | Grant a user a new role/membership mid-session (without logging out), then make an API call | New permission takes effect on the very next request — not just at next login | Must |
| AUTH-09 | Immediate revocation propagation | Revoke a user's membership/role while they hold a valid (non-expired) access token, then retry an action requiring that permission | Action is denied immediately, despite the access token itself still being technically unexpired | Must — this is the core promise of "dynamic evaluation" and must be verified, not assumed |
| AUTH-10 | Refresh token rotation | Use a refresh token to get a new access token, then attempt to reuse the same (now-rotated) refresh token again | Second use of the old refresh token is rejected | Must |
| AUTH-11 | Session table persistence | Log in, inspect `sessions` table | New row created reflecting the session; logging out or revoking removes/invalidates it | Should |

---

## 5. Test Cases — Smart Post-Login Routing (FR-1.3)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| AUTH-12 | Single provider membership | Log in as a user with exactly 1 provider membership | Redirected directly to `/:providerSlug/dashboard` | Must |
| AUTH-13 | Single customer relationship | Log in as a user with exactly 1 customer membership and 1 active provider relationship | Redirected directly to `/:providerSlug/:customerSlug/dashboard` | Must |
| AUTH-14 | Multiple memberships | Log in as a user with 2+ memberships/relationships (e.g., Carol from Edge Case 2) | Workspace & Portal Selector is shown — not an arbitrary/first-match redirect | Must |
| AUTH-15 | Zero memberships | Log in as a user with no active memberships at all (edge case not explicitly in spec — worth testing) | Should show a clear "no access" state, not a crash or blank redirect loop | Should — flag as an open question if this state isn't designed yet |

---

## 6. Test Cases — Relationship Lifecycle & Onboarding (FR-2.1, FR-2.2)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| AUTH-16 | Link existing organization by tax ID | Provider searches for a prospective customer using a tax identifier that matches an existing org | Existing `organization_id` is linked via a new `organization_relationships` record — no duplicate org created | Must |
| AUTH-17 | Create new organization | Provider searches for a customer with no matching tax ID/legal name | New `organizations` record created with status `active` | Must |
| AUTH-18 | Invitation token expiry | Generate a customer admin invitation, wait past 72 hours, attempt to accept | Invitation rejected as expired | Must |
| AUTH-19 | Invitation token hashing | Inspect invitation token storage (DB level) | Token stored as SHA-256 hash, not plaintext | Must |
| AUTH-20 | Invitation acceptance — new user | Accept invitation as a brand-new email | Prompts for full name + password, creates `users` record, links `organization_memberships`, invitation flagged `accepted` | Must |
| AUTH-21 | Invitation acceptance — existing user (Edge Case 3) | See dedicated edge case table below | No duplicate user created; new membership linked to existing `user_id` | Must |

---

## 7. Test Cases — Contextual Authorization / RBAC + ABAC (FR-3.1, FR-3.2)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| AUTH-22 | Valid token, valid context | Access `/acme/dashboard` with a valid token belonging to an Acme member | Access granted | Must |
| AUTH-23 | Invalid/inactive slug | Access `/nonexistent-org/dashboard` | Rejected — org doesn't exist or isn't active | Must |
| AUTH-24 | No membership in target org | User authenticated but with zero membership in the org referenced by the URL slug | `403 Forbidden` | Must |
| AUTH-25 | ABAC — assigned-only rep, in-scope relationship | Rep with `scope_type = 'assigned_only'` accesses a relationship they ARE assigned to | Access granted | Must |
| AUTH-26 | ABAC — assigned-only rep, out-of-scope relationship | Same rep accesses a relationship they are NOT assigned to (see Edge Case 4 below) | `403 Forbidden`, and the underlying DB query for the record must never execute | Must |
| AUTH-27 | Customer auto-scoping | Customer user accesses a relationship where their org is the `customer_org_id` | Automatically authorized, no explicit assignment record needed | Must |
| AUTH-28 | Customer accessing unrelated relationship | Customer user attempts to access a relationship belonging to a different customer org entirely | Denied (404 per Edge Case 5 pattern, not 403) | Must |

---

## 8. Test Cases — Quotation Redaction Layer (FR-4.2) — Auth-Adjacent

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| AUTH-29 | Customer payload redaction | Fetch a quotation as a Customer User | Response never contains `unit_cost`, `cost_total`, `line_margin`, `margin_total`, `internal_notes`, or `approvals.rejection_reason`, even in nested/raw form | Must — critical security test |
| AUTH-30 | GraphQL/dynamic field injection attempt (Edge Case 6) | As a customer user, craft a request explicitly requesting banned fields by name | Request is rejected or silently strips those fields — whitelist enforcement, not blacklist | Must |
| AUTH-31 | Internal payload — no redaction | Fetch the same quotation as an internal Sales Rep with correct scope | Full internal fields ARE present (margin, cost, etc.) — confirms redaction is role-conditional, not a blanket removal that would break internal views | Must |

---

## 9. Dedicated Edge Case Test Matrix

| Edge Case | ID | Test | Expected Result |
|---|---|---|---|
| **1. Cross-org employee ID collision** | AUTH-EC1 | ACME assigns `EMP-01` to Alice; Example Ltd assigns `EMP-01` to Bob. Log in as `EMP-01.acme` | Resolves to Alice only, using the composite `UNIQUE(organization_id, employee_id)` constraint and slug-scoped lookup — never resolves to Bob |
| **2. One user, multiple internal personas** | AUTH-EC2 | Carol logs in via `carol@consulting.com`, then navigates to `/acme/dashboard` | Only ACME's `organization_memberships` role applies; her Globex permissions are completely ignored for this request, even though it's the same underlying user |
| **3. Invitation to existing user** | AUTH-EC3 | Dave (existing ACME user) is invited by Example Ltd as Customer User via `dave@acme.com` | Prompted for existing credentials; new `organization_memberships` row added under Example Ltd; `user_id` reused, no duplicate `users` record |
| **4. URL manipulation / BOLA-IDOR** | AUTH-EC4 | ACME rep assigned only to Example changes URL from `/acme/example/quotes/Q-100` to `/acme/beta/quotes/Q-200` | Middleware aborts with `403 Forbidden` before any DB query for the quote itself executes |
| **5. Direct resource ID injection** | AUTH-EC5 | Authenticated user requests `GET /api/v1/quotes/{uuid}` for a quote belonging to a relationship outside their context | Server returns `404 Not Found` — explicitly NOT `403`, to avoid confirming the resource exists (enumeration protection) |
| **6. Malicious field reflection** | AUTH-EC6 | Same as AUTH-30 above | Whitelist-only serialization blocks banned fields regardless of how the request is crafted |
| **7. Relationship terminated mid-negotiation** | AUTH-EC7 | ACME terminates relationship with Example while an Example user has an open quote review in progress; that user submits a negotiation action | `409 Conflict: Commercial relationship is inactive`; user redirected to read-only historical archive |
| **8. Org suspended with active data** | AUTH-EC8 | Example Ltd's org status is set to `suspended`; either party attempts any action on that relationship | Access immediately refused for both parties on that relationship context; historical data remains intact, no deletion |
| **9. Concurrent double confirmation** | AUTH-EC9 | Two Example Ltd users click "Accept" on the same quote (`Q-100`) at the same time | Exactly one request succeeds and converts to an order (optimistic concurrency `UPDATE ... WHERE status IN (...) RETURNING id`); the second gets `409 Conflict: Quote has already been accepted` |
| **10. Rep edits while customer reviews** | AUTH-EC10 | Sales Rep modifies quote line items while a customer has the same quote open in `sent` status | Quote forks into a new draft version; customer's ability to accept the now-outdated version is revoked |

---

## 10. Non-Functional / Performance Test Cases

| ID | Test | Expected Result |
|---|---|---|
| AUTH-NFR1 | Load test the authorization guard pipeline under concurrent requests | Contextual authorization/permission checks execute in under 15ms per the spec |
| AUTH-NFR2 | Measure overall API P95 latency for a contextual route (e.g., dashboard load) | Under 120ms P95 |
| AUTH-NFR3 | Verify composite indexes exist | `(employee_id, organization_id)`, `(provider_org_id, customer_org_id)`, and `(relationship_id, status)` are covered by B-Tree indexes — check via query plan (`EXPLAIN`), not just schema inspection |

---

## 11. Audit Trail Test Cases (FR-5.1)

| ID | Test | Expected Result |
|---|---|---|
| AUTH-32 | Membership status change (invite, suspend, role change) | Generates an `audit_logs` entry with `actor_user_id`, `actor_membership_id`, `ip_address`, `payload_before`, `payload_after` |
| AUTH-33 | Relationship status mutation (activate/suspend/terminate) | Same audit fields captured accurately |
| AUTH-34 | Quotation state machine transition | Every transition (`draft` → `pending_approval` → `sent` → `negotiating` → `accepted`) is logged individually, not just the final state |
| AUTH-35 | Manual margin override / approval decision | Logged with full before/after payload, not just a boolean "approved" flag |

---

## 12. Priority Summary for Judges/Demo

If time is short before the hackathon demo, the tests that matter most to prove the "self-governing, zero-leakage" pitch are: **AUTH-09** (revocation propagation), **AUTH-26** (ABAC scope enforcement), **AUTH-28/AUTH-EC5** (404-not-403 enumeration protection), **AUTH-29/30** (redaction layer), and **AUTH-EC9** (concurrency race). These are the ones most likely to be shortcut under time pressure, and most damaging if wrong.
