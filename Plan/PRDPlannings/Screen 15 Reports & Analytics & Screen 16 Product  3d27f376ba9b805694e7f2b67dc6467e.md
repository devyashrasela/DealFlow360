# Screen 15: Reports & Analytics & Screen 16: Product & Pricing Admin

# 1. Purpose

These modules bridge executive performance intelligence with core catalog administration.

- **Screen 15 (Reports & Analytics):** The primary data querying interface accessed via the `Reports` navigation tab. It enables managers to filter and audit sales volume, discounting discipline, and operational bottlenecks, providing exportable reports for offline review.
- **Screen 16 (Product, Price List & Upsell Admin):** Located in the backend configuration area. This module manages product master data, variant matrices, tier-based price lists, and the algorithmic parameters for the upsell/cross-sell recommendation engine.

### 2. Users

| **Role** | **What they see / can do here** |
| --- | --- |
| **Sales Manager** | Primary consumer of Screen 15. Analyzes rep-level discounting patterns, win/loss rates, and team revenue. Reviews active tier price lists on Screen 16.   |
| **Finance / Operations** | Monitors gross margin realization, category discount leakage, and subscription revenue trends on Screen 15. Audits catalog cost bases (COGS) on Screen 16.   |
| **Admin** | Full read/write access. Configures products, variants, price list rules, upsell pairings, and margin cutoffs. Runs system-wide analytics.   |
| **Sales Rep** | Read-only access to Screen 15 scoped strictly to their personal performance metrics. View-only access to Screen 16 to inspect active price lists and promoted bundles.   |

### 3. Screen Layout

#### 3.1 Screen 15: Reports & Analytics Layout

- **Top Navigation:**
    - Dashboard | Quotations | Approvals | Fulfillment | Subscriptions | Invoices | Deal Health | **Reports** *(Active)*
- **Header & Global Controls:**
    - Title: `"Sales Performance & Governance Reports"`
    - Subtitle: `"Audit quotation throughput, discount leakage, approval bottlenecks, and category margins"`
    - Export Toolbar (Right Aligned): `Export to PDF` | `Export to XLS`
- **Dynamic Filter Bar (Module A7):**
    - `Period`: Dropdown (`Today`, `This Week`, `Custom Range`).
    - `Sales Team / Rep`: Multi-select dropdown (`All Teams`, `Inside Sales`, or individual rep search) to analyze individual/team performance.
    - `Approval Status`: Filter pills (`All`, `Pending`, `Approved`, `Rejected`).
    - `Product / Category`: Dropdown (`All Categories`, `Hardware`, `Services`, `Subscriptions`) to track best-selling or most discounted items.
- **KPI Summary Cards (Top Row):**
    - `Total Bookings`: Total confirmed order value across the filtered period.
    - `Blended Gross Margin %`: Realized margin after all applied discounts.
    - `Total Discount Leakage ($)`: Cumulative dollar reduction given away from list price.
- **Report Matrix Views (Two Primary Tabs):**
    - **Tab 1: Sales Rep & Discount Discipline Report:**
        - Columns: `Sales Rep` | `Team` | `Deals Closed` | `Net Revenue` | `Avg Discount Given` | `Quotes Flagged (Risk)` | `Realized Margin %`
    - **Tab 2: Product & Category Performance Report:**
        - Columns: `Product Name` | `Category` | `Units Sold` | `Gross Revenue` | `Total Discount Given ($)` | `Avg Discount %` | `Realized Gross Margin %`

#### 3.2 Screen 16: Product, Price List & Upsell Admin Layout

- **Access Route:** Opened via `"Go to Back-end"` action from the rep workspace.
- **Header:**
    - Title: `"Product Catalog & Pricing Configuration"`
    - Primary Button: `+ Create Product`
- **Catalog Configuration Tabs:**
    - **Tab 1: Master Product Catalog (Module A2):**
        - Master Data Table: `SKU Code` | `Product Name` | `Category` | `Base Price` | `Unit Cost` | `Tax Rate` | `Variant Count` | `Actions`
        - Slide-over Product Editor Drawer:
            - Base Info: Name, Category, Price, Unit, Tax, Product Description.
            - Variant Matrix Creator: Attribute Name (e.g., `Size` or `Pack`), Values, Extra Prices (e.g., `+$200`).
    - **Tab 2: Price Lists (Module A2):**
        - Manages base price adjustments.
        - Fields: `Customer Tier-Based Pricing` (e.g., Bronze, Silver, Gold).
        - Configuration: `Currency Specific Rules`.
    - **Tab 3: Upsell & Cross-Sell Engine Setup (Module A6):**
        - Configuration controls for the recommendation panel:
        - Global Parameter Card:
            - `Minimum Margin Threshold`: Number input. Margin healthy suggestions surface only above this limit.
        - Co-Purchase Rule Pairing Table:
            - Columns: `Trigger Product` | `Suggested Pairing` | `Historical Co-Purchase %` | `Promoted Tag` | `Status`
            - Actions: `Mark as Promoted` (ranks higher in suggestions) | `Remove Pairing`.

### 4. Functional Requirements

| **ID** | **Requirement Description** | **Priority** |
| --- | --- | --- |
| **FR-REP-01** | **Multi-Dimensional Query Engine:** Screen 15 must aggregate quotes, invoices, and fulfillment data across selected Period, Team, Rep, Approval Status, and Category filters.   | **Must** |
| **FR-REP-02** | **PDF Export Generation:** The `Export to PDF` action must produce a summary document showing selected filters, top KPI cards, and current data tables.   | **Must** |
| **FR-REP-03** | **XLS Export Generation:** The `Export to XLS` action must export raw filtered rows with complete mathematical fields.   | **Must** |
| **FR-PRD-01** | **Product & Variant Creation:** Admins must be able to create products with attributes and extra prices for variants.   | **Must** |
| **FR-PRD-02** | **Tier-Based Price List Application:** System must support tier-based base pricing alongside currency specific rules.   | **Must** |
| **FR-PRD-03** | **Upsell Margin Filter:** Suppress any add-on suggestion if its gross margin is lower than the configured `Minimum Margin Threshold`.   | **Must** |
| **FR-PRD-04** | **Promoted Tag Ranking:** Promoted products must receive a ranking boost to prioritize sponsored inventory in the Quotation Builder suggestions.   | **Must** |
| **FR-PRD-05** | **Historical Co-Purchase Pairings:** Allow administrators to define product pairings based on historical co-purchase data.   | **Must** |

### 5. Non-Functional Requirements

- **Reporting Aggregation Latency:** Filtered analytical queries on Screen 15 across historical orders must return and render charts/tables in under 600 ms.
- **Pricing Rule Integrity:** Updates to tier price lists or variant surcharges on Screen 16 must propagate to new quotation lines immediately without altering existing locked, confirmed, or invoiced orders.

### 6. Open Questions & Ambiguities to Clarify With Dev Team

- **Automated vs. Manual Co-Purchase Mining:** Will the hackathon scope require an actual automated script to mine historical co-purchases, or can admins manually define these pairings in Screen 16 for demonstration purposes?
- **Role-Based Row Redaction on Reports:** When a Sales Rep views Screen 15, should the team filter lock to their own user ID, hiding peer rep discounting habits?
- **Currency Specific Rules Execution:** Does multi-currency support (listed as a bonus) require active exchange rate API polling, or are static conversion multipliers set in the Price List config acceptable?

### 7. Test Cases (for QA)

| **#** | **Scenario** | **Steps to Execute** | **Expected Result** |
| --- | --- | --- | --- |
| **1** | **Date Filter Execution** | On Screen 15, select Period = "This Week" and Category = "Hardware".   | KPI cards and product breakdown update to show only hardware deals falling within the current week.   |
| **2** | **Export Format Integrity** | Click `Export to XLS` on Screen 15.   | Downloads a `.xlsx` file matching active table filters.   |
| **3** | **Create Product Variant** | On Screen 16, edit a product, add Variant Attribute "Pack" with Price Delta `+$50`.   | Quotation Builder renders dropdown option; selecting the variant updates unit price automatically.   |
| **4** | **Tier Price List Application** | Configure a specific price list for a customer tier. Build a quote for a customer in that tier.   | Base catalog price reflects the tier's list price before custom line discounts are applied.   |
| **5** | **Promoted Upsell Tag Boost** | On Screen 16, mark an accessory as Promoted.   | On the quotation builder, the accessory surfaces higher in the suggestions list.   |
| **6** | **Minimum Margin Threshold Cutoff** | Set Minimum Margin Threshold to 30%. Add product pairing with 22% margin.   | System suppresses the pairing from the Upsell Panel when building a quote. |