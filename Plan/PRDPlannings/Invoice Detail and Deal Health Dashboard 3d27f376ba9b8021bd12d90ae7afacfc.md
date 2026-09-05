# Invoice Detail and Deal Health Dashboard

---

### 1. Purpose

This specification covers financial settlement execution and proactive operational risk monitoring.

- **Screen 13 (Invoice Detail):** Accessed by clicking any record in the unified ledger (Screen 12). It displays line-item breakdowns for mixed orders (hardware, services, prorated subscriptions), payment allocation ledgers, credit note offsets, and direct settlement capture.
- **Screen 14 (Deal Health and Anomaly Dashboard):** An automated deal governance workspace that monitors quotations and orders across the sales cycle in real time. It alerts managers to stalled negotiations, statistical discount anomalies, and warehouse delivery slippage before revenue is compromised.

---

### 2. Users

| Role | What they see / can do here |
| --- | --- |
| **Sales Manager** | **Primary user of Screen 14.** Reviews stalled quotes, identifies rogue discounting, triggers rep nudges, and escalates at-risk deals. Read-only access to Screen 13. |

|
| **Finance / Operations** | **Primary user of Screen 13.** Reconciles line taxes, records multi-method payments, allocates credit notes, and issues official receipts. Uses Screen 14 to monitor fulfillment slippage and margin leaks.

|
| **Sales Rep** | Reviews Screen 13 to verify customer payment status and commission release. Views Screen 14 to respond to management nudges regarding stagnant pipeline deals.

|
| **Admin** | Configures Deal Health threshold parameters (e.g., stalled deal aging days, discount anomaly sensitivity, promised SLA windows).

|

---

### 3. Screen Layout

#### 3.1 Screen 13: Invoice Detail Layout

- **Top Navigation:**
- Dashboard | Quotations | Approvals | Fulfillment | Subscriptions | **Invoices** *(Active)* | Deal Health | Reports
- **Header & Lifecycle Banner:**
- Document Title: `"Invoice: INV-9011"` (or `"Credit Note: CR-3004"`)
- Status Badge: `Posted` [Orange] | `Paid` [Green] | `Partially Paid` [Yellow] | `Credited` [Gray] | `Overdue` [Red]
- Top Action Buttons: `Record Payment` (Primary Blue), `Apply Credit Note`, `Download PDF`, `Send to Customer`.
- **Context & Linkage Strip:**
- Origin Reference: Clickable badge linking to parent order (`SO-1042`) or subscription contract (`SUB-4021`).
- Customer Context: Organization name, billing address, tax ID/VAT number, customer tier badge (e.g., `Gold`).
- Timeline Metadata: Invoice Date, Due Date, Payment Terms (e.g., `Net 30`).
- **Line Items & Hybrid Breakdown Table:**
- Displays itemized physical, service, and subscription rows:

| Item Description | Category | Billing Type | Qty | Unit Price | Discount | Net Amount | Tax Rate | Line Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Laptop Pro 14 | Hardware |  |  |  |  |  |  |  |

| One-Time

| 2 | $1,200.00 | 12% | $2,112.00 | 8.25% | $2,286.24

|
| Onsite Setup Service | Services

| One-Time

| 1 | $450.00 | 18% | $369.00 | 0.00% | $369.00

|
| Cloud Security Retainer | Subscription

| Recurring (Mo)

| 1 | $600.00 | 0% | $600.00 | 8.25% | $649.50 |

- **Financial Summary & Totals Block (Right Aligned):**
- `Gross Subtotal`: Undiscounted sum of all lines.
- `Applied Discounts`: Total price deductions.
- `Total Tax`: Aggregated jurisdiction tax.
- `Grand Total`: Total invoice amount.
- `Amount Paid`: Sum of settled receipts.
- `Balance Due`: Net outstanding balance.
- **Settlement & Audit Ledger (Bottom Tabs):**
- **Tab 1: Payment History:** Sub-table displaying `Payment Date`, `Transaction ID`, `Method` (Wire/ACH/Card), `Recorded By`, and `Amount Applied`.
- **Tab 2: Applied Credits:** Displays linked credit notes (e.g., `CR-3004`) offsetting this balance.
- **Tab 3: Activity Log:** Timestamped ledger tracking document creation, email dispatch, and payment status updates.

---

#### 3.2 Screen 14: Deal Health and Anomaly Dashboard Layout

- **Top Navigation:**
- Dashboard | Quotations | Approvals | Fulfillment | Subscriptions | Invoices | **Deal Health** *(Active)* | Reports
- **Header:**
- Title: `"Deal Health & Anomaly Dashboard"`
- Subtitle: `"Real-time algorithmic detection for stalled pipeline, margin anomalies, and delivery slippage"`
- Global Action: `Run Diagnostic Scan` (Forces rule evaluation) | `Configure Thresholds`.
- **Risk Overview Cards (Row of 3 Summary Indicators):**
- `Stalled Quotations`: Total deals inactive beyond configured thresholds (e.g., > 5 days).
- `Discount Anomalies`: Quotes flagged where rep discounts exceed historical variance limits.
- `Delivery Slippage Risks`: Confirmed orders where inventory splits or backorders endanger promise dates.
- **Anomaly Detection Streams (3 Collapsible Focus Panels):**
- **Stream A: Stalled Deals Queue:**
- Displays quotes stuck in `Draft`, `Pending Approval`, or `Under Negotiation`.
- Columns: `Quotation #` | `Customer` | `Rep` | `Current Stage` | `Days Inactive` | `Deal Value` | `Risk Level` | `Quick Action`
- Quick Actions: `Send Nudge to Rep` (triggers internal reminder) | `Escalate to Manager` | `Open Quotation` (deep-links to Screen 4).
- **Stream B: Discount Anomaly & Margin Leak Feed:**
- Catches reps discounting significantly above their individual historical norms or blended limits.
- Columns: `Quotation #` | `Customer` | `Rep` | `Quoted Discount` | `Rep Historical Avg` | `Variance Delta` | `Blended Risk` | `Action`
- Anomaly Metric Indicator: e.g., Quoted 22% vs. Rep Avg 8% ($\Delta +14\text{pt}$ anomaly).
- Quick Actions: `Inspect Discount Breakdown` | `Re-route to Finance Approval`.
- **Stream C: Delivery Promise Slippage Feed:**
- Tracks active orders where multi-warehouse logistics or backorders compromise delivery commitments.
- Columns: `Order #` | `Customer` | `Promised Date` | `Projected Dispatch` | `Slippage Delay` | `Bottleneck Location` | `Action`
- Bottleneck Flag: e.g., `"East Depot: Backordered 4 units Laptop Pro 14"`.
- Quick Actions: `Open Fulfillment Split` (deep-links to Screen 8) | `Notify Customer`.

---

### 4. Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| **FR-INV-07** | **Invoice Detail Ingestion:** Screen 13 must render exact billing metadata, customer address, line-item pricing, and parent order references for any invoice record selected in Screen 12. |  |

| **Must** |
| **FR-INV-08** | **Hybrid Order Itemization:** Present one-time hardware lines, setup services, and recurring subscriptions separately, with recurring lines indicating their active cycle cadence.

| **Must** |
| **FR-INV-09** | **Direct Payment Capture:** The `Record Payment` action on Screen 13 must validate inputs against `Balance Due`, append a transaction record to Payment History, and update document status immediately.

| **Must** |
| **FR-INV-10** | **Partial Settlement Handling:** When a payment is recorded for less than `Grand Total`, the status must transition to `Partially Paid` and display the remaining balance due.

| **Must** |
| **FR-INV-11** | **Credit Note Offsetting:** Allow operators on Screen 13 to allocate available customer credit note balances against an open invoice, reducing balance due dollar-for-dollar.

| **Must** |
| **FR-INV-12** | **Immutable Audit Log:** Lock line items against manual editing once an invoice has reached `Posted` or `Paid` status, logging all payment operations to the audit trail.

| **Must** |
| **FR-HLT-01** | **Real-Time Stalled Deal Detection:** Track days elapsed since last stage modification; automatically flag quotes exceeding the configured inactivity ceiling (e.g., $\text{Days Inactive} \ge 5$).

| **Must** |
| **FR-HLT-02** | **Statistical Discount Anomaly Engine:** Compare quote discounts against the rep's historical discounting average; trigger an anomaly alert when: $\text{Discount}_{\text{quote}} > \mu_{\text{rep}} + 1.5\sigma$.

| **Must** |
| **FR-HLT-03** | **Delivery Slippage Tracker:** Cross-reference promised delivery dates with warehouse split availability; flag an order for slippage if any line item remains backordered within 48 hours of expected delivery.

| **Must** |
| **FR-HLT-04** | **Direct Alert Deep-Linking:** Clicking any alert row or entity badge on Screen 14 must open the corresponding quotation (Screen 4), approval record (Screen 6), or fulfillment split (Screen 8).

| **Must** |
| **FR-HLT-05** | **Automated Rep Nudge Action:** Triggering `Send Nudge` from a stalled deal alert must post an automated notification to the sales rep's workspace and log an audit timestamp.

| **Must** |
| **FR-HLT-06** | **Dynamic Escalation Routing:** Provide a one-click manager action on discount anomalies to re-route pending deals into the Finance approval queue (Screen 5/6).

| **Must** |

---

### 5. Non-Functional Requirements

- **Diagnostic Scan Latency:** Evaluating Deal Health rules across 1,000+ active quotes and open fulfillments must complete in under 500 ms without locking transactional tables.
- **Calculation Precision:** Tax aggregations and remaining balance calculations on Screen 13 must strictly compute using two-decimal banker's rounding to eliminate penny rounding errors across line items.
- **Notification Reliability:** Automated alerts and rep nudges generated by Deal Health engines must dispatch within 5 seconds of rule violation triggers.

---

### 6. Open Questions / Ambiguities to Clarify With Dev Team

- **Baseline Sample Size for Discount Anomalies:** How many completed deals must a sales rep close before the system has enough data to calculate their historical mean ($\mu_{\text{rep}}$) and standard deviation? Should junior reps default to company-wide tier benchmarks?
- **Stalled Deal Working vs. Calendar Days:** Does the inactivity clock on stalled deals run on calendar days or business days (excluding weekends and regional holidays)?
- **Automated Escalation Rule:** Can Deal Health be configured to auto-escalate stagnant quotes after $N$ unacknowledged nudges, or must escalations remain manually triggered by managers?

---

### 7. Test Cases (for QA)

| # | Scenario | Steps to Execute | Expected Result |
| --- | --- | --- | --- |
| **1** | **Invoice Detail Display** | Navigate from Screen 12 to Screen 13 by clicking `INV-9011`. |  |

| Renders line items, discounts, customer billing details, and $0 paid balance matching ledger record.

|
| **2** | **Partial Payment Execution** | On Screen 13 ($2,286.24 total), click `Record Payment`, input $1,000.00, and confirm.

| Status switches to `Partially Paid`; `Amount Paid` reflects $1,000.00; `Balance Due` displays exactly $1,286.24.

|
| **3** | **Stalled Deal Detection** | Seed a quote with `Last Activity Date` 6 days prior (threshold set to 5 days).

| Deal appears in Screen 14 "Stalled Deals" feed with high-risk badge and active `Send Nudge` action.

|
| **4** | **Discount Anomaly Trigger** | Rep with 7% historical average submits a quote offering 24% discount.

| Screen 14 flags quote in "Discount Anomaly" feed; displays delta (+17pt) and blended risk level.

|
| **5** | **Delivery Slippage Alert** | Create order with 3-day promised delivery where 4 units are marked `Backorder` (Screen 8).

| Screen 14 flags order under "Delivery Slippage" with bottleneck notice pointing to backorder depot.

|
| **6** | **Deep-Link from Anomaly** | Click quotation badge on a discount anomaly alert in Screen 14.

| Browser deep-links directly to Quotation Detail (Screen 4) with the discount risk breakdown visible.

|
| **7** | **Automated Rep Nudge** | Click `Send Nudge` on a stalled quotation row in Screen 14.

| Rep's dashboard displays alert; deal audit history logs: `"Management nudge dispatched"`.

|