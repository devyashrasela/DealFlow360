# Quotation Details

# PRD — Screen 4: Quotation Detail (Builder)

**Product:** DealFlow360
**Screen:** Screen 4 (opened by clicking a card on Screen 3 — Quotations List)
**Source:** Excalidraw mockup (Screen 4 frame, example: "Quotation Detail: Q-1042 (Acme Corp)") + DealFlow360 problem statement (Section B3 — Quotation Builder Screen)

---

## 1. Purpose

This is the **core working screen** of the entire product — where a Rep actually builds a quotation: adds products, sets quantities, applies discounts, sees live discount-limit checking per line, and reviews upsell suggestions before submitting for approval.

Per the mockup subtitle: *"Opened by clicking a row on the Quotations list. Add products, apply discounts, review upsells."*

This screen is where the **blended discount risk score logic** (defined in the PDF, Section 10) becomes visible and testable line-by-line, so it deserves the most rigorous test coverage of any screen in the flow.

---

## 2. Users

| Role | What they do here |
| --- | --- |
| Sales Rep | Builds/edits the quotation, adds products, sets discounts, adds upsells, submits for approval |
| Sales Manager/Finance | May view this screen read-only when reviewing (or is redirected to Screen 6 — Approval detail — confirm with team) |
| Admin | Full access, same as Rep |

---

## 3. Screen Layout (as per mockup)

### 3.1 Top Navigation (persistent)

- Logo, tabs: Dashboard | Quotations | Approvals | Fulfillment | Subscriptions | Invoices | Deal Health | Reports

### 3.2 Header

- Title: **"Quotation Detail: Q-1042 (Acme Corp)"** — format is `Quotation ID (Customer Name)`
- Subtitle: *"Opened by clicking a row on the Quotations list. Add products, apply discounts, review upsells."*

### 3.3 Meta Row

- **Customer** field (shown: Acme Corp)
- **Price List** field (customer-tier-based pricing, per PDF Section A2)

### 3.4 Line Items Table

| Column | Purpose |
| --- | --- |
| Product | Product name |
| Qty | Quantity |
| Price | Unit price |
| Discount | Discount % applied on this line |
| Limit | The category/tier discount ceiling that applies to this specific line |
| Status | Live evaluation: **OK** or **OVER (+X pt)** |

**Example rows from mockup:**

| Product | Qty | Price | Discount | Limit | Status |
| --- | --- | --- | --- | --- | --- |
| Laptop Pro 14 | 2 | $1,200 | 12% | 15% | OK |
| Onsite Setup Service | 1 | $450 | 18% | 10% | **OVER (+8pt)** |
| Extended Warranty | 1 | $180 | 10% | 15% | OK |

Caption shown in mockup: *"Discount is checked against each line's own limit live, as soon as it is entered, not only at submit time."*

This is the mockup's direct visual confirmation of the PDF's blended risk score logic (Section 10) — each line has its **own** category limit, and violations are flagged **per line, in real time**, not just at submission.

### 3.5 Upsell and Cross-Sell Suggestions Panel

Three suggestion cards shown side by side:

| Suggestion | Detail shown |
| --- | --- |
| + Wireless Mouse | Margin +$18 |
| + Docking Station | Promo: 12% off |
| + Care Plan 2yr | Margin +$46 |

Each is an "Add" action (per PDF Section B5, there's also a "Dismiss" option not explicitly labeled in this mockup frame — confirm with dev team whether it exists here too).

### 3.6 Bottom Actions

- **"Save Draft"** — saves current state without submitting
- **"Submit for Approval"** — triggers the discount/blended risk evaluation and routes to approval if needed (or straight to fulfillment if not — per PDF flow)

---

## 4. Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Display quotation header with ID and customer name | Must |
| FR-2 | Show Customer and Price List fields, with Price List driving the pricing tier applied to line items | Must |
| FR-3 | Line items table supports adding/removing products, adjusting quantity, and setting a discount % per line | Must |
| FR-4 | Each line independently checks its discount against its **own category/tier limit** (not one blanket order-level limit) | Must |
| FR-5 | Status column updates **live**, immediately as a discount is entered — not only on submit | Must |
| FR-6 | When a line exceeds its limit, Status shows "OVER (+Xpt)" with the exact point differential, not just a generic warning | Must |
| FR-7 | Line Price reflects the selected Price List / customer tier (per PDF Section A2) | Must |
| FR-8 | Upsell panel shows ranked suggestions with margin delta and/or promo tag per suggestion (per PDF Section B5) | Must |
| FR-9 | Adding an upsell item updates the line items table and any order-level margin total immediately | Must |
| FR-10 | Upsell suggestions only surface products meeting the configured minimum margin threshold (per PDF Section A6) — a low-margin product must never appear here even if historically co-purchased | Must |
| FR-11 | "Save Draft" persists current state without triggering approval routing | Must |
| FR-12 | "Submit for Approval" computes the **blended discount risk score** across all lines and: <br>– if no line/order breach → moves straight to fulfillment (no approval needed) <br>– if any line breaches its limit (even if others are fine) → routes to the correct approval level (Manager, or Manager+Finance) based on severity | Must |
| FR-13 | Submitting recalculates and re-validates all lines server-side, not just trusting the client-side "OK/OVER" display (prevents a tampered client from bypassing governance) | Must |
| FR-14 | Quotation stage on Screen 3 (pipeline board) updates automatically once submitted (Draft → Pending Approval, or Draft → Approved if no approval required) | Must |

---

## 5. Non-Functional Requirements

- **Live responsiveness:** discount status and margin totals must recalculate on every keystroke/change with no perceptible lag — this live-check behavior is explicitly called out in the mockup caption as a defining feature, not a nice-to-have.
- **Server-side integrity:** the per-line limit check must be enforced server-side at submit time, regardless of what the client UI displays — this is the single most important thing to test, since a rushed build might only check limits in the frontend, which is trivially bypassable.
- **Auditability:** any discount override or submission must be traceable (per PDF's audit trail requirement) — who submitted, what discounts were applied, what the blended score was at submission time.

---

## 6. Open Questions / Ambiguities to Clarify With Dev Team

1. **Order-level total/margin summary:** the mockup frame doesn't show a visible running total or overall margin indicator near the bottom — the PDF (Section B3) explicitly calls for "a live margin indicator" at the order level. Confirm whether this exists above the fold / needs to be added, since it's not visible in the current mockup capture.
2. **Dismiss button on upsell cards:** PDF Section B5 mentions "Add to Quote" and "Dismiss" buttons; this mockup frame only shows an implied "Add" action (+ prefix). Confirm Dismiss is still in scope and where it lives in the final UI.
3. **What happens on "Submit for Approval" when no approval is needed:** does the button change label dynamically (e.g., to "Confirm & Send to Fulfillment"), or does it always say "Submit for Approval" and the system decides silently? Needs a UX decision.
4. **Editing after submission:** can a Rep still edit a quotation once it's "Pending Approval," or is it locked until returned for revision? Not shown in this screen's mockup — likely governed by Screen 6 (Approval detail) instead.
5. **Blended score visibility:** should the Rep see the actual blended risk score number on this screen before submitting, or is it only revealed on the Approval screen (Screen 6)? The mockup only shows per-line status, not an aggregate score here.

---

## 7. Test Cases (for QA)

| # | Test | Expected Result |
| --- | --- | --- |
| 1 | Open Q-1042 (or similar) and enter a discount below the line's limit | Status shows "OK" immediately, no page reload needed |
| 2 | Enter a discount above the line's limit | Status shows "OVER (+Xpt)" immediately, with the correct point differential calculated (entered % − limit %) |
| 3 | Build a quote where every line is individually within its own limit | Submit → no approval required, moves straight toward fulfillment |
| 4 | Build a quote where one line breaches its limit but overall order % looks acceptable (per PDF Section 10 example) | Submit → routed for approval anyway, because of that one line |
| 5 | Build a quote where several lines are each slightly over (2-3 pts each), none individually alarming | Submit → still routed for approval due to blended/aggregate effect |
| 6 | Manually tamper with client-side discount value via browser dev tools to force "OK" status, then submit | Server-side validation still catches the real violation and routes for approval (critical security/integrity test) |
| 7 | Add an upsell suggestion (e.g., "+ Wireless Mouse") | Line appears in table; order total and margin indicator update immediately |
| 8 | Check upsell suggestions against a deliberately low-margin product configured below threshold | That product never appears as a suggestion |
| 9 | Click "Save Draft" | Quotation stays in Draft stage; no approval routing triggered; returns to it later with the same state intact |
| 10 | Submit a quotation with correct discount that needs Manager-only approval vs. one that needs Manager+Finance | Confirm correct approval chain is triggered based on breach severity, per configured rules |
| 11 | After submission, check Screen 3 pipeline board | Card automatically moves to the correct new column (Pending Approval or Approved) |

---

## 8. Downstream Screens Linked From This Screen

| Action on Screen 4 | Navigates to / triggers |
| --- | --- |
| "Submit for Approval" (breach detected) | Routes quotation to Screen 6 (Approval Detail) |
| "Submit for Approval" (no breach) | Routes toward Screen 7/8 (Fulfillment) |
| "Save Draft" | Returns to Screen 3 (Quotations List), quotation remains in Draft |
| Back navigation | Screen 3 (Quotations List) |