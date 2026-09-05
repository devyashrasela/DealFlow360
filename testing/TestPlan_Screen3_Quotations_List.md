# Test Plan — Screen 3: Quotations (List / Pipeline)

**Product:** DealFlow360
**Source:** PRD_Screen3_Quotations_List (mockup Screen 3 frame + PDF Section B2)

---

## 1. Test Scope

Covers the Kanban-style pipeline board (Draft, Pending Approval, Approved, Negotiation, Confirmed columns), card display, stage-transition correctness, the Table View toggle, and navigation into Screen 4. The single most important thing to verify on this screen is that stage transitions are system-driven, not manually draggable — a free drag-and-drop implementation would let a rep bypass the entire approval engine.

---

## 2. Preconditions / Test Data Setup

- At least one quotation seeded in each of the 5 pipeline stages.
- A quotation ready to move from Pending Approval → Approved (via an approval action elsewhere).
- A quotation ready to move from Negotiation → Pending Approval (via a customer counter-discount breach).

---

## 3. Functional Test Cases — Board Display

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| QUO3-01 | Cards appear in correct columns | Load the board with seeded data across all 5 stages | Each card appears in the column matching its actual current status | Must |
| QUO3-02 | Card content | Inspect any card | Shows customer name and quotation total amount at minimum | Must |
| QUO3-03 | Click card navigation | Click any card | Opens Screen 4 (Quotation Detail) for that exact quotation, matching customer and amount | Must |
| QUO3-04 | "+ New Quotation" | Click the button | Creates a new blank quotation in Draft stage, opens Screen 4 in builder mode | Must |
| QUO3-05 | Multiple cards per column | Seed 2+ quotations in the same stage (e.g., Draft) | Both appear stacked in that column without overlapping/hiding one another | Should |

---

## 4. Functional Test Cases — Automatic Stage Transitions (Critical)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| QUO3-06 | Approval moves card automatically | Approve a quotation sitting in Pending Approval (via Screen 6) | Card automatically moves to Approved column on Screen 3 without manual drag | Must — critical governance test |
| QUO3-07 | Customer breach re-routes card automatically | Customer submits a counter-discount exceeding threshold on Screen 11, rep accepts | Card automatically moves from Negotiation → Pending Approval | Must — critical governance test |
| QUO3-08 | Manual drag-and-drop attempt (security test) | Attempt to manually drag a card from Draft directly into Approved | Should be blocked entirely, OR if drag is UI-permitted, confirm it does NOT bypass the real approval logic server-side — flag as Critical if a manual drag can fake an approval | Must — critical security test |

---

## 5. Functional Test Cases — Table View Toggle

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| QUO3-09 | Switch to Table View | Click "Switch to Table View" | Same underlying quotations render as a flat table, no data loss or mismatch vs. board view | Should |
| QUO3-10 | Table View sort/filter (if present) | Sort or filter the table view | Confirm behavior with dev team — not explicitly specified in mockup, so test whatever is actually implemented | Should |

---

## 6. Edge Cases & Role Scoping

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| QUO3-11 | Visibility scope — Rep vs Manager | Log in as a Sales Rep vs. a Sales Manager | Confirm with dev team whether Rep sees only their own quotations or the whole team's, then test the actual implemented scope | Should |
| QUO3-12 | Multi-tenant isolation | Log in under a different organization | Only that org's quotations appear on the board | Must |
| QUO3-13 | Large column volume | Seed 20+ quotations in one column (e.g., Draft) | Column scrolls, paginates, or otherwise handles volume gracefully — confirm with dev team which approach is implemented | Should |

---

## 7. Non-Functional Test Cases

| ID | Test | Expected Result |
|---|---|---|
| QUO3-NFR1 | Consistency with Dashboard counter | "Open Quotations" count on Screen 2 matches the actual number of non-Confirmed cards visible here |
| QUO3-NFR2 | Reload Data refresh | Global Reload Data action refreshes card positions/data without a hard page reload |

---

## 8. Priority Summary for Judges/Demo

**QUO3-06/07** (automatic stage transitions) are the clearest visual proof that governance is real, not cosmetic — approve a quote or trigger a customer breach live and show the card jump columns on its own. **QUO3-08** is the single highest-priority security test on this screen and should be verified before demo day even if not shown live, since a draggable board that can fake an approval undermines the entire product's core pitch.
