# Test Plan — Screen 4: Quotation Detail (Builder)

**Product:** DealFlow360
**Source:** PRD_Screen4_Quotation_Detail (mockup Screen 4 frame + PDF Section B3, Section 10)
**Cross-reference:** See TestPlan_Screen18_Risk_Slabs_Margin_Guardrails.md for the full mathematical algorithm test cases (GOV18-09 to GOV18-19) — this plan focuses on the Builder UI/UX layer, that one focuses on the underlying formula.

---

## 1. Test Scope

Covers the core quotation-building screen: line items with live per-line discount/limit checking, the upsell/cross-sell panel, and submit-time routing. This is the most business-logic-dense screen in the product — treat every discount-related test here as an arithmetic check, not an approximate one.

---

## 2. Preconditions / Test Data Setup

- A Gold-tier customer with known tier ceiling (15%).
- Products in Hardware (15% category limit) and Services (10% category limit) categories.
- At least one upsell pairing configured below margin threshold and one above (per Screen 16 config).
- Access to browser dev tools for client-side tamper testing.

---

## 3. Functional Test Cases — Line Items & Live Discount Checking

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| QUO4-01 | Header display | Open a quotation | Shows correct Quotation ID and Customer Name in `ID (Customer)` format | Must |
| QUO4-02 | Add/remove line items | Add a product, remove a product | Line items table updates immediately | Must |
| QUO4-03 | Live status — within limit | Enter a discount below the line's effective limit | Status shows "OK" immediately, no reload needed | Must |
| QUO4-04 | Live status — over limit | Enter a discount above the line's effective limit | Status shows "OVER (+Xpt)" immediately with the correct point differential | Must |
| QUO4-05 | Price list / tier pricing reflected | Change the selected Price List / customer tier | Line prices update to reflect the new tier's base pricing | Must |
| QUO4-06 | Quantity change updates totals | Change a line's quantity | Line total and order-level totals recalculate immediately | Must |

---

## 4. Functional Test Cases — Upsell Panel

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| QUO4-07 | Add upsell suggestion | Click "Add" on a suggested item | Item appears in line items table; order total and margin update immediately | Must |
| QUO4-08 | Margin threshold suppression | Check suggestions against a deliberately low-margin product | That product never appears as a suggestion | Must |
| QUO4-09 | Promoted ranking boost | Mark a product as Promoted (via Screen 16) | Product surfaces higher in the suggestion list | Should |
| QUO4-10 | Dismiss suggestion (if present) | Click Dismiss on a suggestion | Confirm with dev team whether this exists on this screen; if so, test it doesn't reappear same session | Should |

---

## 5. Functional Test Cases — Submit & Routing

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| QUO4-11 | Save Draft | Click Save Draft mid-build | Quotation persists in Draft stage, no approval routing triggered | Must |
| QUO4-12 | Submit — no breach | Submit a quote where every line is within limits | Moves straight toward fulfillment, no approval required | Must |
| QUO4-13 | Submit — single line breach | Submit a quote with one line over its own limit | Routes to approval at the correct slab | Must |
| QUO4-14 | Submit — client-side tamper (critical) | Use browser dev tools to force a discount field to display "OK" when it's actually over limit, then submit | Server-side re-validates from raw submitted values and routes correctly regardless of client display | Must — critical security test |
| QUO4-15 | Screen 3 pipeline update after submit | Submit a quotation | Corresponding card on Screen 3 moves to the correct new column automatically | Must |

---

## 6. Edge Cases

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| QUO4-16 | Editing after submission | Attempt to edit a quotation that's already Pending Approval | Confirm with dev team whether this is locked until Returned for Revision, then test the actual implemented behavior | Should |
| QUO4-17 | Order-level margin indicator | Check for a running order-level margin total | Confirm this exists (flagged as an open question in the original PRD) — if missing, note as a gap against PDF Section B3's explicit requirement | Must |

---

## 7. Non-Functional Test Cases

| ID | Test | Expected Result |
|---|---|---|
| QUO4-NFR1 | Live recalculation responsiveness | Discount status and margin totals recalculate with no perceptible lag on every keystroke |
| QUO4-NFR2 | Server-side integrity | Every discount check is enforced server-side, independent of client display state |

---

## 8. Priority Summary for Judges/Demo

**QUO4-14** is the single most important test on this screen — a governance platform whose only enforcement lives in the frontend isn't actually self-governing. Verify this before demo day regardless of whether you show it live. **QUO4-03/04** (live per-line status) is your best visual demo moment, directly reproducing the PDF's own Laptop/Setup Service worked example.
