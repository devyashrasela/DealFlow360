# Customer Portal Negotiation & Invoices Ledger

# 1. Purpose

This module handles direct customer negotiation and financial reconciliation.

- **Screen 11 (Customer Portal Negotiation):** A customer-facing screen separate from the internal workspace. It enables authenticated clients to review quotation terms, communicate via line-level change requests, submit counter-discount proposals, and confirm deals with one click.
- **Screen 12 (Invoices List):** A unified accounting register displaying every generated financial document—including one-time product invoices, recurring subscription cycles, mid-cycle proration deltas, and cancellation credit notes. It provides quick-action payment registration to close the order-to-cash loop.

---

### 2. Users

| Role | Permissions & Operational Scope |
| --- | --- |
| **Customer (Portal User)** | External access only. Authenticates via dedicated customer portal credentials. Inspects quotation terms, proposes line/order counter-discounts, submits change requests, and confirms final terms. |

|
| **Sales Rep** | Internal access. Receives negotiation alerts, reviews customer counters, modifies deal terms in the Quotation Builder, and re-routes for approval if thresholds are breached.

|
| **Finance / Operations** | Internal access. Reconciles standard invoices and credit notes, records customer payments directly from the ledger, and audits transaction balances.

|
| **Sales Manager** | Internal access. Reviews deals returned from negotiation that violate blended discount boundaries.

|

---

### 3. Screen Layout

#### 3.1 Screen 11 Layout: Customer Portal Negotiation

- **Portal Top Navigation (External Customer Theme):**
- Brand: `"DealFlow360 Customer Portal"`
- Persistent user items: Authenticated Client Name (e.g., `Acme Corp`), Contact Email, `Sign Out` button.
- **Quotation Status Banner:**
- Displays Quotation ID (e.g., `Q-1042`), Issue Date, Expiration Date, and Current Lifecycle Status Badge: `Sent` [Blue] | `Under Negotiation` [Yellow] | `Confirmed` [Green].
- **Quotation Summary Strip (3 Highlight Cards):**
- `Gross Total`: Pre-discount list amount.
- `Negotiated Savings`: Total discount deductions applied.
- `Net Amount Payable`: Final total due (including taxes and recurring frequency notes).
- **Line-Item Negotiation Table (with Expandable Rows):**
- Displays itemized quotation lines with inline communication controls:

| Product / Service | Type | Qty | Unit Price | Current Discount | Line Total | Actions |
| --- | --- | --- | --- | --- | --- | --- |
| Laptop Pro 14 | Hardware |  |  |  |  |  |

| 2 | $1,200 | 12% | $2,112

| `[Negotiate Line ▼]`<br> |
| Onsite Setup Service | Services

| 1 | $450 | 18% | $369

| `[Negotiate Line ▼]`<br> |
| Cloud Backup (Annual) | Subscription

| 1 | $600/yr | 0% | $600 | `[Negotiate Line ▼]`<br> |

- **Inline Expandable Row Drawer (Triggers on `Negotiate Line`):**
- Collapsible sub-panel below the line item:
- `Change Request Type`: Dropdown (`Request Additional Discount`, `Adjust Quantity`, `General Question`).
- `Proposed Value`: Number input (e.g., enter proposed discount % or requested qty).
- `Customer Notes / Justification`: Text area for line-level remarks.
- Actions: `Save Line Request` | `Clear`
- **Order-Level Counter-Proposal Card (Bottom Left):**
- Box titled `"Propose Counter Terms"`.
- Fields: `Proposed Target Total ($)` or `Overall Target Discount (%)`, accompanied by a `Reason for Counter-Proposal` text field.
- **Customer Action Footer (Bottom Right):**
- `Submit Request`: Submits all line comments and counter proposals to the sales rep.
- `Confirm Quotation`: One-click final approval of terms. Locked/disabled while a counter-proposal is awaiting rep review.

---

#### 3.2 Screen 12 Layout: Invoices (Unified Financial Ledger)

- **Internal Top Navigation:**
- Dashboard | Quotations | Approvals | Fulfillment | Subscriptions | **Invoices** *(Active/Highlighted)* | Deal Health | Reports
- **Header & Quick Summary:**
- Title: `"Invoices & Financial Ledger (List)"`
- Subtitle: `"Unified accounting register for physical sales, subscription billings, and credit notes"`
- Aggregated Counters: `Total Outstanding Receivables ($)` | `Overdue Invoices Count` | `Total Credited ($)`
- **Ledger Filter Pills:**
- Segment buttons: `All Invoices` | `Standard / One-Time` | `Recurring Subscription` | `Proration Delta` | `Credit Notes`
- **Unified Financial Ledger Table:**
- Consolidated chronological ledger:

| Invoice # | Source Ref | Customer | Document Type | Issued Date | Due Date | Total Amount | Status | Quick Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| INV-9011 | `SO-1042`<br> | Acme Corp |  |  |  |  |  |  |

| Standard (One-Time)

| 2026-09-01 | 2026-09-30 | $2,481.00 | `Posted` [Orange] | `Record Payment`<br> |
| INV-9012 | `SUB-4021`<br> | Acme Corp

| Recurring Plan

| 2026-09-01 | 2026-09-15 | $600.00 | `Paid` [Green]

| `View Receipt` |
| CR-3004 | `SUB-4019`<br> | Beta Industries

| Credit Note (Cancellation)

| 2026-09-03 | Immediate | -$200.00

| `Credited` [Gray] | `Apply Credit` |
| INV-9015 | `SUB-4021`<br> | Acme Corp

| Proration Delta

| 2026-09-05 | 2026-09-20 | $50.00

| `Posted` [Orange] | `Record Payment`<br> |

- **Quick-Action "Record Payment" Modal:**
- Triggered by clicking `Record Payment` on any unpaid row.
- Displays: Invoice Number, Customer Name, and Outstanding Balance.
- Input Controls:
- `Payment Date`: Date picker (defaults to today's date).
- `Payment Method`: Dropdown (`Wire Transfer`, `Credit Card`, `ACH Check`, `Customer Credit Balance`).
- `Payment Reference / Transaction ID`: Text input.
- `Amount Received`: Currency input (defaults to full remaining balance).
- Modal Actions: `Confirm Payment` | `Cancel`

---

### 4. Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| **FR-POR-01** | **Customer Authentication Boundary:** Enforce strict access control via customer email and password; portal users must only access quotations mapped to their company ID. |  |

| **Must** |
| **FR-POR-02** | **Line-Level Feedback Capture:** Allow customers to expand individual line items to ask questions or propose price/quantity variations.

| **Must** |
| **FR-POR-03** | **Order-Level Counter-Discount:** Support overall discount proposals; entering a counter sets quotation stage to `Under Negotiation` upon submission.

| **Must** |
| **FR-POR-04** | **Rep Review Routing:** Route submitted counter-proposals to the internal Sales Rep workspace, disabling the customer `Confirm Quotation` button until the rep accepts or adjusts terms.

| **Must** |
| **FR-POR-05** | **Discount Re-Approval Trigger:** If a customer counter-discount is accepted by the rep and breaches the customer tier or product category ceiling, re-route the quote to Manager/Finance approval (Screen 5/6).

| **Must** |
| **FR-POR-06** | **Immediate Confirmation & Auto-Lock:** When a customer clicks `Confirm Quotation` on accepted terms, immediately transition status to `Confirmed`, lock line items from editing, and trigger downstream processes.

| **Must** |
| **FR-POR-07** | **Downstream Event Generation:** Confirming a quotation must automatically create: (1) orders awaiting fulfillment in Screen 7, (2) recurring subscriptions in Screen 9 (if applicable), and (3) a posted standard invoice in Screen 12.

| **Must** |
| **FR-INV-01** | **Unified Ledger Aggregation:** Screen 12 must render all one-time invoices, subscription cycles, proration invoices, and credit notes in a single list with category filters.

| **Must** |
| **FR-INV-02** | **Direct Source Deep-Linking:** Each ledger row must include a single clickable `Source Ref` linking directly to the source Order (Screen 4) or Subscription (Screen 10).

| **Must** |
| **FR-INV-03** | **Inline Payment Capture Modal:** Provide an immediate `Record Payment` action on unpaid rows that updates the status to `Paid` without requiring a full page transition.

| **Must** |
| **FR-INV-04** | **Payment Ledger Reconciliation:** Once `Confirm Payment` is submitted, immediately adjust the invoice status to `Paid`, update outstanding receivables, and record transaction metadata.

| **Must** |
| **FR-INV-05** | **Credit Note Reconciliation:** Display credit notes (e.g., from subscription cancellation) with negative currency amounts and allow manual allocation against outstanding invoices.

| **Must** |
| **FR-INV-06** | **Global Refresh Hook:** Re-fetch ledger records and status states upon invoking the global `"Reload Data"` top navigation trigger.

| **Must** |

---

### 5. Non-Functional Requirements

- **Access Control & Session Isolation:** Customer portal authentication tokens must carry restricted customer scopes (`role: customer_portal`); attempts to call internal administrative APIs (`/api/approvals`, `/api/stock`) must be rejected with `403 Forbidden`.
- **Audit Logging:** Every customer comment, counter-proposal submission, internal acceptance, and payment recording event must log a non-destructive audit event with timestamp and actor ID.
- **State Transition Latency:** The status transition from customer `Confirm Quotation` to internal `Confirmed` order state must resolve across fulfillment and billing databases in under 400 ms.

---

### 6. Open Questions / Ambiguities to Clarify With Dev Team

- **Payment Gateway Integration vs. Manual Ledgering:** Does the demo test flow rely purely on recording manual payment events (Cash/Wire/ACH reference entry), or is a mock card checkout needed inside the Customer Portal (Screen 11)?
- **Partial Payments Handling:** If a customer pays 50% of an invoice via `Record Payment`, should the invoice state transition to a distinct `Partially Paid` state or remain `Posted` with an updated balance due indicator?
- **Customer Portal Document Export:** Should Screen 11 allow the client to download a watermarked PDF snapshot of the quotation while it is `Under Negotiation`, or only once it reaches `Confirmed` status?

---

### 7. Test Cases (for QA)

| # | Scenario | Steps to Execute | Expected Result |
| --- | --- | --- | --- |
| **1** | **Customer Portal Login** | Navigate to Portal login; submit customer credentials for Acme Corp. |  |

| Successfully authenticates; loads Screen 11 pre-filtered to Acme Corp's active quote; internal nav tabs are hidden.

|
| **2** | **Line Item Change Request** | On Screen 11, expand "Onsite Setup Service", enter note *"Can we do $300?"*, and click Submit Request.

| Quote status updates to `Under Negotiation`; customer view shows comment submitted; internal rep receives negotiation notification.

|
| **3** | **Counter-Proposal Approval Breach** | Customer submits order-level counter requiring 22% discount (exceeds Gold customer limit of 15%).

| Rep reviews in internal workspace; accepting the terms re-routes quote automatically to Manager and Finance queues (Screen 5/6).

|
| **4** | **Quotation Confirmation & Order Lock** | Customer clicks `Confirm Quotation` on an agreed quote.

| Status changes to `Confirmed`; line items lock; order record appears immediately in Fulfillment (Screen 7) and Invoices (Screen 12).

|
| **5** | **Unified Ledger Filtering** | On Screen 12, select filter pill `Credit Notes`.

| Ledger updates instantly to show only negative credit balance rows (e.g., `CR-3004`).

|
| **6** | **Record Payment & Status Update** | On Screen 12, click `Record Payment` for `INV-9011` ($2,481), select "Wire", and confirm.

| Row status badge changes immediately from orange `Posted` to green `Paid`; total receivables decrement by $2,481.

|
| **7** | **Direct Source Traceability** | Click the source reference link `SO-1042` on invoice row `INV-9011`.

| Browser deep-links directly to the detail view for Sales Order `SO-1042` (Screen 4/8).

|