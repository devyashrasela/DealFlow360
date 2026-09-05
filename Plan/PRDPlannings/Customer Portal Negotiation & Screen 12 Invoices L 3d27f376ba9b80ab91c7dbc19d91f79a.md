# Customer Portal Negotiation & Screen 12: Invoices List

# 1. Purpose

This module governs customer-facing contract negotiation and downstream financial reconciliation.

- **Screen 11 (Customer Portal Negotiation):** A standalone, authenticated customer-facing view. It replaces static email threads with a live negotiation interface where clients can expand line items to submit comments, counter discount proposals, and execute one-click quotation confirmations.
- **Screen 12 (Invoices List):** An internal unified financial ledger consolidating one-time sales invoices, recurring subscription billing runs, mid-cycle proration invoices, and credit notes into a single scannable register with inline payment recording.

### 2. Users

| **Role** | **What they see / can do here** |
| --- | --- |
| **Customer (Portal User)** | Authenticates via a dedicated portal login (Screen 1). Views quote lines, requests line-level adjustments, counters discounts, and confirms final terms. Cannot access internal operations.   |
| **Sales Rep** | Receives negotiation alerts when a customer counters. Reviews proposed terms in the sales workspace and accepts, modifies, or routes them for approval.   |
| **Finance / Operations** | Primary user of Screen 12. Audits receivables, reconciles credit notes against open balances, and records payments directly via inline modal triggers.   |
| **Sales Manager** | Monitors quotes in `Under Negotiation` status. Re-approves deals if customer counters breach customer-tier or category discount ceilings.   |

### 3. Screen Layout

#### 3.1 Screen 11: Customer Portal Negotiation Layout

- **Portal Top Bar (Customer-Scoped Theme):**
    - Product Title: `"DealFlow360 Customer Portal"`
    - Customer Context: Company Name (e.g., `Acme Corp`), User Email, `Sign Out` button.
    - *(Note: Internal navigation tabs like Approvals, Fulfillment, and Reports are strictly omitted)*.
- **Quotation Header & Lifecycle Banner:**
    - Document Title: `"Quotation Q-1042"`
    - Status Pill: `Sent` [Blue] | `Under Negotiation` [Yellow] | `Confirmed` [Green]
    - Metadata bar: Issued Date, Valid Until Date, Assigned Account Executive.
- **Summary Metrics Strip (3 Cards):**
    - `Gross Order Value`: Pre-discount catalog sum.
    - `Total Discount Savings`: Total dollar reduction proposed.
    - `Net Total Payable`: Final subtotal + estimated taxes.
- **Negotiable Line Items Table (with Expandable Rows):**
    - Columns: `Product / Service` | `Category` | `Quantity` | `Unit Price` | `Discount (%)` | `Total` | `Negotiate`
    - Row Expansion Trigger: Clicking `[Negotiate Line ▼]` opens an inline drawer directly beneath the selected SKU:
        - Request Type dropdown: `Request Additional Discount` | `Adjust Quantity` | `Ask a Question`
        - Counter Value Input: Numerical input (Target Discount % or Target Qty)
        - Note Input: Free-text justification box
        - Inline Actions: `Save Line Request` | `Clear`
- **Order-Level Counter & Action Bar (Footer):**
    - Counter Box: Target Total Order Price field + Justification Note input.
    - Primary Action: `Submit Request` (sends line comments and counter terms to the rep; transitions quote to `Under Negotiation`).
    - Secondary Action: `Confirm Quotation` (locks terms immediately, turning status to `Confirmed`). Disabled while a counter-proposal is awaiting rep review.

#### 3.2 Screen 12: Invoices (Unified Financial Ledger) Layout

- **Internal Top Navigation:**
    - Persistent tabs: Dashboard | Quotations | Approvals | Fulfillment | Subscriptions | **Invoices** *(Active)* | Deal Health | Reports
- **Header:**
    - Title: `"Invoices & Financial Ledger (List)"`
    - Subtitle: `"Unified accounting register for physical sales, subscription billings, and credit notes"`
- **Category Filter Pills (Segmented Filter Bar):**
    - `All Invoices` | `Standard / One-Time` | `Recurring Subscription` | `Proration Delta` | `Credit Notes`
- **Unified Ledger Table:**
    - Columns:
        - `Invoice #`: Unique billing document ID (e.g., `INV-9011`, `CR-3004`)
        - `Source Ref`: Direct deep-link to the origin entity (`SO-1042` or `SUB-4021`)
        - `Customer`: Customer organization name
        - `Type`: Standard | Recurring Cycle | Proration Delta | Credit Note
        - `Issued Date`: Date of posting
        - `Due Date`: Due date or `Immediate`
        - `Amount`: Total invoice balance (rendered in red with a negative sign for Credit Notes)
        - `Status`: `Posted` [Orange] | `Paid` [Green] | `Credited` [Gray] | `Overdue` [Red]
        - `Action`: `Record Payment` button (for unpaid rows) | `View Receipt`
- **Quick-Action "Record Payment" Modal:**
    - Triggered by clicking `Record Payment` on any unpaid row.
    - Displays: Target Invoice Number, Customer Name, Remaining Balance.
    - Fields:
        - `Payment Date`: Date input (defaults to today)
        - `Payment Method`: Dropdown (`Wire Transfer`, `ACH / Bank Transfer`, `Credit Card`, `Apply Credit Note`)
        - `Transaction / Ref ID`: Text input for reconciliation reference
        - `Amount Received`: Numerical input (defaults to total outstanding balance)
    - Actions: `Confirm Payment` | `Cancel`

### 4. Functional Requirements

| **ID** | **Requirement** | **Priority** |
| --- | --- | --- |
| **FR-POR-01** | **Customer Authentication Boundary:** Enforce strict access control via email and password; customer users cannot view internal margins, risk scores, or other tenant data.   | **Must** |
| **FR-POR-02** | **Inline Line Item Feedback:** Enable customers to expand each quotation line item to request quantity modifications or category-specific discounts with explanatory text.   | **Must** |
| **FR-POR-03** | **Order-Level Counter-Discount:** Provide an order-level target discount input that recalculates expected payable amounts live in the customer view.   | **Must** |
| **FR-POR-04** | **Rep Review State Transition:** Submitting any counter-proposal automatically transitions the quotation stage to `Under Negotiation` and disables `Confirm Quotation` until the sales rep reviews.   | **Must** |
| **FR-POR-05** | **Discount Re-Approval Routing:** If an accepted counter-proposal causes any product line or the blended discount risk score to breach configured ceilings, automatically route the quote to Approvals (Screens 5 & 6).   | **Must** |
| **FR-POR-06** | **Immediate Confirmation & Auto-Lock:** Clicking `Confirm Quotation` instantly locks order lines to immutable state, marks status as `Confirmed`, and initiates fulfillment and billing.   | **Must** |
| **FR-POR-07** | **Downstream Event Triggering:** On customer confirmation: (1) physical goods route to Fulfillment (Screen 7), (2) recurring lines spawn subscriptions (Screen 9), and (3) standard invoices post to Screen 12.   | **Must** |
| **FR-INV-01** | **Unified Ledger Aggregation:** Render all standard invoices, subscription runs, proration invoices, and credit notes in a single chronologically sorted table.   | **Must** |
| **FR-INV-02** | **Filter Segmenting:** Filter ledger rows by document type (`Standard`, `Recurring`, `Proration Delta`, `Credit Note`) using filter pills without requiring page reloads.   | **Must** |
| **FR-INV-03** | **Single Source Deep-Link:** Display a single primary origin link per row (`SO-XXXX` or `SUB-XXXX`) that deep-links directly to its source detail record.   | **Must** |
| **FR-INV-04** | **Inline Payment Modal:** Open a modal on `Record Payment` click, validate the amount against the open balance, and record the payment without full page redirection.   | **Must** |
| **FR-INV-05** | **Instant Status Flipping:** Successfully recording a payment immediately turns the invoice status badge to `Paid` [Green] and decrements the open balance.   | **Must** |
| **FR-INV-06** | **Negative Credit Balance Rendering:** Credit notes (generated from cancellations or downgrades) must render as negative currency amounts and allow offsetting open invoices.   | **Must** |

### 5. Non-Functional Requirements

- **Role-Based Isolation:** Customers must operate under a locked-down authentication scope (`role: customer_portal`); calling internal endpoints (e.g., `/api/approvals`, `/api/stock`, `/api/margin`) must return `403 Forbidden`.
- **Reconciliation Integrity:** The sum of all `Paid` allocations and remaining `Balance Due` on an invoice must equal `Total Amount` with zero fractional-cent drift.
- **Audit Trail Completeness:** All customer counter-proposals, rep modifications, approval re-entries, and recorded payments must generate timestamped audit entries.

### 6. Open Questions / Ambiguities to Clarify With Dev Team

- **Payment Method Gateway Integration:** Should `Record Payment` remain an internal manual recording utility (cash/wire/check capture), or does the hackathon demo require a mock credit card payment flow inside the Customer Portal (Screen 11)?
- **Partial Payment State:** When a partial payment is entered, does the status switch to a distinct `Partially Paid` pill, or remain `Posted` with an updated balance label?
- **PDF Watermarking:** Can customers download a PDF copy from Screen 11 while the deal is in `Under Negotiation` status, and should it carry a `"DRAFT / UNDER NEGOTIATION"` watermark?

### 7. Test Cases (for QA)

| **#** | **Test** | **Expected Result** |
| --- | --- | --- |
| **1** | Log in via Customer Portal credentials   | Authenticates successfully; opens Screen 11 displaying only the customer's quotations; internal tabs are invisible.   |
| **2** | Expand line item and submit question   | Inline drawer saves note; quote status updates to `Under Negotiation`; notification appears in rep's Recent Activity feed.   |
| **3** | Submit counter-discount above customer tier limit   | Quotation locks customer confirmation; rep accepts changes internally; quote automatically re-routes to Manager/Finance approval (Screen 5/6).   |
| **4** | Click `Confirm Quotation` on accepted terms   | Terms auto-lock to immutable state; status updates to `Confirmed`; physical lines route to Screen 7; invoice posts to Screen 12.   |
| **5** | Filter Screen 12 by "Credit Notes"   | Table hides standard invoices and displays only negative-balance credit notes (e.g., `CR-3004` for -$200.00).   |
| **6** | Click `Record Payment` on unpaid invoice   | Modal opens; submitting full payment flips status badge to `Paid` [Green] instantly without page refresh.   |
| **7** | Click `Source Ref` link on an invoice row   | Browser deep-links directly to the parent Quotation/Order detail (Screen 4) or Subscription detail (Screen 10). |