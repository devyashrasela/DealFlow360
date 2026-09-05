# Customer Subscriptions & Recurring Billing

**Product:** DealFlow360

**Screens:** Screen 9 (Subscriptions List) & Screen 10 (Subscription Detail / Billing Schedule)

### 1. Purpose

The Subscriptions module manages all active, recurring revenue contracts sold to customers. While physical items route through Fulfillment (Screens 7 & 8), recurring lines (SaaS licenses, monthly maintenance, service retainers) generate living subscription records.

- **Screen 9 (Subscriptions List):** Central register displaying all active, paused, past-due, and cancelled customer contracts, giving operators instant visibility into recurring revenue, billing frequency, and renewal dates.
- **Screen 10 (Subscription Detail):** Deep-dive workspace for an individual contract displaying the parent order origin, upcoming 12-month billing schedule, real-time mid-cycle proration adjustments, and contract cancellation/credit note workflows.

### 2. Users

| **Role** | **Permissions & Operational Scope** |
| --- | --- |
| **Finance / Operations** | Primary operator. Executes plan/quantity changes, triggers cancellations, authorizes mid-cycle proration invoices, and issues partial refund credit notes.   |
| **Sales Rep** | Read-only with edit requests. Reviews contract status, upcoming billing milestones, and renewal dates to drive upsell and cross-sell motions.   |
| **Sales Manager** | Oversight. Evaluates churn, subscription health, recurring discount ceilings, and margin impact across recurring lines.   |
| **Admin** | Manages recurring plan templates, standard billing intervals (monthly/quarterly/yearly), and default proration policies.   |

### 3. Screen Layout

#### 3.1 Persistent Top Navigation

- **DealFlow360** brand link
- **Module Tabs:** Dashboard | Quotations | Approvals | Fulfillment | **Subscriptions** *(Active/Highlighted)* | Invoices | Deal Health | Reports

#### 3.2 Screen 9 Layout: Subscriptions (List)

- **Header:**
    - Title: `"Customer Subscriptions (List)"`
    - Subtitle: `"Active recurring contracts, billing schedules, and renewal lifecycles"`
- **Summary KPI Cards (Row of 3):**
    - `Active Subscriptions`: Total active contract count.
    - `Monthly Recurring Revenue (MRR)`: Aggregated monthly normalized revenue.
    - `Renewals in Next 30 Days`: Count of contracts approaching scheduled cycle renewal.
- **Subscriptions Data Table:**
    - Displays one row per recurring customer agreement.
    - Columns:
        - `Subscription ID` (e.g., `SUB-4021`)
        - `Customer` (e.g., `Acme Corp`)
        - `Plan Name / Product` (e.g., `Cloud Security Retainer`)
        - `Billing Cadence` (Monthly, Quarterly, Yearly)
        - `Recurring Amount` (Normalized MRR/ARR)
        - `Next Invoice Date` (YYYY-MM-DD)
        - `Status` (`Active` [Green], `Past Due` [Red], `Paused` [Yellow], `Cancelled` [Gray])
    - Row interaction: Clicking any row navigates directly to **Screen 10 (Subscription Detail)**.

#### 3.3 Screen 10 Layout: Subscription Detail & Schedule

- **Header & Contract Banner:**
    - Title: `"Subscription Detail: SUB-[ID] ([Customer Name])"`
    - Status Pill: `Active` | `Cancelled` | `Pending Proration`
    - Metadata bar: Parent Order Link (`SO-XXXX`), Contract Start Date, Current Billing Cycle Date, Payment Method on File.
- **Contract Terms Card (Two-Column Layout):**
    - **Left Column (Plan Specifications):** Base Product, Plan Interval, Unit Price, Current Seat/Quantity Count, Applied Recurring Discount.
    - **Right Column (Financial Summary):** Current MRR, Lifetime Value Invoiced to Date, Unbilled Accruals, Next Invoice Trigger Date.
- **Action Button Toolbar (Top Right):**
    - `Modify Plan / Quantity` (Primary Blue button)
    - `Cancel Subscription` (Destructive Outline button)
    - `View Invoices` (Secondary link → jumps to Screen 12 filtered by subscription)
- **Upcoming Billing Schedule Matrix Table:**
    - 12-month forward-looking projection table.
    - Columns: `Cycle #` | `Billing Date` | `Base Charge` | `Proration / Delta` | `Expected Total` | `Invoice Status`
    - Status options: `Paid` (with link to invoice), `Scheduled`, `Drafted`.
- **Mid-Cycle Modification Modal (Interactive Trigger):**
    - Opens upon clicking `Modify Plan / Quantity`.
    - Inputs: New Quantity (`+` / ), Effective Date picker.
    - **Live Proration Calculator Callout:**
        - Displays remaining days in cycle: $d_{\text{remaining}} / d_{\text{total}}$
        - Displays immediate proration adjustment:
            
            $$\Delta \text{Charge} = \left(\frac{d_{\text{remaining}}}{d_{\text{total}}}\right) \times (\text{New Quantity} - \text{Old Quantity}) \times \text{Unit Price}$$
            
        - Actions: `Apply Changes & Issue Invoice Now` | `Cancel`
- **Cancellation & Partial Refund Modal (Interactive Trigger):**
    - Opens upon clicking `Cancel Subscription`.
    - Selection Radio Buttons:
        - `Cancel at Period End`: Remains active until current cycle terminates; no refund.
        - `Cancel Immediately (Prorated Partial Refund)`: Immediate deactivation; auto-generates credit note for unused balance.
    - Refund calculation indicator: Unused Days $\times$ Daily Rate = Credit Note Amount.
    - Actions: `Confirm Cancellation` | `Keep Subscription`

### 4. Functional Requirements

| **ID** | **Requirement** | **Priority** |
| --- | --- | --- |
| **FR-SUB-01** | **Automatic Provisioning:** On confirmation of a sales quotation containing recurring lines, automatically generate a dedicated record in Screen 9.   | **Must** |
| **FR-SUB-02** | **Hybrid Order Line Split:** Retain the link between the subscription and the parent Order ID while segregating recurring lines from one-time fulfillment items.   | **Must** |
| **FR-SUB-03** | **Dynamic Billing Schedule Generation:** Screen 10 must compute and render the future billing schedule according to configured plan interval (monthly, quarterly, yearly).   | **Must** |
| **FR-SUB-04** | **Exact Mid-Cycle Daily Proration:** Compute plan/quantity adjustments mid-cycle using daily proration: $\frac{\text{Days Remaining}}{\text{Days in Cycle}} \times \Delta\text{Price}$.   | **Must** |
| **FR-SUB-05** | **Immediate Proration Invoicing:** When seats or plans are added mid-cycle, generate an immediate supplemental invoice for the prorated delta and update future cycle amounts.   | **Must** |
| **FR-SUB-06** | **Mid-Cycle Downgrade Credit:** When quantity decreases mid-cycle, calculate the overpaid balance and post an automatic credit note to the customer's ledger.   | **Must** |
| **FR-SUB-07** | **Two-Tier Cancellation Logic:** Support both immediate termination with auto-credit notes and non-refund termination at cycle conclusion.   | **Must** |
| **FR-SUB-08** | **Automatic Credit Note Creation:** Selecting immediate cancellation must immediately generate a linked `Credit Note` in Screen 12/13 with reference to unused days.   | **Must** |
| **FR-SUB-09** | **Audit Trail Logging:** All lifecycle changes (tier change, seat adjustment, pause, cancellation) must record user ID, timestamp, prior value, and new value.   | **Must** |
| **FR-SUB-10** | **Global Refresh Hook:** Re-aggregate active MRR and schedule statuses when the global `"Reload Data"` top navigation trigger is clicked.   | **Must** |

### 5. Non-Functional Requirements

- **Financial Precision:** All recurring formulas and proration amounts must compute using decimal floating-point arithmetic (rounded strictly to two decimal places, banker's rounding) to prevent fractional cent drift over multi-year schedules.
- **Idempotency:** Billing schedule milestone runners must be idempotent; a re-triggered cron or batch invoice job must never create duplicate invoices for the same subscription billing period.
- **Performance:** Screen 10 schedule projections (up to 36 periods forward) must compute and render in under 200 ms.

### 6. Open Questions / Ambiguities to Clarify With Dev Team

- **Leap Year Proration:** For annual recurring contracts running across February in a leap year, is daily proration calculated using dynamic cycle lengths (366 days) or standard commercial 365-day years?
- **Proration Discount Retention:** If a sales rep applied a one-off 10% discount to the initial quotation line, does the discount automatically cascade into mid-cycle seat additions, or do seat expansions revert to list price?
- **Tax Recalculation on Prorated Credit Notes:** When generating an immediate partial refund credit note for unused days, should line-item sales taxes be credited back proportionally or handled separately?

### 7. Test Cases (for QA)

| **#** | **Scenario** | **Steps to Execute** | **Expected Result** |
| --- | --- | --- | --- |
| **1** | **Hybrid Order Provisioning** | Confirm Quotation containing 1 Laptop ($1,200 one-time) and 1 SaaS Plan ($100/mo).   | Laptop routes to Fulfillment (Screen 7); SaaS plan provisions new contract in Screen 9.   |
| **2** | **12-Month Schedule Projection** | Open Screen 10 for a monthly subscription starting Jan 1.   | Schedule table displays exactly 12 subsequent monthly cycles with expected due dates and base amounts.   |
| **3** | **Mid-Cycle Quantity Addition** | On day 15 of a 30-day month, increase quantity from 10 to 20 seats at $10/seat.   | System calculates $\frac{15}{30} \times 10 \times \$10 = \$50$ proration; immediately generates a $50 invoice; updates next cycle base to $200.   |
| **4** | **Immediate Cancellation & Partial Refund** | On day 10 of a 30-day month ($300/mo paid upfront), click Cancel Subscription → Immediate.   | Contract changes to `Cancelled`; auto-generates a Credit Note for 20 unused days ($200); cancels future schedule items.   |
| **5** | **Period-End Cancellation** | Select "Cancel at Period End" on active contract.   | Contract remains `Active` with tag `Pending Cancellation`; status switches to `Cancelled` only when current billing period elapses; no credit note is generated.   |
| **6** | **Navigation Deep Link** | From Screen 9 table, click row `SUB-4021`.   | Opens Screen 10 populated with exact customer metadata, terms, and schedule history for `SUB-4021`. |