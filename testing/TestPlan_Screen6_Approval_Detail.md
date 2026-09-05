# Test Plan — Screen 6: Approval Detail

**Product:** DealFlow360
**Source:** PRD_Screen6_Approval_Detail (mockup Screen 6 frame + PDF Section B4, Section 10)
**Cross-reference:** Uses the same underlying algorithm tested in TestPlan_Screen18 (GOV18-09 to GOV18-12) — this plan focuses on the approval-action UI and audit trail, not the formula itself.

---

## 1. Test Scope

Covers the per-quotation approval workspace: the "why flagged" breakdown, approval chain progress tracker, audit trail, and the Approve/Return/Reject actions.

---

## 2. Preconditions / Test Data Setup

- A quotation reproducing the PDF's own worked example: Gold customer, Laptop at 12% (within 15% limit), Setup Service at 18% (8pt over its 10% limit).
- A quotation requiring only Manager approval (to test Finance-stage omission).
- A quotation already Returned once and Resubmitted (to test audit trail continuity).

---

## 3. Functional Test Cases — Risk Breakdown Display

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| APR6-01 | Header display | Open the screen for a specific quotation | Shows correct ID, customer, Blended Risk level, Customer Tier | Must |
| APR6-02 | Line-level breakdown — worked example | Open the Gold/Laptop/Setup Service scenario | Laptop shows 0pt/OK; Setup Service shows exactly 8pt OVER | Must |
| APR6-03 | Dynamic flagged-reason text | Compare the "Why This Quote Was Flagged" text against different quotations with different worst-offending lines | Text correctly identifies whichever line is actually the worst offender for each specific quote, not a static message | Must |
| APR6-04 | Aggregate-pattern explanation | Open a "death by a thousand cuts" style quote (per GOV18-12) | Explanation correctly reflects the aggregate pattern, not just a single worst line | Must |

---

## 4. Functional Test Cases — Approval Chain & Audit Trail

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| APR6-05 | Chain tracker — Manager only | Open a Manager-only-required quote | Finance stage is visually skipped/omitted, not shown as a blocking pending step | Must |
| APR6-06 | Chain tracker — Manager + Finance | Open a quote requiring both | Both stages shown in correct sequence | Must |
| APR6-07 | Audit trail completeness | Inspect a quote with multiple round trips (submit → return → resubmit) | Every action appended as a new row; prior entries remain intact, not overwritten | Must |
| APR6-08 | Audit trail immutability | Attempt to edit or delete a past audit trail entry | Should not be possible through any UI action | Must |

---

## 5. Functional Test Cases — Actions

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| APR6-09 | Approve — final stage | Click Approve on the last required stage | Quotation moves to Confirmed; Screen 5 and Screen 3 update accordingly | Must |
| APR6-10 | Approve — intermediate stage | Click Approve at Manager stage on a Manager+Finance quote | Advances to Finance stage, does NOT jump to Confirmed | Must |
| APR6-11 | Return for Revision | Click Return, provide a note | Quotation returns to Rep as Draft; audit trail logs the action; Returned counter on Screen 5 increments | Must |
| APR6-12 | Reject | Click Reject | Confirm the distinct end-state vs. Returned with dev team, then test it doesn't silently allow re-editing as if nothing happened | Must |
| APR6-13 | Role/stage action gating | Attempt to act on a Finance-stage-only item while logged in as Sales Manager (not Finance) | Action blocked or unavailable per role/stage authority rules | Must — access control test |

---

## 6. Non-Functional Test Cases

| ID | Test | Expected Result |
|---|---|---|
| APR6-NFR1 | "Over By" calculation accuracy | Always equals `Discount Given − Limit Allowed`, computed live, matching Screen 4/18's math exactly |
| APR6-NFR2 | State consistency | Stage tracker, audit trail, and Screen 5 list never disagree about a quotation's current state |

---

## 7. Priority Summary for Judges/Demo

**APR6-02** is your literal reproduction of the PDF's own worked example and should be a rehearsed demo moment. **APR6-13** (role/stage gating) is a genuine access-control test worth verifying even if not demoed — a Sales Manager approving a Finance-only item is a governance bypass, not a UI nicety.
