# Approval Details

# PRD — Screen 6: Approval Detail

**Product:** DealFlow360
**Screen:** Screen 6 (opened by clicking a row on Screen 5 — Approvals List)
**Source:** Excalidraw mockup (Screen 6 frame, example: "Approval Detail: Q-1042 (Acme Corp)") + DealFlow360 problem statement (Section B4, Section 10)

---

## 1. Purpose

This is where a Sales Manager or Finance user actually **acts** on a flagged quotation — it shows the full risk breakdown (why the quote was flagged), the approval chain progress, a complete audit trail of every action taken, and the Approve / Return / Reject controls.

Per mockup subtitle: *"Opened by clicking a row on the Approvals list."*

This screen is the direct visual proof-of-concept for the PDF's own worked example in Section 10 — the mockup literally reuses the Laptop/Setup Service example from the problem statement, confirming this is the canonical test case your dev team should be building against.

---

## 2. Users

| Role | What they do here |
| --- | --- |
| Sales Manager | Reviews risk breakdown, Approves / Returns for Revision / Rejects at the Manager stage |
| Finance/Ops | Same actions, but only reachable after Manager stage is cleared (for quotes requiring both) |
| Sales Rep | Likely read-only — can view status and audit trail of their own submitted quotation, cannot act on it (confirm with team) |
| Admin | Full visibility and action rights |

---

## 3. Screen Layout (as per mockup)

### 3.1 Top Navigation (persistent)

- Logo, tabs: Dashboard | Quotations | **Approvals** (active) | Fulfillment | Subscriptions | Invoices | Deal Health | Reports

### 3.2 Header

- Title: **"Approval Detail: Q-1042 (Acme Corp)"**
- Subtitle: *"Opened by clicking a row on the Approvals list"*

### 3.3 Risk Summary Row

- **Blended Risk: HIGH**
- **Customer Tier: Gold**

### 3.4 "Why This Quote Was Flagged" — Line-Level Breakdown

| Line | Discount Given | Limit Allowed | Over By |
| --- | --- | --- | --- |
| Laptop (Hardware) | 12% | 15% | 0 pt – OK |
| Setup Service (Services) | 18% | 10% | **8 pt OVER** |

Caption: *"Worst single line (8pt over) plus overall pattern across the order sets the blended score. One bad line is enough to require approval."*

This is a **direct implementation** of the PDF Section 10 worked example — confirms the blended score isn't just "average discount vs. tier limit," but is driven by the worst-offending line plus the aggregate pattern.

### 3.5 Approval Chain Progress Tracker

Horizontal stage tracker showing 4 stages:

`Submitted` → `Sales Manager` → `Finance` → `Confirmed`

(Visual state of which stage is current/completed/pending should be shown — mockup doesn't specify exact styling, but the 4 stages themselves are explicit.)

### 3.6 Audit Trail Table

| User | Action | Date | Note |
| --- | --- | --- | --- |
| J. Rao | Submitted | Aug 20 | Initial 12% discount |
| M. Shah | Returned | Aug 21 | Requested justification |
| J. Rao | Resubmitted | Aug 22 | Added margin note |

This is the concrete implementation of the PDF's audit requirement: *"All approvals, rejections, and edits must be logged with user, timestamp, and reason."* Note the mockup shows the **discount value at time of submission** ("Initial 12% discount") captured in the note — this is important since discount % could theoretically change between submission and resubmission.

### 3.7 Action Buttons

- **Approve**
- **Return for Revision**
- **Reject**

---

## 4. Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Display quotation ID, customer name, Blended Risk level, and Customer Tier | Must |
| FR-2 | Show per-line breakdown: Line name/category, Discount Given, Limit Allowed, Over By (with exact point differential, or "0 pt - OK") | Must |
| FR-3 | Blended Risk explanation text dynamically reflects the actual worst-offending line and aggregate pattern — not a static/generic message | Must |
| FR-4 | Show approval chain progress across exactly the stages relevant to this quotation (Submitted → Sales Manager → [Finance if required] → Confirmed) | Must |
| FR-5 | If a quotation only requires Manager-level approval, the Finance stage should be visually skipped/omitted or marked not-applicable, not shown as a blocking pending stage | Must |
| FR-6 | Audit trail lists every action (Submitted, Returned, Resubmitted, Approved, Rejected) with User, Action, Date, and Note, in chronological order | Must |
| FR-7 | Every new action taken via the Approve/Return/Reject buttons appends a new row to the audit trail immediately | Must |
| FR-8 | **Approve** button: advances the quotation to the next required stage (Finance, if required) or to Confirmed if this was the last required step | Must |
| FR-9 | **Return for Revision** button: sends the quotation back to the Rep (likely to Draft state on Screen 4), requires or allows a note explaining why | Must |
| FR-10 | **Reject** button: terminates the quotation (confirm final state with team — likely a distinct "Rejected" status, separate from "Returned") | Must |
| FR-11 | A returned-then-resubmitted quotation preserves its full prior history in the audit trail (per mockup: J. Rao's original 12% submission and the M. Shah return note both remain visible after resubmission) | Must |
| FR-12 | Actions here update the corresponding row on Screen 5 (Approvals List) and the card position on Screen 3 (Quotations pipeline board) | Must |
| FR-13 | Only users with the correct role/stage authority can act (a Sales Manager shouldn't be able to perform the Finance-stage approval action if the config requires a separate Finance user) | Must |

---

## 5. Non-Functional Requirements

- **Audit integrity:** audit trail entries must be immutable once created — no editing or deleting past entries, since this is a governance/compliance record.
- **Accuracy of "Over By" calculation:** must always equal `Discount Given − Limit Allowed`, computed live from actual data, not hardcoded per quotation.
- **Explanation clarity:** the "Why This Quote Was Flagged" text should be genuinely dynamic (referencing the actual worst-offending line and its point value), not a fixed string — this is directly testable against different quotations.
- **State consistency:** the stage tracker, audit trail, and Screen 5 list must never disagree about a quotation's current state.

---

## 6. Open Questions / Ambiguities to Clarify With Dev Team

1. **Reject vs. Returned — end states:** does Reject permanently close the quotation (no further edits possible), while Returned sends it back to Draft for editing? Mockup doesn't show a "Rejected" example row, only "Returned" — confirm the distinct behaviors and final states of each.
2. **Who can act at which stage:** can a Sales Manager act on a Finance-stage item, or is action strictly gated by current stage + role? This is a real access-control test, not just a UI nicety.
3. **Return-for-Revision required note:** is a note mandatory when returning (mockup shows a note was given — "Requested justification" — but doesn't confirm if the field is required)?
4. **Resubmission behavior:** when J. Rao resubmitted with "Added margin note," did the discount value change, or just supporting justification? If the underlying quote was edited on Screen 4 before resubmission, does the Line breakdown table (3.4) reflect the *new* values, or does it need re-verification against updated discount figures?
5. **Confirmed stage handoff:** once "Confirmed" is reached here, does the quotation automatically proceed to Screen 7/8 (Fulfillment), matching the PDF's described flow?

---

## 7. Test Cases (for QA)

| # | Test | Expected Result |
| --- | --- | --- |
| 1 | Open Approval Detail for a quotation with one line over its limit | "Why This Quote Was Flagged" correctly identifies that specific line and its exact over-by point value |
| 2 | Compare "Over By" values here against the Discount/Limit values shown on Screen 4 for the same quotation | Values match exactly — no discrepancy between builder and approval views |
| 3 | Click "Approve" on a Manager-only-required quotation | Quotation moves to Confirmed (Finance stage skipped); Screen 5 stage updates to "Approved"; Screen 3 card moves accordingly |
| 4 | Click "Approve" on a Manager+Finance-required quotation, at Manager stage | Quotation advances to Finance stage, NOT directly to Confirmed; correct next approver notified/assigned |
| 5 | Click "Return for Revision" | Quotation returns to Rep (Draft); audit trail logs the action with user, date, and note; "Returned" counter on Screen 5 increments |
| 6 | Resubmit a returned quotation | New "Resubmitted" row appended to audit trail; prior "Submitted" and "Returned" rows remain intact and visible |
| 7 | Click "Reject" | Confirm final state (distinct from Returned) — quotation should not silently return to an editable Draft state unless that's explicitly the intended behavior |
| 8 | Attempt to act on a Finance-stage-only quotation while logged in as Sales Manager (not Finance) | Action should be blocked or unavailable, per role/stage authority rules |
| 9 | Check audit trail after multiple round trips (Submit → Return → Resubmit → Approve) | Full sequential history preserved and correctly ordered, nothing overwritten |
| 10 | Force a quotation to have two lines each moderately over their limits (no single line at 8pt) | "Why This Quote Was Flagged" explanation correctly reflects the aggregate/blended pattern, not just a single worst line, consistent with the PDF's "death by a thousand small cuts" scenario |

---

## 8. Downstream Screens Linked From This Screen

| Action on Screen 6 | Navigates to / triggers |
| --- | --- |
| "Approve" (final stage) | Moves quotation to Confirmed → proceeds toward Screen 7/8 (Fulfillment) |
| "Approve" (intermediate stage) | Advances to next approval stage (e.g., Manager → Finance); stays on Approvals flow |
| "Return for Revision" | Quotation returns to Screen 4 (Quotation Builder) as Draft, for Rep to edit |
| "Reject" | Terminates quotation (confirm end-state UI with team) |
| Back navigation | Screen 5 (Approvals List) |