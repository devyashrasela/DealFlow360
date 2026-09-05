# Test Plan — Screen 15: Reports & Analytics

**Product:** DealFlow360
**Source:** Screen 15 & 16 spec (Section 3.1, FR-REP-01 through FR-REP-03)

---

## 1. Test Scope

Covers the multi-dimensional filter engine, KPI summary card accuracy, the two report matrix tabs (Sales Rep & Discount Discipline, Product & Category Performance), and PDF/XLS export fidelity. This screen aggregates data from nearly every other module (quotations, approvals, invoices, discounts), so its correctness depends heavily on those upstream modules already being right — treat mismatches here as a signal to check the source screen, not just this one.

---

## 2. Preconditions / Test Data Setup

- A spread of quotations/orders across multiple periods (today, this week, older), multiple reps/teams, multiple approval statuses, and multiple product categories.
- At least one rep with an unusually high discount pattern (ties into cross-checking against Screen 14's anomaly detection).
- Confirmed orders with known, hand-calculable margins for cross-verification of "Blended Gross Margin %" and "Total Discount Leakage."

---

## 3. Functional Test Cases — Filter Bar (Module A7)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| REP15-01 | Period filter — spec worked example | Select Period = "This Week" and Category = "Hardware" | KPI cards and product breakdown update to show only hardware deals falling within the current week — this is the spec's own Test Case 1 | Must |
| REP15-02 | Period — Today | Select Period = "Today" | Data narrows to only today's activity; compare against a manual count of today's confirmed deals | Must |
| REP15-03 | Period — Custom Range | Select a custom date range spanning a known set of seeded deals | Only deals with dates inside the range are included, with correct inclusive/exclusive boundary handling | Must |
| REP15-04 | Sales Team/Rep — All Teams vs individual | Filter by an individual rep vs. "All Teams" | Individual filter shows only that rep's deals; totals differ correctly from the all-teams view (not silently identical) | Must |
| REP15-05 | Approval Status filter pills | Toggle between All/Pending/Approved/Rejected | Table and KPI cards update to reflect only the selected approval status | Must |
| REP15-06 | Product/Category filter | Select a specific category (e.g., Subscriptions) | Only deals/products in that category appear across both report tabs | Must |
| REP15-07 | Combined filters | Apply Period + Rep + Category simultaneously | All three filters apply as an AND condition, not just the last one applied overriding the others | Must |

---

## 4. Functional Test Cases — KPI Summary Cards

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| REP15-08 | Total Bookings accuracy | Compare "Total Bookings" against a manual sum of confirmed order values in the filtered period | Exact match | Must |
| REP15-09 | Blended Gross Margin % accuracy | Manually compute realized margin after discounts for the filtered set | Matches displayed % exactly, using the same margin formula as the rest of the system (ties to Screen 1's margin formula: `(Subtotal - Cost) / Subtotal × 100`) | Must |
| REP15-10 | Total Discount Leakage accuracy | Manually sum the dollar reduction from list price across all filtered deals | Matches displayed $ figure exactly | Must |
| REP15-11 | KPI cards respond to filter changes | Change any filter | All 3 KPI cards recalculate immediately, not just the table below them | Must |

---

## 5. Functional Test Cases — Tab 1: Sales Rep & Discount Discipline Report

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| REP15-12 | Column accuracy | Inspect any rep row | Sales Rep, Team, Deals Closed, Net Revenue, Avg Discount Given, Quotes Flagged (Risk), Realized Margin % all populate correctly | Must |
| REP15-13 | Deals Closed count | Cross-check against actual count of Confirmed orders for that rep in the filtered period | Exact match | Must |
| REP15-14 | Avg Discount Given calculation | Manually average the discount % across that rep's deals in the period | Matches displayed value; confirm whether this is a simple average or revenue-weighted average with the dev team, since the two produce different numbers | Must |
| REP15-15 | Quotes Flagged (Risk) cross-check | Compare against the count of that rep's quotes that appeared in Screen 5 (Approvals) or Screen 14 (Discount Anomaly) during the period | Numbers should be consistent/explainable — if this column double-counts or misses flags from either source, it's a data-integrity bug worth flagging | Must |

---

## 6. Functional Test Cases — Tab 2: Product & Category Performance Report

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| REP15-16 | Column accuracy | Inspect any product row | Product Name, Category, Units Sold, Gross Revenue, Total Discount Given ($), Avg Discount %, Realized Gross Margin % all populate correctly | Must |
| REP15-17 | Units Sold accuracy | Cross-check against actual confirmed order line quantities for that product in the filtered period | Exact match | Must |
| REP15-18 | Realized Gross Margin % per product | Manually compute using unit cost vs. realized price after discount | Matches displayed % | Must |
| REP15-19 | Tab switching preserves filters | Switch from Tab 1 to Tab 2 while filters are active | Active filters (Period, Rep, Status, Category) persist across the tab switch rather than resetting | Should |

---

## 7. Functional Test Cases — Export (FR-REP-02, FR-REP-03)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| REP15-20 | Export to PDF | Apply filters, click "Export to PDF" | Produces a summary document showing the selected filters, top KPI cards, and current data tables — matching what's on screen | Must |
| REP15-21 | Export to XLS — spec worked example | Click "Export to XLS" | Downloads a `.xlsx` file matching active table filters — this is the spec's own Test Case 2 | Must |
| REP15-22 | XLS raw field completeness | Open the exported XLS file | Contains complete mathematical fields (not just display-rounded values) so a finance user could recompute totals independently | Must |
| REP15-23 | Export reflects current filter state, not all data | Apply a narrow filter (e.g., single rep, this week), then export | Exported file contains ONLY the filtered subset, not the full unfiltered dataset | Must — a common shortcut bug is exporting all data regardless of active filters |

---

## 8. Edge Cases Tied to Open Questions

| ID | Open Question | Test Once Resolved |
|---|---|---|
| REP15-24 | Role-based row redaction for Sales Reps | Log in as a Sales Rep and open Screen 15 — confirm with dev team whether the Team filter locks to their own user ID only (hiding peer discounting habits), then test that peer rep rows are genuinely absent, not just visually hidden but still present in the underlying API response |
| REP15-25 | Multi-currency execution | If multi-currency is implemented as a bonus feature, confirm whether it uses live exchange rate polling or static conversion multipliers, and test accordingly — otherwise mark as out of scope for this hackathon build |

---

## 9. Non-Functional Test Cases

| ID | Test | Expected Result |
|---|---|---|
| REP15-NFR1 | Aggregation latency | Filtered analytical queries across historical orders return and render in under 600ms per spec — test with a realistically large seeded dataset, not just a handful of rows |
| REP15-NFR2 | Multi-tenant isolation | Log in under a different organization | Reports show only that org's data — no cross-tenant aggregation leakage |

---

## 10. Priority Summary for Judges/Demo

**REP15-01** (the spec's own filter worked example) is a clean, quick demo moment. **REP15-23** (export respects active filters) is worth verifying before the demo specifically — if a judge asks to export a filtered view and gets the full unfiltered dataset instead, it's an immediately visible and credibility-damaging bug. **REP15-24** (rep-level redaction) is also worth a quick check if your team plans to demo logging in as different roles, since accidentally exposing a peer's discounting habits to a baseline Sales Rep would undercut the platform's own governance/audit pitch.
