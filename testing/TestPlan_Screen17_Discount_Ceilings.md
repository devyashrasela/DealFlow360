# Test Plan — Screen 17: Baseline Discount Ceilings ("Safe Zones")

**Product:** DealFlow360
**Source:** Discount Governance & Blended Risk Engine spec (Section 3.1, FR-GOV-01, FR-GOV-04)

---

## 1. Test Scope

Covers the admin configuration of Customer Tier Ceilings and Product Category Ceilings — the two independent limit tables that feed directly into the Blended Risk Score engine tested on Screen 18 and exercised live on Screen 4/6. This screen is pure configuration, so every test here is really a two-part test: configure the ceiling, then verify its effect downstream on the Quotation Builder.

---

## 2. Preconditions / Test Data Setup

- Admin access to the Governance configuration area.
- Default seeded ceilings present: Tiers — Bronze 5%, Silver 10%, Gold 15%; Categories — Hardware 15%, Services 10%, Subscriptions 5%.
- A test customer account in each tier (Bronze, Silver, Gold) for downstream verification.
- Test products in each category (Hardware, Services, Subscriptions).

---

## 3. Functional Test Cases — Customer Tier Ceilings Table

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| GOV17-01 | Default tier ceilings present | Open Screen 17 fresh | Bronze=5%, Silver=10%, Gold=15% shown as default rows, matching spec | Must |
| GOV17-02 | Edit tier ceiling | Change Gold's Max Discount % from 15% to 20% | Value saves; a new quotation for a Gold customer now uses 20% as the effective tier ceiling on Screen 4 | Must |
| GOV17-03 | Add a new tier | Add a new tier row (e.g., "Platinum" at 25%) | New tier becomes selectable/assignable to customer accounts, and its ceiling is respected in the Blended Risk calculation | Should |
| GOV17-04 | Invalid input handling | Attempt to enter a negative % or a value over 100% for a tier ceiling | Should be rejected/validated — confirm with dev team exact bounds, then test accordingly | Should |
| GOV17-05 | Delete/deactivate a tier still in use | Attempt to remove a tier ceiling that's actively assigned to existing customers | Confirm expected behavior (block deletion, or handle gracefully with a fallback) — not explicitly specified, flag as an open item to resolve with the team | Should |

---

## 4. Functional Test Cases — Product Category Ceilings Table

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| GOV17-06 | Default category ceilings present | Open Screen 17 fresh | Hardware=15%, Services=10%, Subscriptions=5% shown as default rows | Must |
| GOV17-07 | Edit category ceiling | Change Services' Max Discount % from 10% to 8% | New quotations with Services lines use 8% as the effective category ceiling | Must |
| GOV17-08 | Add a new category | Add a new product category ceiling (e.g., "Warranties" at 20%) | Becomes usable when tagging products under that category, and is respected in downstream risk calculations | Should |
| GOV17-09 | Category ceiling change doesn't affect locked orders | Change a category ceiling after some quotations are already Confirmed | Existing confirmed/locked quotations retain their original discount evaluation — this is the same integrity principle as Screen 16's price-list test (PRD16-NFR1) applied to discount ceilings | Must |

---

## 5. Downstream Integration Tests — Intersecting Ceilings (FR-GOV-01, FR-GOV-04)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| GOV17-10 | Effective limit = min(tier, category) — spec worked example | Bronze customer (5% tier ceiling) buys a Services item (10% category ceiling) | Effective limit for this line is 5% (the lower of the two), per `Limit_i = min(Customer Tier Ceiling, Category Ceiling_i)` — confirmed on Screen 4/18's test case 2 | Must |
| GOV17-11 | Effective limit — category is the binding constraint | Gold customer (15% tier ceiling) buys a Subscriptions item (5% category ceiling) | Effective limit is 5% (category is stricter here) — confirms the formula correctly picks whichever is lower in either direction, not just "always use tier" | Must |
| GOV17-12 | Mixed-category quote uses per-line limits independently | Single quote with a Hardware line and a Services line, same Gold customer | Hardware line evaluates against min(15% tier, 15% category)=15%; Services line evaluates against min(15% tier, 10% category)=10% — each line uses its OWN effective limit, not one blended order-level number | Must — this is the core of FR-GOV-01, the same principle already tested on Screen 4/6 but worth re-verifying from the config side |

---

## 6. Non-Functional / Integrity Test Cases

| ID | Test | Expected Result |
|---|---|---|
| GOV17-NFR1 | Configuration change propagation timing | Change a ceiling and immediately start a new quotation | New ceiling applies instantly to new quotations — no caching delay that would let a rep exploit a stale, more permissive limit |
| GOV17-NFR2 | Audit logging on ceiling changes | Change any tier or category ceiling | Logged with user, timestamp, prior value, new value — per the platform's general audit trail requirement (FR-GOV-06 on Screen 18, but applies equally to config changes here) |
| GOV17-NFR3 | Admin-only access enforcement | Attempt to access Screen 17 as a Sales Rep or Sales Manager | Access denied — only Admin should have write access per the Users table in the spec; Sales Manager/Finance may consult but shouldn't edit (confirm exact read-vs-write boundary with dev team) |

---

## 7. Priority Summary for Judges/Demo

**GOV17-10/11/12** are your strongest demo sequence for this screen — they directly reproduce the PDF's original worked example (Gold customer, Hardware fine, Services 8pt over) but starting from the config side, proving the ceilings aren't hardcoded numbers baked into the approval screen but genuinely admin-configurable values that flow through the whole engine. Consider live-editing a ceiling in front of judges and immediately showing the changed limit reflected on Screen 4 — that's a more convincing proof of "self-governing, configurable platform" than showing static screens.
