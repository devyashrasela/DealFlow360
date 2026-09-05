# Authentication

# 1. Executive Summary & Core Concept

---

DealFlow360 is a multi-tenant B2B sales operations platform designed for complex, bilateral commercial relationships. Unlike traditional CRMs that treat customers as second-class "accounts" or static lead records, DealFlow360 implements a **symmetric organization model**: every business is a first-class `Organization`.

Commercial interactions happen across an **Organization Relationship** (e.g., `Provider ↔ Customer`). A single human identity (`User`) can hold contextual `Memberships` across multiple organizations and access distinct customer portals without account duplication.

### Primary Objectives & KPIs

- **Zero Cross-Tenant Leakage:** Absolute cryptographic and database-level isolation between provider-internal records and customer-facing views.
- **Frictionless Customer Engagement:** Customer procurement teams access quotation and negotiation workspaces via direct deep links without upfront onboarding friction.
- **Audit Compliance:** 100% auditable history of quotation changes, margin overrides, customer negotiations, and approval trails.
- **Onboarding Velocity:** Sub-2-minute onboarding flow for external customer administrators.

---

## 2. User Personas & Access Boundaries

| Persona | Affiliation | Scope of Access | Primary Jobs to Be Done |
| --- | --- | --- | --- |
| **Provider Admin** | Seller Org | Global Seller Org Context | Manage organization settings, define global catalogs, invite internal employees, assign reps to accounts. |
| **Sales Manager** | Seller Org | All Seller Relationships | Review discounted deals, approve quotes exceeding discount/margin thresholds, monitor team pipeline. |
| **Sales Rep** | Seller Org | Assigned Relationships Only | Generate quotes, calculate margins, communicate with assigned customer procurement teams. |
| **Customer Admin** | Buyer Org | All Inbound Provider Relationships | Accept initial provider invitations, manage buyer employees, set purchasing policies. |
| **Customer User** | Buyer Org | Specific Inbound Relationships | Review quotes, request line-item price adjustments, counter-propose totals, execute purchase orders. |

---

## 3. Information Architecture & Data Model Principles

- **Symmetric Organizations:** The system has no dedicated `customers` table. A business entity is always an `Organization`.
- **Bilateral Anchoring:** All commercial entities (`quotations`, `orders`, `negotiation_requests`) belong directly to an `organization_relationship_id`. They never link directly to a raw customer organization ID.
- **Dual Identity Resolution:** Authentication maps to a global `User`. Authorization is contextual, derived from `organization_memberships` and `relationship_assignments`.
- **Strict Redaction (Internal vs. Customer DTOs):** Margin percentages, unit cost prices, cost totals, internal approval comments, and credit risk evaluations are scrubbed before payload dispatch to customer actors.

---

## 4. Functional Specifications & Requirements

### Epic 1: Identity, Authentication & Context Resolution

#### FR-1.1: Multi-Format Authentication

- The system must accept two identifier patterns at `/login`:
1. Standard global email: `jane.doe@example.com`
2. Scoped tenant identifier: `{employee_id}.{org_slug}` (e.g., `EMP-1042.acme`)
- Authentication resolves credentials against a single global `users` table via Argon2id hashing.

#### FR-1.2: Session Management & Dynamic Token Strategy

- Issue short-lived access JWTs (15 minutes) containing only identity metadata (`user_id`, `session_id`).
- Client memberships, roles, and relationship assignments must be evaluated dynamically against the database/cache on each API request to ensure immediate revocation propagation.
- Maintain rotating refresh tokens in a database-backed `sessions` table.

#### FR-1.3: Smart Post-Login Routing Engine

- Upon logging in via `/login`:
- If the user has 1 provider membership $\to$ Redirect to `/:providerSlug/dashboard`.
- If the user has 1 customer membership with 1 active provider relationship $\to$ Redirect to `/:providerSlug/:customerSlug/dashboard`.
- If the user has multiple memberships or relationships $\to$ Display the **Workspace & Portal Selector**.

---

### Epic 2: Relationship Lifecycle & Customer Onboarding

```
[ACME: New Customer Action]
         │
         ▼
[Search by Legal Name / Tax ID]
   ├── Exists? ──► Link existing Organization ID
   └── New?    ──► Create Organization Record (Example Ltd)
         │
         ▼
[Insert organization_relationships (ACME ↔ Example)]
         │
         ▼
[Generate Invitation: customer_admin role + relationship_id]
         │
         ▼
[Email delivered with secure one-time cryptographic token]
```

#### FR-2.1: Relationship Linking & Creation

- Providers search for prospective customers by `tax_identifier` or normalized `legal_name`.
- If a match exists, DealFlow360 links the existing `organization_id` to the provider under a new `organization_relationships` record.
- If no match exists, a new `organizations` record is provisioned with status `active`.

#### FR-2.2: Customer Administrator Invitation

- The provider generates an onboarding invitation specifying the target email, relationship ID, and role (`Customer Admin`).
- The invitation token must be hashed using SHA-256 in the database with a strict 72-hour expiration window.
- On acceptance:
- If the user already has a `users` record $\to$ Prompt for password verification, then link a new `organization_memberships` row.
- If the user is new $\to$ Collect `full_name`, set password, create `users` record, and link `organization_memberships`.
- Status of the membership defaults to `active`; invitation is flagged `accepted`.

---

### Epic 3: Contextual Routing & Hybrid Authorization (RBAC + ABAC)

#### FR-3.1: Route Structure

- Context is declared explicitly via URL segments:
- `/:providerSlug/dashboard` (Provider internal workspace)
- `/:providerSlug/:customerSlug/dashboard` (Bilateral relationship workspace)
- `/:providerSlug/:customerSlug/quotes/:quoteNumber` (Direct resource view)

#### FR-3.2: Authorization Guard Pipeline

On every contextual route invocation, the API pipeline must validate:

1. **Valid Token:** `sub` maps to an active user.
2. **Slug Verification:** Both `providerSlug` and `customerSlug` exist, are active, and have an active entry in `organization_relationships`.
3. **Actor Context Resolution:** The user holds an active membership in either the Provider Org or the Customer Org.
4. **ABAC Restriction (Provider Reps):** If acting as a Provider member and the member's role has `scope_type = 'assigned_only'`, verify that `(relationship_id, membership_id)` exists in `relationship_assignments`. If missing, return `403 Forbidden`.
5. **Customer Access Scoping:** Customer members are automatically authorized for relationships where `customer_org_id = membership.organization_id`.

---

### Epic 4: Quotation Lifecycle & Negotiation Engine

```
[Draft Quote] ──► [Internal Approval] ──► [Sent to Customer] ──► [Customer Review]
                         ▲                                              │
                         │                                              ▼
                  [Threshold Met]                             [Negotiate / Propose]
                         │                                              │
                         └─────────────── [Counter-Offer] ◄─────────────┘
```

#### FR-4.1: Quotation Creation & Margin Calculation (Provider Internal)

- Fields required: Line items (SKU, description, quantity, list price, unit cost, discount percentage).
- Derived metrics calculated server-side:

$$
\text{Subtotal} = \sum (\text{Qty} \times \text{Unit Price} \times (1 - \text{Discount}))
$$

$$
\text{Margin Total} = \text{Subtotal} - \sum (\text{Qty} \times \text{Unit Cost})
$$

$$
\text{Margin \%} = \frac{\text{Margin Total}}{\text{Subtotal}} \times 100
$$

- If `Margin %` falls below the organization’s configured governance threshold (e.g., 18%), the quote status is locked to `pending_approval`.

#### FR-4.2: Data Redaction Layer (Customer Safe DTO)

- Quotation responses dispatched to customer users must pass through a strict field stripping layer:

```json
// Customer-Safe Payload Structure
{
  "quote_number": "Q-10492",
  "version": 1,
  "status": "sent",
  "subtotal": 12500.00,
  "tax_total": 1000.00,
  "grand_total": 13500.00,
  "customer_notes": "Terms: Net 30",
  "line_items": [
    {
      "item_sku": "SRV-ENT-01",
      "description": "Enterprise Cloud Migration",
      "quantity": 1,
      "unit_price": 12500.00,
      "line_subtotal": 12500.00
    }
  ]
}
```

- Banned Customer Fields: `unit_cost`, `cost_total`, `line_margin`, `margin_total`, `internal_notes`, `approvals.rejection_reason`.

#### FR-4.3: Customer Negotiation & Counter-Proposals

- Customer users with `quote:negotiate` permission can submit counter-offers with:
- Proposed Line Item Quantities or Pricing.
- Target Grand Total.
- Negotiation commentary/justification.
- Submitting a negotiation shifts quote status to `negotiating`, alerts the assigned Sales Rep, and requires provider-side re-approval if margins change.

#### FR-4.4: Quotation Acceptance & Order Transformation

- When a customer user with `quote:accept` accepts a quote in `sent` or `approved` status:
1. Transactionally update `quotations.status = 'accepted'`.
2. Generate a corresponding record in `orders` tied to the same `relationship_id`.
3. Clone all `quotation_lines` into `order_lines` to preserve immutable historical commercial terms.

---

### Epic 5: Governance & Auditability

#### FR-5.1: Immutable Audit Trail

- Write events to `audit_logs` for all state changes across:
- Membership status updates (invitations, suspensions, role modifications).
- Relationship status mutations (activation, suspension, termination).
- Quotation state machine transitions (`draft` $\to$ `pending_approval` $\to$ `sent` $\to$ `negotiating` $\to$ `accepted`).
- Manual margin overrides and manager approval/rejection decisions.
- Log payloads must record `actor_user_id`, `actor_membership_id`, `ip_address`, `payload_before`, and `payload_after`.

---

## 5. Exhaustive Edge Cases & Failure Mode Handling

### 5.1 Identity & Membership Collisions

- **Edge Case 1: Cross-Organization Employee ID Collisions**
- *Scenario:* ACME assigns employee ID `EMP-01` to Alice. Example Ltd also assigns `EMP-01` to Bob.
- *Handling:* The database enforces a composite unique constraint: `UNIQUE(organization_id, employee_id)`. When logging in with `EMP-01.acme` vs `EMP-01.example`, the login handler parses the slug suffix to isolate the lookup query to the exact target organization.
- **Edge Case 2: One User Operating Multiple Internal Personas**
- *Scenario:* Consultant Carol is an external contractor for ACME (`EMP-99.acme`) and an internal manager at Globex (`EMP-01.globex`).
- *Handling:* Authenticating via `carol@consulting.com` maps to a single `user_id`. When Carol accesses `/acme/dashboard`, the authorization middleware selects the `organization_memberships` entry belonging to ACME. Her Globex role permissions are completely ignored during this request cycle.
- **Edge Case 3: Invitation Sent to Existing System User**
- *Scenario:* Dave is already an ACME user. Example Ltd invites `dave@acme.com` to become a Customer User for Example.
- *Handling:* When Dave accepts the invitation, the system detects `users.email = 'dave@acme.com'`. It prompts Dave for his existing account credentials. Upon verification, the platform inserts a new `organization_memberships` record under Example Ltd with `user_id = Dave.id`. No duplicate user is created.

### 5.2 Multi-Tenant Data Leakage Vectors

- **Edge Case 4: URL Manipulation / Parameter Tampering (BOLA/IDOR)**
- *Scenario:* An authenticated ACME Sales Rep changes the URL from `/acme/example/quotes/Q-100` to `/acme/beta/quotes/Q-200`. The rep is assigned to Example, but NOT to Beta.
- *Handling:* Authorization middleware intercepts the request, notes that `beta` does not match any entry in `relationship_assignments` for that rep's `membership_id`, and immediately aborts with `403 Forbidden`. The database query is never executed.
- **Edge Case 5: Direct Resource ID Injection**
- *Scenario:* A user attempts to fetch a quote by UUID: `GET /api/v1/quotes/3c9b...` passing an ID that belongs to a different provider relationship.
- *Handling:* Single-resource lookup endpoints must enforce contextual scoping:

```sql
SELECT * FROM quotations
WHERE id = :quoteId
  AND relationship_id = :authenticatedContextRelationshipId;
```

If the relationship ID does not match the active session context, the server responds with `404 Not Found` (never `403`, to prevent resource enumeration attacks).

- **Edge Case 6: Malicious Field Reflection via GraphQL or Dynamic SQL**
- *Scenario:* A customer user crafts an API request requesting internal fields (`unit_cost`, `line_margin`).
- *Handling:* Hard boundary at the DTO layer. Serialization models do not rely on dynamic parameter reflection; customer serialization pipelines strictly whitelist output keys.

### 5.3 Relationship Lifecycle Interruptions

- **Edge Case 7: Provider Terminates Relationship Mid-Negotiation**
- *Scenario:* ACME terminates its relationship with Example while an Example procurement agent is reviewing an open quotation.
- *Handling:* When the customer user submits `POST /acme/example/quotes/Q-100/negotiate`, the middleware detects `organization_relationships.status = 'terminated'`. The transaction is aborted with `409 Conflict: Commercial relationship is inactive`. The user is redirected to a read-only historical archive.
- **Edge Case 8: Organization Deactivation with Active Subscriptions/Quotes**
- *Scenario:* Example Ltd fails to pay platform dues and is set to `status = 'suspended'` globally.
- *Handling:* Every API invocation evaluates `organizations.status`. If either provider or customer is suspended, access is immediately refused for both parties on that relationship context. Historical data remains intact; no hard deletions occur.

### 5.4 Concurrent Edits & State Race Conditions

- **Edge Case 9: Double Confirmation / Concurrent Customer Acceptance**
- *Scenario:* Two procurement officers from Example Ltd open Quote Q-100 and hit "Accept" at the exact same second.
- *Handling:* The state machine transition uses optimistic concurrency control:

```sql
UPDATE quotations
SET status = 'accepted', updated_at = NOW()
WHERE id = :quoteId AND status IN ('sent', 'negotiating')
RETURNING id;
```

The first request succeeds and converts to an order. The second request returns 0 rows updated, prompting the backend to roll back and return `409 Conflict: Quote has already been accepted`.

- **Edge Case 10: Sales Rep Updates Quote While Customer Reviews**
- *Scenario:* A Sales Rep adjusts line items while a customer is viewing the quote.
- *Handling:* Quotations enforce incremental integer versioning (`version = 1, 2, ...`). Any modification while in status `sent` causes the quote to fork into a new draft version, revoking the customer’s ability to accept the outdated version.

---

## 6. Non-Functional Requirements (NFRs)

### Performance & Scalability

- **API P95 Latency:** Contextual authorization middleware and permission checks must execute in under 15ms. Total API P95 latency must remain under 120ms.
- **Indexing Strategy:** Foreign keys and frequent filter paths (`(employee_id, organization_id)`, `(provider_org_id, customer_org_id)`, `(relationship_id, status)`) must be covered by composite B-Tree indexes.

---