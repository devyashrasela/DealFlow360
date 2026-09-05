# Test Plan — Screen 5: Approvals (List)

**Product:** DealFlow360
**Source:** PRD_Screen5_Approvals_List (mockup Screen 5 frame + PDF Section B4, Section 10)

---

## 1. Test Scope

Covers the master approvals queue: summary counters, the Blended Risk / Stage / Assigned To columns, filtering, and navigation into Screen 6. Most of the underlying math is tested in the Screen 18 test plan — this plan focuses on whether the list correctly reflects and surfaces that math.

---

## 2. Preconditions / Test Data Setup

- Quotations seeded across all three stages: Sales Manager, Finance, Auto-Approved.
- Quotations seeded across all three risk levels: HIGH, MEDIUM, LOW.
- At least one Returned quotation.

---

## 3. Functional Test Cases — Summary Counters & Table

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| APP5-01 | Pending counter accuracy | Compare "X Pending" against actual Pending rows | Exact match | Must |
| APP5-02 | Returned counter accuracy | Compare "X Returned" against actual Returned rows | Exact match | Must |
| APP5-03 | Approved counter accuracy | Compare "X Approved" against actual Approved rows | Exact match | Must |
| APP5-04 | Column completeness | Inspect any row | Quotation, Customer, Blended Risk, Stage, Assigned To all populate correctly | Must |
| APP5-05 | Blended Risk badge accuracy | Compare HIGH/MEDIUM/LOW badge against actual per-line breach severity from Screen 4/18 | Badge correctly reflects the underlying calculated score, not an arbitrary tag | Must |
| APP5-06 | Stage correctness — Manager only | A quote requiring only Manager approval | Never shows a "Finance" stage | Must |
| APP5-07 | Stage correctness — Manager then Finance | A quote requiring both | Shows Manager first, then Finance in sequence, not both simultaneously | Must |
| APP5-08 | Auto-Approved display | A LOW-risk, no-approval-needed quote | Shows Stage = "Auto-Approved" with "-" in Assigned To | Must |

---

## 4. Functional Test Cases — Filtering & Navigation

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| APP5-09 | Filter: Pending Only | Toggle the filter | Table narrows to only Pending-stage rows | Must |
| APP5-10 | Row click navigation | Click any row | Opens Screen 6 with matching quotation ID, customer, and risk detail | Must |
| APP5-11 | Post-action counter update | Approve a quote from Screen 6, return to Screen 5 | Stage updates correctly; Pending counter decrements | Must |

---

## 5. Edge Cases & Role Scoping

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| APP5-12 | Role-scoped visibility | Log in as Sales Manager vs. Finance user | Confirm with dev team whether each sees only their relevant stage's items, then test the actual implemented scope | Should |
| APP5-13 | Multi-tenant isolation | Log in under a different organization | Approvals list is fully separate | Must |

---

## 6. Non-Functional Test Cases

| ID | Test | Expected Result |
|---|---|---|
| APP5-NFR1 | Counter/table consistency | Summary counters always match actual visible row counts under the current filter state |
| APP5-NFR2 | Freshness | List reflects the true current state — no cached/stale risk levels for recently-edited quotes |

---

## 7. Priority Summary for Judges/Demo

**APP5-05** (Blended Risk badge accuracy) is the connective tissue between this list and the Screen 18 algorithm test plan — verify it directly against at least one of the GOV18 worked-example scenarios so you can show a judge the same scenario end-to-end: config → calculation → this list → Screen 6 detail.
