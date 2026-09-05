# Discount Governance & Blended Risk Engine

# 1. Purpose

This module is the operational core of DealFlow360's "self-governing" mandate. Rather than relying on simple, easily exploitable flat discount rules, Screens 17 and 18 configure a mathematical Blended Risk Engine. It prevents margin leakage by evaluating every single line item against intersecting customer and product constraints, ensuring that reps cannot quietly drain profitability through widespread micro-discounts. It dynamically routes quotes to the correct level of authority based on calculated risk slabs.

### 2. Users

| **Role** | **Permissions & Operational Scope** |
| --- | --- |
| **Admin** | Full read/write access. Configures baseline customer tier ceilings, category limits, margin hard-stops, and approval routing slabs.   |
| **Sales Manager** | Consults these rules to understand why a deal was flagged for their queue. Reviews the Blended Risk Score breakdown during quotation approval.   |
| **Finance / Operations** | Establishes the ultimate gross margin floor. Acts as the final escalation authority for High-Risk (Slab 3) deals.   |
| **Sales Rep** | Never accesses these screens directly, but is governed by their rules in real-time on the Quotation Builder (Screen 4).   |

### 3. Screen Layout

#### 3.1 Screen 17: Baseline Discount Ceilings (The "Safe Zones")

- **Top Navigation:** Dashboard | Quotations | Approvals | Fulfillment | Subscriptions | Invoices | Deal Health | Reports | **Governance** *(Active)*
- **Header:** `"Discount Ceilings Configuration"`
- **Customer Tier Ceilings Table:**
    - Defines the maximum overall discount allowed per account type.
    - Grid: `Tier Name` | `Max Discount %` | `Actions`
    - Default rows: `Bronze` (5%) | `Silver` (10%) | `Gold` (15%).
- **Product Category Ceilings Table:**
    - Defines maximum discretionary discounts based on inherent product margins.
    - Grid: `Category` | `Max Discount %` | `Actions`
    - Default rows: `Hardware` (15%) | `Services` (10%) | `Subscriptions` (5%).

#### 3.2 Screen 18: Risk Slabs & Margin Guardrails

- **Top Navigation:** Dashboard | Quotations | Approvals | Fulfillment | Subscriptions | Invoices | Deal Health | Reports | **Risk & Margins** *(Active)*
- **Header:** `"Approval Slabs & Margin Guardrails"`
- **Blended Risk Routing Slabs (Module A3):**
    - Configures the escalation paths for the calculated Blended Risk Score.
    - **Slab 1 (Rep Autonomy):** Threshold: `0 Points Over`. Route: `Auto-Approve`.
    - **Slab 2 (Standard Risk):** Threshold: `> 0 to 5 Points Over`. Route: `Sales Manager`.
    - **Slab 3 (High Risk):** Threshold: `> 5 Points Over`. Route: `Sales Manager + Finance`.
- **Global Margin Guardrails Card (Module A6):**
    - `Minimum Upsell Margin Threshold`: Number input (e.g., `20%`). Suppresses algorithmic suggestions that fall below this profit margin.
    - `Absolute Margin Hard Stop`: Number input (e.g., `10%`). If the quotation's total blended margin drops below this floor, the system disables the "Submit for Approval" button entirely.

### 4. The Core Algorithm: Blended Discount Risk Score

To prevent a rep from keeping every line technically within limits while still discounting the order more than intended, the engine executes the following logic live during quote building:

**Step 1: Determine Effective Line Limit**
For every line item $i$, the system checks both the Customer Tier and the Product Category.

$$\text{Limit}_i = \min(\text{Customer Tier Ceiling}, \text{Category Ceiling}_i)$$

**Step 2: Calculate Line-Item Excess**
The system calculates how many percentage points the rep exceeded the specific limit.

$$\text{Excess}_i = \max(0, \text{Discount Applied}_i - \text{Limit}_i)$$

**Step 3: Calculate the Blended Risk Score**
The final score evaluates the total pattern across the order. It penalizes both severe individual line breaches ($E_{\max}$) and widespread margin bleed ($W_{\text{bleed}}$):

$$E_{\max} = \text{Highest single line Excess}_i$$

$$W_{\text{bleed}} = \frac{\sum (\text{Excess}_i \times \text{Line Revenue}_i)}{\text{Total Order Revenue}}$$

$$\text{Blended Risk Score} = (0.6 \times E_{\max}) + (0.4 \times W_{\text{bleed}})$$

### 5. Functional Requirements

| **ID** | **Requirement** | **Priority** |
| --- | --- | --- |
| **FR-GOV-01** | **Intersecting Ceilings:** The engine must independently evaluate every line item on a quotation against its own specific limit, not just one overall limit for the whole order.   | **Must** |
| **FR-GOV-02** | **Live Score Computation:** The Blended Risk Score must recalculate instantaneously in the Quotation Builder UI whenever a rep adjusts a product's price, discount, or quantity.   | **Must** |
| **FR-GOV-03** | **Automated Routing:** Upon clicking "Submit", the system must evaluate the final Blended Risk Score against the configured Admin Slabs to automatically route the quote to `Approved`, `Manager Queue`, or `Finance Queue`.   | **Must** |
| **FR-GOV-04** | **Mixed Category Risk Blending:** When a quote mixes categories with different ceilings, the system must compute the blended risk score and route to the highest required level.   | **Must** |
| **FR-GOV-05** | **Margin Hard Stop:** If the gross margin of the entire cart falls below the Admin-defined `Absolute Margin Hard Stop`, the quotation submission must be blocked. | **Must** |
| **FR-GOV-06** | **Audit Trail Logging:** All approvals, rejections, edits, and routing events must be immutably logged with the acting user ID, timestamp, and reason.   | **Must** |

### 6. Non-Functional Requirements

- **Calculation Latency:** The $O(N)$ iteration across quotation lines to compute the Blended Risk Score must resolve in under $50\text{ms}$ to ensure the rep experiences no lag while editing the cart.
- **Precision:** All discount checks and margin aggregations must utilize fixed-point decimal arithmetic (rounding to two decimal places) to prevent bypasses caused by floating-point rounding errors (e.g., $5.001\%$ bypassing a $5.00\%$ limit).

### 7. QA Test Cases (Proving the Engine to Judges)

| **#** | **Scenario & Admin Configuration** | **Rep Action** | **Expected System Result** |
| --- | --- | --- | --- |
| **1** | **Customer:** Gold (15% limit).  

**Product:** Laptop (Hardware, 15% limit).   | Rep applies exactly a 15% discount. | Line Excess = $0$. Blended Risk Score = $0$. Quote Auto-Approves.   |
| **2** | **Customer:** Bronze (5% limit).  

**Product:** Setup Service (Services, 10% limit). | Rep applies an 8% discount. | Effective limit is 5% (Customer ceiling is lower). Line Excess = 3 points. Triggers Slab 2: routes to Sales Manager.   |
| **3** | **Mixed Category Quote**

**Customer:** Gold (15% limit).  

Line 1: Laptop (H/W, 15% limit).  

Line 2: Setup Service (Service, 10% limit).   | Rep applies 12% to Laptop.

Rep applies 18% to Setup Service.   | Laptop is fine ($12\% < 15\%$). Service is 8 points over its own stricter limit. Blended Score $> 5$. Routes to Sales Manager, followed by Finance.   |
| **4** | **Death by a Thousand Cuts**

Customer allowed 10% overall limit. | Rep applies 11% discount across 50 different line items. | No single line is severely over (Max Excess = 1), but $W_{\text{bleed}}$ formula aggregates the widespread margin loss. Routes to Sales Manager for review.   |
| **5** | **Margin Hard Stop**

Admin sets Absolute Hard Stop at 10%. | Rep discounts a heavily priced hardware item down to a 5% net margin. | System disables the "Submit" button entirely. UI displays: `"Margin error: Minimum threshold of 10% breached."` |