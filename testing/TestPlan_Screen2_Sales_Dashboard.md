# Test Plan — Screen 2: Sales Dashboard / Home

**Product:** DealFlow360
**Source:** PRD_Screen2_Sales_Dashboard (mockup Screen 2 frame + PDF Section B1, B9)

---

## 1. Test Scope

Covers the central hub screen: summary cards (Pending Approvals, Open Quotations, At-Risk Deals), quick action buttons, Recent Activity feed, and navigation into every other module. This is the first screen a user sees after login, so freshness and accuracy here set the tone for the whole demo.

---

## 2. Preconditions / Test Data Setup

- At least one quotation in each relevant state: Draft, Pending Approval, Approved/Confirmed.
- At least one quotation flagged by Deal Health (stalled, or discount anomaly).
- Recent activity across at least 3 different modules (an approval event, a negotiation event, a stock/fulfillment event) to populate the feed meaningfully.
- Two different organizations seeded, for multi-tenant isolation testing.

---

## 3. Functional Test Cases — Summary Cards

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| DASH2-01 | Pending Approvals count accuracy | Compare card value against actual count of quotations awaiting Manager/Finance approval | Exact match | Must |
| DASH2-02 | Open Quotations count accuracy | Compare card value against quotations in Draft/Pending/Negotiation/Approved (per agreed definition) | Exact match; confirm the exact status list counted with dev team first | Must |
| DASH2-03 | At-Risk Deals count accuracy | Compare card value against actual Deal Health flags (Screen 14) | Exact match | Must |
| DASH2-04 | Cards update after new submission | Submit a quotation requiring approval | Pending Approvals increments without requiring logout/login (after Reload Data if not fully live) | Must |
| DASH2-05 | Cards update after approval action | Approve a pending quotation from Screen 6 | Pending Approvals decrements accordingly on return to Dashboard | Must |
| DASH2-06 | Card click navigation — Pending Approvals | Click the Pending Approvals card | Navigates to Screen 5 (Approvals List), pre-filtered to pending items | Should |
| DASH2-07 | Card click navigation — Open Quotations | Click the Open Quotations card | Navigates to Screen 3 (Quotations List) | Should |
| DASH2-08 | Card click navigation — At-Risk Deals | Click the At-Risk Deals card | Navigates to Screen 14 (Deal Health Dashboard) | Should |

---

## 4. Functional Test Cases — Quick Actions & Recent Activity

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| DASH2-09 | "+ New Quotation" button | Click the button | Opens a blank Quotation Builder (Screen 4) | Must |
| DASH2-10 | "View Approvals" button | Click the button | Navigates to Screen 5 (Approvals List) | Must |
| DASH2-11 | Recent Activity feed population | Perform an action in another module (e.g., approve a quote, update stock) | New entry appears in the feed, most recent first | Must |
| DASH2-12 | Recent Activity click-through | Click an activity feed entry | Deep-links to the relevant quotation/order detail screen | Should |
| DASH2-13 | Reload Data refresh | Trigger a change elsewhere in the app, then click the global Reload Data action | Dashboard numbers and activity refresh without a full page reload | Must |

---

## 5. Edge Cases & Role Scoping

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| DASH2-14 | Role-scoped Pending Approvals | Log in as a Sales Rep vs. a Sales Manager | Confirm with dev team whether the count differs by role scope, then test the actual implemented behavior explicitly | Should |
| DASH2-15 | Zero-data new organization | View Dashboard for a brand-new org with no quotations yet | All cards show 0 and activity feed shows an empty state — no error or crash | Should |
| DASH2-16 | Multi-tenant isolation | Log in under a different organization | All cards and activity feed reflect only that org's data | Must |

---

## 6. Non-Functional Test Cases

| ID | Test | Expected Result |
|---|---|---|
| DASH2-NFR1 | Data freshness | No stale numbers shown after an action elsewhere in the app followed by Reload Data |
| DASH2-NFR2 | Consistency with source screens | "Open Quotations" count always matches what's actually visible on Screen 3's pipeline board; "Pending Approvals" always matches Screen 5's Pending count |

---

## 7. Priority Summary for Judges/Demo

**DASH2-04/05** (live counter updates after real actions) is the best quick proof that this dashboard isn't static — trigger a submission and an approval in front of judges and show the numbers move. **DASH2-16** (multi-tenant isolation) is worth a fast manual check since this is the very first screen after login and the first place a leak would be visible.
