# Test Plan — Screen 9: Subscriptions (List)

**Product:** DealFlow360
**Source:** Customer Subscriptions & Recurring Billing spec (Section 3.2, FR-SUB-01 through FR-SUB-10)

---

## 1. Test Scope

Covers the subscriptions register: KPI accuracy (Active count, MRR, renewals), table data correctness, auto-provisioning from confirmed quotations, status representation, and navigation into Screen 10.

---

## 2. Preconditions / Test Data Setup

- At least one confirmed quotation containing a mix of one-time and recurring lines.
- Subscriptions in each of the four statuses: Active, Past Due, Paused, Cancelled.
- Subscriptions with different billing cadences (Monthly, Quarterly, Yearly) for MRR normalization testing.
- At least one subscription with a `Next Invoice Date` within the next 30 days, and one outside that window.

---

## 3. Functional Test Cases

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| SUB9-01 | Auto-provisioning on quote confirmation | Confirm a quotation containing 1 one-time item + 1 recurring plan | A new subscription record appears on Screen 9; the one-time item does NOT appear here (it routes to Fulfillment instead) | Must |
| SUB9-02 | Hybrid order line segregation | Inspect the newly created subscription | Retains link to parent Order ID while only carrying the recurring line(s), per FR-SUB-02 | Must |
| SUB9-03 | Active Subscriptions KPI accuracy | Compare "Active Subscriptions" card against actual count of Active-status rows in the table | Numbers match exactly | Must |
| SUB9-04 | MRR calculation — mixed cadences | Create one Monthly ($100), one Quarterly ($300 = $100/mo equivalent), one Yearly ($1200 = $100/mo equivalent) subscription | MRR card correctly normalizes all three to monthly equivalents and sums them (should show $300 total, not a raw sum of $1600) | Must — this is a common calculation bug spot |
| SUB9-05 | Renewals in Next 30 Days accuracy | Set one subscription's Next Invoice Date to 15 days out, another to 45 days out | Only the 15-day one counts toward the KPI card | Must |
| SUB9-06 | Table column completeness | Open the list with seeded data | All columns present and correctly populated: Subscription ID, Customer, Plan Name/Product, Billing Cadence, Recurring Amount, Next Invoice Date, Status | Must |
| SUB9-07 | Status badge color coding | View subscriptions in each of the 4 statuses | Active=Green, Past Due=Red, Paused=Yellow, Cancelled=Gray, matching spec exactly | Should |
| SUB9-08 | Row click navigation | Click any subscription row (e.g., SUB-4021) | Navigates directly to Screen 10 with matching subscription ID and correct customer/plan metadata pre-loaded | Must |
| SUB9-09 | Global Reload Data refresh | Trigger a plan change on Screen 10 for one subscription, return to Screen 9, click Reload Data | MRR and status re-aggregate correctly, reflecting the just-made change (per FR-SUB-10) | Must |
| SUB9-10 | Multi-tenant isolation | Log in under a different organization/relationship context | Only that org's subscriptions are visible — no cross-tenant leakage | Must |

---

## 4. Edge Cases / Boundary Conditions

| ID | Test | Steps | Expected Result |
|---|---|---|---|
| SUB9-11 | Zero active subscriptions | View Screen 9 for a brand-new org with no subscriptions yet | KPI cards show 0, table shows an empty state — not an error or crash |
| SUB9-12 | Subscription exactly at 30-day boundary | Set Next Invoice Date to exactly 30 days from today | Confirm with dev team whether boundary is inclusive or exclusive, then test accordingly — this is a common off-by-one bug |
| SUB9-13 | Past Due subscription MRR inclusion | A Past Due subscription still technically has a Recurring Amount | Confirm with team whether Past Due subscriptions count toward the MRR KPI (likely they should, since MRR usually reflects committed revenue, not just currently-paid revenue) — flag as an open question if unclear from spec |

---

## 5. Non-Functional Test Cases

| ID | Test | Expected Result |
|---|---|---|
| SUB9-NFR1 | MRR/KPI recalculation timing | Should feel immediate after Reload Data — no stale numbers displayed after a plan change elsewhere in the app |
| SUB9-NFR2 | Multi-tenant query correctness under load | With many subscriptions across multiple orgs seeded, confirm query performance and correctness both hold (no accidental cross-join or missing WHERE clause on org scope) |
