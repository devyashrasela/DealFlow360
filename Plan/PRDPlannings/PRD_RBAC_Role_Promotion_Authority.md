# PRD — Role-Based Access Control (RBAC) & Role Promotion Authority

**Product:** DealFlow360
**Module:** Team & Role Management (proposed as a new backend config screen — "Screen 19: Team & Roles")
**Related modules:** Authentication (Screen 1), all role-scoped screens across the platform

---

## 1. What RBAC Actually Is (Quick Primer)

Role-Based Access Control is a security model where **permissions are attached to roles, not directly to individual people**. A person gets permissions by being assigned a role; when their role changes, their permissions change automatically — nobody has to go update a dozen individual permission checkboxes.

Two ideas sit on top of plain RBAC in a real system like this one:

- **Scope**: a role only means something *within a context*. "Sales Manager" isn't a global label on a person — it's a label on their **membership in one specific organization**. The same person could be a Sales Manager at Company A and have no role at all at Company B.
- **Authority over roles themselves**: RBAC isn't just "what can this role do in the app" — it also has to answer "who is allowed to change what role someone else holds?" That second question is what this PRD is actually about. Without it, RBAC only controls day-to-day actions, not the far more sensitive action of handing someone new power.

This PRD defines that second layer: **who has the authority to promote, demote, or otherwise change a person's role within an organization**, and how that's enforced, audited, and tested.

---

## 2. Core Principle (Answering Your Question Directly)

**Only an Admin of a given organization can change role assignments within that organization.** This is a strict, non-negotiable rule:

- A Sales Manager cannot promote a Sales Rep to Manager, even within their own team.
- A Sales Rep cannot do anything role-related at all.
- Finance/Ops cannot grant themselves or anyone else additional roles.
- **Admin is the only role with the authority to change any membership's role within that specific organization** — including promoting a Customer Portal User into an internal role (e.g., if a customer's employee is hired by the provider company and needs to become a Sales Rep), demoting a Manager back to Rep, or removing someone's access entirely.
- Critically: an Admin's authority is **scoped to their own organization only**. An Admin at Company A has zero authority to change anyone's role at Company B, even if that same person happens to also be a member of Company B. This follows directly from the "role is per-membership, not global" model established in the Authentication spec.

---

## 3. Role Hierarchy & Definitions

| Role | Scope | Can this role change ANYONE's role? |
|---|---|---|
| **Admin** | Organization-wide | **Yes — the only role that can** |
| Sales Manager | Organization-wide (approval/oversight) | No |
| Finance/Ops | Organization-wide (financial operations) | No |
| Sales Rep | Own assigned relationships/customers | No |
| Customer (Portal User) | Own organization's relationship only | No |

**Important distinction:** "Admin" here refers to an *organization Admin* — a role held by a membership, exactly like the others. It is not a separate platform-level superuser concept (that would be a distinct "Platform/System Admin" role, out of scope for this PRD unless your team decides to add one — see Open Questions).

---

## 4. The Promotion/Demotion Authority Matrix

This table answers "who can change whose role" explicitly, since that's the exact ambiguity you raised.

| Actor (doing the promoting) | Can change a Customer → Sales Rep? | Can change a Sales Rep → Manager? | Can change a Manager → Admin? | Can demote anyone? | Can remove someone entirely? |
|---|---|---|---|---|---|
| **Admin** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Sales Manager | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| Finance/Ops | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| Sales Rep | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| Customer | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |

**Special case — promoting a Customer to an internal role:** this is the scenario you specifically described (a Customer becomes a Sales Person or Manager). This is a **cross-boundary promotion** — moving someone from a `customer_org_id` context into being a genuine internal employee/member. This must be handled as a distinct, more deliberate action than a simple internal promotion (e.g., Rep → Manager), because it changes which organization the person is fundamentally affiliated with, not just their level within one. See Section 6 for the exact workflow.

**Special case — the last remaining Admin:** an organization must never be left with **zero Admins**. If an Admin attempts to demote or remove themselves as the sole remaining Admin, the system must block this action, since it would leave the organization with no one able to manage roles at all.

---

## 5. Screen Design — "Team & Roles" (Proposed Screen 19)

### 5.1 Access Route
Opened via `"Go to Back-end"` → **Team & Roles** tab, alongside Products, Price Lists, Discount Tiers, Warehouses (Admin-only area, per existing backend config pattern).

### 5.2 Header
- Title: `"Team & Roles Management"`
- Subtitle: `"Manage who has access to this organization and what they can do"`
- Primary Button: `+ Invite Member` (reuses the existing invitation flow from Authentication Epic 2)

### 5.3 Members Table

| Column | Purpose |
|---|---|
| Name | Member's full name |
| Email / Identifier | Login identifier (email or scoped tenant ID) |
| Current Role | Admin / Sales Manager / Finance-Ops / Sales Rep / Customer |
| Status | Active / Suspended / Pending Invitation |
| Joined Date | When the membership began |
| Actions | `Change Role` | `Suspend` | `Remove` |

### 5.4 "Change Role" Modal
- Shows the member's current role.
- Dropdown to select the new role (only roles valid for a promotion/demotion within this org).
- **Reason field (required, free text)** — every role change must be justified in writing, since this is a governance-sensitive action.
- **Confirmation step**: a second explicit "Are you sure?" dialog before the change is committed, specifically because this is irreversible-feeling and high-impact.
- If the change is a **cross-boundary promotion** (Customer → any internal role), the modal shows an additional warning: *"This will convert [Name] from a Customer Portal User into an internal team member of [Organization]. Their access to the Customer Portal for this relationship will be revoked. Are you sure?"*

### 5.5 Role Definitions Panel (Reference / Read-Only)
A collapsible side panel showing what each role can actually do, so the Admin making the decision isn't guessing — pulls directly from Section 3's table.

---

## 6. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-RBAC-01 | Only a membership with role = Admin may change another membership's role within that same organization | Must |
| FR-RBAC-02 | Role changes are validated server-side against the actor's own current membership role — never trust a client-submitted "I am an Admin" flag | Must |
| FR-RBAC-03 | An organization must always retain at least one Admin; attempts to demote/remove the last Admin are blocked with a clear error message | Must |
| FR-RBAC-04 | Cross-boundary promotion (Customer → internal role) requires an explicit distinct confirmation step, separate from a standard internal role change | Must |
| FR-RBAC-05 | Cross-boundary promotion automatically revokes the person's Customer Portal access for that specific relationship once they become an internal member (a person cannot simultaneously be an internal employee AND a customer-side user of the same organization relationship) | Must |
| FR-RBAC-06 | A role change requires a written reason, stored alongside the audit entry | Must |
| FR-RBAC-07 | Role changes take effect immediately for all future requests — per the Authentication spec's dynamic permission evaluation, no re-login required | Must |
| FR-RBAC-08 | An Admin's authority to change roles is strictly scoped to their own organization; they cannot act on memberships belonging to a different organization, even for a person they happen to share membership with elsewhere | Must |
| FR-RBAC-09 | Every role change (promotion, demotion, suspension, removal) generates an immutable audit log entry: actor, target, prior role, new role, reason, timestamp | Must |
| FR-RBAC-10 | Suspending a member immediately blocks their access without deleting their historical data or audit trail | Must |
| FR-RBAC-11 | Removing a member does not delete their historical actions (quotations they built, approvals they made) — those remain attributed to them for audit integrity, even after removal | Must |

---

## 7. Non-Functional Requirements

- **Immediate propagation:** a role change (or suspension) must take effect on the very next API request from that user, not at their next login — consistent with the platform's existing "dynamic permission evaluation" principle.
- **Non-repudiation:** the audit trail for role changes must be tamper-proof and permanently retained, since this is the most sensitive category of action in the entire platform.
- **Fail-closed:** if the system cannot determine the actor's role with certainty (e.g., a corrupted session), the role-change action must be denied by default, not allowed.

---

## 8. Detailed Workflow — Standard Internal Promotion (e.g., Sales Rep → Sales Manager)

1. Admin opens Team & Roles, finds the member, clicks "Change Role."
2. Modal shows current role (Sales Rep) and a dropdown of valid new roles.
3. Admin selects "Sales Manager," enters a reason ("Promoted after Q3 performance review"), clicks Save.
4. Confirmation dialog appears: "Change [Name]'s role from Sales Rep to Sales Manager?"
5. Admin confirms.
6. Server validates: is the actor's own current membership role in this org actually Admin? (Never trust the frontend.)
7. If valid: the membership record updates, an audit log entry is written, and the change is effective immediately.
8. The affected user's very next action anywhere in the app reflects their new Sales Manager permissions — e.g., they can now see the Approvals queue relevant to Managers.

## 9. Detailed Workflow — Cross-Boundary Promotion (Customer → Internal Role)

1. Admin opens Team & Roles for their organization and finds the person under the "Customer" role filter (this requires the person to already have some existing relationship visibility — likely surfaced via a "Convert Customer to Team Member" action rather than the standard Change Role modal, since this person's underlying membership context is fundamentally different).
2. Admin selects the target internal role (e.g., Sales Rep).
3. System shows the explicit cross-boundary warning (Section 5.4) explaining that Customer Portal access to this relationship will be revoked.
4. Admin enters a reason and confirms twice (standard confirmation + the cross-boundary-specific warning).
5. Server validates Admin authority (same check as standard promotion) AND validates that the target's current context is indeed a Customer-role membership of this same organization's relationship.
6. On confirmation: the person's Customer Portal membership for this relationship is deactivated, and a new internal membership (Sales Rep) is created for them in this organization.
7. Audit log captures both events: "Customer access revoked" and "Internal membership created," linked together as one governed action.
8. The person's next login will route them per the standard internal-user flow (Screen 1's post-login routing), not the customer portal flow, for this organization.

---

## 10. Data Model Additions (Conceptual)

Building on the existing `organizations` / `users` / `organization_memberships` model from the Authentication spec:

```
organization_memberships
- id
- user_id
- organization_id
- role            (admin | sales_manager | finance_ops | sales_rep | customer)
- status          (active | suspended | pending_invitation)
- scope_type      (all | assigned_only)   -- existing ABAC field
- created_at
- updated_at

role_change_audit_log
- id
- membership_id          -- the membership being changed
- actor_user_id           -- who made the change (must resolve to an Admin membership in the same org)
- actor_membership_id
- prior_role
- new_role
- reason                  -- required free text
- is_cross_boundary        -- boolean, true if this was a Customer→Internal conversion
- ip_address
- timestamp
```

---

## 11. Edge Cases & Open Questions

| ID | Question / Edge Case | Notes |
|---|---|---|
| RBAC-OQ1 | **Should there be a Platform/System Admin above organization Admins?** | This PRD assumes Admin authority is strictly per-organization. If your team wants a "super admin" who can act across all organizations (e.g., for platform support purposes), that's a separate, more powerful role that needs its own PRD section — don't build it implicitly by accident. |
| RBAC-OQ2 | **Can an Admin promote someone to Admin, creating multiple Admins?** | Table in Section 4 assumes yes. Confirm with your team whether there should be a cap, or whether multiple Admins per org is fully expected (likely yes, for redundancy). |
| RBAC-OQ3 | **What happens to a demoted Manager's existing assigned approvals-in-progress?** | If a Sales Manager is demoted to Sales Rep while they have pending approvals assigned to them, does that queue reassign automatically to another Manager, or sit orphaned? Needs an explicit rule. |
| RBAC-OQ4 | **Can an Admin change their own role?** | Should likely be blocked entirely (an Admin demoting themselves), or only blocked if they're the last Admin (per FR-RBAC-03) — confirm which rule your team wants. |
| RBAC-OQ5 | **Self-service role requests** | Should a Sales Rep be able to *request* a promotion (a request that an Admin then approves), or is this purely Admin-initiated with zero self-service? This PRD assumes the latter unless your team wants to add a request/approval sub-flow. |

---

## 12. Test Cases (for QA)

| # | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| 1 | Standard promotion | Admin changes a Sales Rep to Sales Manager | Role updates immediately; audit log entry created with correct prior/new role and reason | Must |
| 2 | Non-Admin attempts a role change | Log in as Sales Manager, attempt to change another member's role (via UI or direct API call) | Blocked — action unavailable in UI, and REJECTED server-side even if attempted via direct API call | Must — critical security test |
| 3 | Cross-org authority boundary | Admin of Company A attempts to change the role of a person who is ALSO a member of Company B, while operating in Company A's context | Only Company A's membership is affected; Company B's membership for that same person remains completely untouched | Must — critical multi-tenant test |
| 4 | Last Admin protection | An org has exactly one Admin; that Admin attempts to demote themselves or be removed | Action blocked with a clear error explaining an org must retain at least one Admin | Must |
| 5 | Cross-boundary promotion — Customer to Sales Rep | Admin converts a Customer Portal User into a Sales Rep | Customer Portal access for that relationship is revoked; new internal Sales Rep membership created; both events logged in one linked audit entry | Must |
| 6 | Immediate effect, no re-login | Promote a Sales Rep to Sales Manager while they hold an active session | Their very next API call reflects Manager-level permissions, without requiring logout/login | Must |
| 7 | Reason field required | Attempt to submit a role change with an empty reason field | Submission blocked, validation error shown | Should |
| 8 | Suspend vs. Remove distinction | Suspend a member, then separately test Remove on a different member | Suspended member's historical data remains fully intact and they cannot log in; Removed member's historical actions (past quotations/approvals) remain attributed to them for audit integrity | Must |
| 9 | Client-side tamper attempt | Attempt to submit a role-change API call directly, spoofing the actor's role in the request payload | Server ignores any client-submitted role claim and independently verifies the actor's actual current Admin membership from the database | Must — critical security test |
| 10 | Audit trail completeness | Perform multiple role changes on the same person over time (promote, demote, promote again) | Every individual change appears as a distinct audit entry, in order, none overwritten | Must |

---

## 13. Priority Summary for Judges/Demo

**Tests #2, #3, and #9** are the ones that actually prove this is real access control and not just a UI restriction — a Sales Manager or a spoofed API call must be rejected server-side, and an Admin's power must stay contained to their own organization even when the same person exists in two. **Test #5** (the cross-boundary Customer→Sales Rep promotion) is the exact scenario you described and is worth demoing explicitly, since it's the clearest proof that role authority in this system isn't just "toggle a dropdown" but a genuinely governed, audited action.
