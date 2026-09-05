# Test Plan — Screen 7: Fulfillment and Stock (List)

**Product:** DealFlow360
**Source:** PRD_Screen7_Fulfillment_List (mockup Screen 7 frame + PDF Section A4, B6)

---

## 1. Test Scope

Covers the live per-warehouse stock table and the orders-awaiting-fulfillment queue, plus navigation into Screen 8. Note: Screen 8 (Fulfillment Detail) itself has no test plan yet since no spec was uploaded for it — this plan covers only the list/entry screen.

---

## 2. Preconditions / Test Data Setup

- At least one product stocked across 2+ warehouses with different quantities (e.g., Laptop Pro 14: Main Warehouse 40, East Depot 10).
- A confirmed order not yet fulfilled, ready to appear in the queue.
- A scenario where combined stock across all warehouses is insufficient for an order (to test backorder handling downstream).

---

## 3. Functional Test Cases — Stock Table

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| FUL7-01 | Per-warehouse stock display | View the stock table | Warehouse, Product, In Stock columns populate correctly, with the same product shown independently per warehouse | Must |
| FUL7-02 | Stock updates on consumption | Fulfill an order drawing from Main Warehouse | "In Stock" for that warehouse/product decrements on next reload | Must |
| FUL7-03 | Stock updates on replenishment | Increase stock via backend config | Reflected here after Reload Data | Must |

---

## 4. Functional Test Cases — Orders Awaiting Fulfillment

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| FUL7-04 | Only confirmed/ready orders appear | Check a Draft or Pending-Approval quotation | Does NOT appear in this queue | Must |
| FUL7-05 | Confirmed order appears promptly | Confirm a quotation requiring no approval | Appears in "Orders Awaiting Fulfillment" shortly after | Must |
| FUL7-06 | Row click navigation | Click an order row | Opens Screen 8 with matching order/customer details and correct stock context | Must |

---

## 5. Edge Cases

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| FUL7-07 | Insufficient combined stock | Create an order needing more units than exist across ALL warehouses combined | Order still appears here; Screen 8 should surface a backorder scenario rather than silently failing or under-fulfilling | Must |
| FUL7-08 | Multi-tenant isolation | Log in under a different organization | Stock table and order queue show only that org's data | Must |

---

## 6. Non-Functional Test Cases

| ID | Test | Expected Result |
|---|---|---|
| FUL7-NFR1 | Data freshness | Stock levels here directly feed Screen 8's split logic — stale data here produces wrong split recommendations, so this must reflect true current state after Reload Data |
| FUL7-NFR2 | Consistency | Stock consumed on fulfillment confirmation matches exactly what's shown as available beforehand — no double-counting or drift |

---

## 7. Priority Summary for Judges/Demo

**FUL7-01** (same product, different quantities per warehouse) is the cleanest way to show the data model actually supports multi-warehouse tracking, not a single global stock number. **FUL7-07** is your best stress test and worth running before the demo even if not shown live, since backorder handling is explicitly called out as a differentiator in the original problem statement.
