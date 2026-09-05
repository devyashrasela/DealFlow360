# Fulfillment & Stock Management
 List

**Screens:** Screen 7 (Fulfillment and Stock List) & Screen 8 (Fulfillment & Warehouse Split Detail)  

---

### 1. Purpose

The Fulfillment module bridges confirmed sales agreements with physical inventory distribution. It provides inventory visibility across multiple depots and runs auto-split algorithms to minimize shipping costs and parcel counts.

- **Screen 7 (Fulfillment List):** Serves as an operational cockpit displaying real-time warehouse inventory balances alongside confirmed orders queued for delivery.
- **Screen 8 (Fulfillment Detail / Split Screen):** Allows Operations and Finance users to inspect algorithm-recommended multi-warehouse shipment splits, adjust allocations manually, handle backorders, and execute consolidation prompts when stock arrives mid-fulfillment.

---

### 2. Users

| Role | Permissions & Operational Scope |
| --- | --- |
| **Finance / Operations** | Primary operator. Reviews stock levels, confirms or overrides warehouse splits, manages backorder consolidations, and authorizes multi-shipment dispatch. |

|
| **Sales Rep** | Read-only access. Tracks dispatch progress, shipment counts, backorder states, and expected delivery ETAs for their assigned deals.

|
| **Sales Manager** | Oversight access. Monitors fulfillment bottlenecks, split costs impacting deal margins, and delivery slippage flags.

|
| **Admin** | Configures warehouses, initial stock allocations, reorder rules, and shipping cost weights.

|

---

### 3. Screen Layout (as per mockup & spec)

#### 3.1 Persistent Top Navigation

- **DealFlow360** brand link
- **Module Tabs:** Dashboard | Quotations | Approvals | **Fulfillment** *(Active/Highlighted)* | Subscriptions | Invoices | Deal Health | Reports

#### 3.2 Screen 7 Layout: Fulfillment and Stock (List)

- **Header:**
- Title: `"Fulfillment and Stock (List)"`
- Subtitle: `"Live stock per warehouse, plus every order that still needs fulfilling"`
- **Section 1: Live Stock Inventory Table**
- Displays real-time inventory balances aggregated by storage location.

| Warehouse | Product | In Stock | Reserved | Available |
| --- | --- | --- | --- | --- |
| Main Warehouse | Laptop Pro 14 | 40 | 18 | 22 |

|
| East Depot | Laptop Pro 14 | 10 | 6 | 4

|
| Main Warehouse | Docking Station | 65 | 12 | 53

|

- **Section 2: Orders Awaiting Fulfillment Table**
- Reverse-chronological table of confirmed orders requiring dispatch.
- Columns: `Order #` | `Customer` | `Status` | `Warehouses Assigned`
- Row interaction: Clicking any row navigates directly to **Screen 8 (Fulfillment Detail)** for that order.

---

#### 3.3 Screen 8 Layout: Fulfillment Detail & Warehouse Split

- **Header & Order Summary Banner:**
- Title: `"Fulfillment Plan: Order #[ID] ([Customer Name])"`
- Metadata strip: Order Status, Total Quantity Required, Confirmed Date, Shipping Cost Weight Tier.
- **Backorder Alert Banner (Conditional):**
- Appears if total demand across all line items exceeds total network available stock.
- Label: *"Insufficient total stock across network. Backorder generated for [X] units."*
- **Consolidation Prompt (Conditional):**
- Yellow/amber banner: *"Stock arrived mid-fulfillment for East Depot. Consolidate remaining backorder to reduce shipments?"*
- Action button: `Consolidate Remaining Backorder`.
- **Recommended Warehouse Split Card:**
- Algorithm recommendation view based on stock location and shipment optimization.
- Metrics displayed: Warehouse Name, Assigned Quantity, Estimated Shipment Count, Estimated Shipping Cost.
- **Split Allocation Matrix Table:**
- Line-item breakdown displaying:
- `Product` | `Ordered Qty` | `Main Warehouse Fulfillment` | `East Depot Fulfillment` | `Backorder Qty`
- Inline editable inputs appear when `Manual Override` is activated.
- **Bottom Action Bar:**
- `Accept Suggested Split` (Primary Blue button)
- `Manual Override` (Secondary Neutral button)
- `Cancel / Return to List`

---

### 4. Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| **FR-FUL-01** | **Stock Inventory Display:** Screen 7 must pull live physical stock (`In Stock`), committed allocations (`Reserved`), and net balance (`Available = In Stock - Reserved`) per warehouse per SKU. |  |

| **Must** |
| **FR-FUL-02** | **Orders Queue Ingestion:** Automatically ingest orders into Screen 7 once they enter `Confirmed` status from internal approval or customer portal acceptance.

| **Must** |
| **FR-FUL-03** | **Automated Split Optimization:** Upon order intake, run allocation logic factoring warehouse proximity/stock and shipping cost weights to minimize total shipments.

| **Must** |
| **FR-FUL-04** | **Single vs. Multi-Warehouse Routing:** If a single warehouse can fulfill 100% of an order, prioritize it. If split is unavoidable, route partial quantities across warehouses with available stock.

| **Must** |
| **FR-FUL-05** | **Backorder Handling:** If network stock is insufficient for a line item, allocate all available units and designate remaining balance as `Backorder`.

| **Must** |
| **FR-FUL-06** | **Manual Split Override:** Provide an editable grid on Screen 8 enabling Operations users to reassign fulfillment quantities across warehouses manually.

| **Must** |
| **FR-FUL-07** | **Inventory Reservation Locks:** Adjust `Reserved` counts immediately upon order confirmation or manual split acceptance to prevent double-allocation.

| **Must** |
| **FR-FUL-08** | **Validation Boundaries:** Prevent manual override entries that exceed physical available stock at any selected warehouse or where total allocated units exceed ordered quantity.

| **Must** |
| **FR-FUL-09** | **Live Consolidation Trigger:** If a replenishment stock transaction is posted while an order has an open backorder, trigger the dynamic `"Consolidate Remaining Backorder"` prompt.

| **Should** |
| **FR-FUL-10** | **Shipment Cost Recalculation:** Update estimated shipment count and carrier fees dynamically when allocations are manually altered.

| **Must** |
| **FR-FUL-11** | **Audit Trail Logging:** Record every split confirmation, manual override, warehouse reassignment, and backorder release with user ID, timestamp, and reason.

| **Must** |
| **FR-FUL-12** | **Global Refresh Hook:** Re-query stock balances and order statuses upon invoking the global `"Reload Data"` top navigation trigger.

| **Must** |

---

### 5. Non-Functional Requirements

- **Concurrency & Race Condition Prevention:** Strict database row locking or transactional isolation on SKU stock levels to prevent race conditions during concurrent multi-order split processing.
- **Calculation Latency:** Auto-split recommendation generation must take less than 300 ms for orders containing up to 50 distinct line items.
- **Accuracy:** Zero variance between physical ledger entries and displayed sums ($In\ Stock - Reserved = Available$).

---

### 6. Open Questions / Ambiguities to Clarify With Dev Team

- **Shipping Weighting Rules:** PDF Section A4 specifies configuring shipping cost weights to minimize shipments. What is the exact optimization function? Is it:

$$
\min (\text{Shipments} \times \text{Base Rate} + \sum \text{Unit Distance Cost})
$$

or a simpler greedy choice prioritizing the primary warehouse?

- **Partial Dispatch Invoicing:** When an order is split into 2 shipments across 2 days, does the system produce 2 partial delivery slips and 1 consolidated invoice, or multiple partial invoices?
- **Backorder Auto-Release:** When restocking occurs, should the system automatically allocate stock to backorders based on FIFO order age, or require Operations to click "Consolidate Remaining Backorder" manually?

---

### 7. Test Cases (for QA)

| # | Scenario | Steps to Execute | Expected Result |
| --- | --- | --- | --- |
| **1** | **Stock Ledger Integrity** | Verify Main Warehouse: 40 In Stock, 18 Reserved. |  |

| Available displays exactly 22.

|
| **2** | **Single Warehouse Fit** | Confirm order for 5 Laptop Pro 14s when Main Warehouse has 22 Available.

| Auto-split assigns 100% (5 units) to Main Warehouse; shipment count = 1.

|
| **3** | **Multi-Warehouse Auto Split** | Confirm order for 25 Laptop Pro 14s (Main has 22, East Depot has 4 available).

| System suggests split: 22 from Main Warehouse, 3 from East Depot; shipment count = 2.

|
| **4** | **Partial Stock & Backorder** | Order 30 Laptop Pro 14s (total network available = 26).

| System allocates 26 units across Main & East; sets 4 units to Backorder; triggers Backorder notice.

|
| **5** | **Manual Override Flow** | On Screen 8, click "Manual Override" and adjust allocation from 22/3 to 20/5.

| System recalculates estimated shipping cost and allows submission without error.

|
| **6** | **Manual Override Over-allocation** | Enter 10 units for East Depot when only 4 are available.

| Form validation blocks submission: *"Entered quantity exceeds available depot stock."* |
| **7** | **Mid-Fulfillment Consolidation** | Create backordered deal; simulate inward stock receipt on backend.

| Screen 8 displays dynamic `"Consolidate Remaining Backorder"` prompt.

|
| **8** | **List to Detail Deep Link** | On Screen 7, click Order row awaiting fulfillment.

| Opens Screen 8 with data preloaded for that exact order ID.

|