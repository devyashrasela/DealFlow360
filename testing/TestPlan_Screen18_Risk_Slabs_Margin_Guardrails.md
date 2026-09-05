# Test Plan — Screen 18: Risk Slabs & Margin Guardrails

**Product:** DealFlow360
**Source:** Discount Governance & Blended Risk Engine spec (Section 3.2, Section 4 Core Algorithm, FR-GOV-02, FR-GOV-03, FR-GOV-05, NFRs)

---

## 1. Test Scope

Covers the approval routing slab configuration, the margin guardrail settings, and — most importantly — the actual mathematical Blended Risk Score algorithm itself (`Score = 0.6 × E_max + 0.4 × W_bleed`). This is the single most important test plan in the entire product: it's the literal implementation of the "self-governing" pitch, and every test case in Section 7 of the spec is a named worked example meant to be demoed to judges directly. Treat every formula test here as a precise arithmetic check, not an approximate one.

---

## 2. Preconditions / Test Data Setup

- Default seeded slabs: Slab 1 (0 pts over → Auto-Approve), Slab 2 (>0–5 pts over → Sales Manager), Slab 3 (>5 pts over → Sales Manager + Finance).
- Ceilings from Screen 17 configured as default: Bronze 5%/Silver 10%/Gold 15% (tier), Hardware 15%/Services 10%/Subscriptions 5% (category).
- A Gold-tier customer, a Bronze-tier customer.
- Products in Hardware and Services categories with known unit costs, for margin hard-stop testing.
- A quotation builder scenario capable of holding 50 line items (for the "death by a thousand cuts" test).

---

## 3. Functional Test Cases — Risk Slab Configuration

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| GOV18-01 | Default slab thresholds present | Open Screen 18 fresh | Slab 1 (0 pts, Auto-Approve), Slab 2 (>0–5 pts, Sales Manager), Slab 3 (>5 pts, Manager+Finance) shown as configured | Must |
| GOV18-02 | Edit slab threshold | Change Slab 2's upper bound from 5 to 3 points | A quote that previously would have routed to Slab 2 at 4pt over now correctly routes to Slab 3 instead, reflecting the new boundary | Must |
| GOV18-03 | Slab boundary — exactly at threshold | Test a quote landing at EXACTLY 5 points over (the Slab 2/3 boundary) | Confirm with dev team whether "≤5" or "<5" is the correct inclusive boundary for Slab 2 per the spec's `> 0 to 5` phrasing, and test explicitly — this is a classic off-by-one risk | Must |
| GOV18-04 | Slab boundary — exactly 0 points over | Test a quote at exactly 0 points over (Slab 1 boundary) | Auto-Approves — confirms Slab 1 isn't accidentally requiring "> 0" in the wrong direction | Must |

---

## 4. Functional Test Cases — Margin Guardrails

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| GOV18-05 | Minimum Upsell Margin Threshold configuration | Set threshold to 20%, verify this is the same setting exercised on Screen 16 (PRD16-11) | Confirms this is a single shared setting, not two independently-configured values living on two different screens that could drift out of sync | Must |
| GOV18-06 | Absolute Margin Hard Stop — spec worked example | Set Absolute Hard Stop to 10%, on Screen 4 discount a heavily priced hardware item down to a 5% net margin | System disables the "Submit for Approval" button entirely; UI displays "Margin error: Minimum threshold of 10% breached" — this is the spec's own Test Case 5 (FR-GOV-05) | Must |
| GOV18-07 | Margin hard stop — just above threshold | Discount an item down to exactly 11% margin (above a 10% hard stop) | Submit button remains enabled; quote proceeds through normal risk-slab routing instead of being blocked | Must |
| GOV18-08 | Margin hard stop — exactly at threshold | Discount to exactly 10% margin (equal to the hard stop) | Confirm with dev team whether the hard stop is inclusive (blocks at exactly 10%) or exclusive (blocks only below 10%), and test the actual implemented boundary | Must |

---

## 5. Functional Test Cases — The Core Blended Risk Score Algorithm (Section 4)

**Formulas under test:**
`Limit_i = min(Tier Ceiling, Category Ceiling_i)`
`Excess_i = max(0, Discount_i − Limit_i)`
`E_max = highest single line Excess_i`
`W_bleed = Σ(Excess_i × Line Revenue_i) / Total Order Revenue`
`Blended Risk Score = 0.6 × E_max + 0.4 × W_bleed`

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| GOV18-09 | Scenario 1 — spec worked example: clean quote | Gold customer (15% limit), Laptop (Hardware, 15% limit), rep applies exactly 15% discount | Line Excess = 0; Blended Risk Score = 0; quote Auto-Approves — this is the spec's own Test Case 1 | Must |
| GOV18-10 | Scenario 2 — spec worked example: single breach, tier is binding | Bronze customer (5% limit), Setup Service (Services, 10% limit), rep applies 8% discount | Effective limit is 5% (customer ceiling is lower, per `min()`); Line Excess = 3 points; triggers Slab 2, routes to Sales Manager — this is the spec's own Test Case 2 | Must |
| GOV18-11 | Scenario 3 — spec worked example: mixed category, worst-line drives blended score | Gold customer (15% limit); Line 1 Laptop (H/W, 15% limit) at 12%; Line 2 Setup Service (Service, 10% limit) at 18% | Laptop line is fine (12% < 15%). Service line is 8 points over its own stricter limit. Blended Score > 5, routes to Sales Manager then Finance — this is the spec's own Test Case 3, and the exact scenario reused visually on Screen 6 | Must — this is your single most important test case in the entire product |
| GOV18-12 | Scenario 4 — spec worked example: death by a thousand cuts | Customer with a 10% overall limit; rep applies 11% discount across 50 different line items | No single line is severely over (Max Excess = 1), but W_bleed formula aggregates the widespread margin loss across all 50 lines; routes to Sales Manager for review — this is the spec's own Test Case 4, and is the hardest one for a rushed build to get right, since a naive implementation checking only the worst line would miss this entirely | Must — treat as the primary acceptance test proving the "blended" (not just "worst-line") nature of the engine |
| GOV18-13 | Manual hand-calculation cross-check — E_max component | Using Scenario 3's numbers, manually compute `0.6 × E_max` where E_max = 8 | Manually calculated partial score (4.8) should be a visible or derivable component of the total displayed Blended Risk Score, not an opaque single number with no way to audit how it was derived | Should — ties to auditability, useful if judges ask "how was this score computed" |
| GOV18-14 | Manual hand-calculation cross-check — W_bleed component | Using Scenario 4's numbers (50 lines, uniform 1pt excess, roughly equal revenue per line), manually compute W_bleed | W_bleed should approximate 1 (since Excess_i ≈ 1 for all lines and the weighted average collapses to ~1); confirm the displayed/internal W_bleed component matches this manual estimate within rounding tolerance | Should |
| GOV18-15 | Zero-line-excess but still failing margin hard stop | A quote where every line is within its discount ceiling (Blended Risk Score = 0) but the overall cart margin is below the Absolute Margin Hard Stop | Submit is still blocked by the margin hard stop independently of the risk score — confirms these are two SEPARATE gates, not one gate that only checks discount % | Must — this distinction (discount-ceiling breach vs. margin-floor breach) is easy to conflate in a rushed build |

---

## 6. Live Recalculation & Automated Routing Tests (FR-GOV-02, FR-GOV-03)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| GOV18-16 | Live score recalculation on Screen 4 | While building a quote, change a line's discount % | Blended Risk Score recalculates instantly in the UI without requiring a page action/submit | Must |
| GOV18-17 | Live recalculation on quantity change | Change a line's quantity (which changes Line Revenue_i, affecting W_bleed) | Score updates correctly to reflect the new revenue weighting | Must |
| GOV18-18 | Automated routing on Submit | Click "Submit" on a quote with a known Blended Risk Score | System automatically routes to Approved / Manager Queue / Finance Queue based on which slab the score falls into — no manual routing choice presented to the rep | Must |
| GOV18-19 | Client-side tamper resistance | Manipulate the displayed discount value via browser dev tools to force a lower apparent score, then submit | Server-side recalculates the true score from actual submitted data and routes correctly regardless of what the client displayed — this is the same critical integrity test already flagged for Screen 4 (test #6 in that PRD), re-verified here at the algorithm level | Must — critical security test |

---

## 7. Non-Functional Test Cases

| ID | Test | Expected Result |
|---|---|---|
| GOV18-NFR1 | Calculation latency | O(N) iteration across quotation lines to compute the Blended Risk Score resolves in under 50ms — test specifically with the 50-line "death by a thousand cuts" scenario, since that's the worst-case N for this hackathon's expected scale |
| GOV18-NFR2 | Fixed-point precision / rounding-bypass resistance | Test a discount deliberately set to something like 5.001% against a 5.00% limit | System correctly flags this as an excess (however tiny), not silently rounding it down to pass — per the spec's explicit concern about floating-point bypasses |
| GOV18-NFR3 | Audit trail on routing events | Any quote that gets auto-approved, or routed to Manager/Finance | Logged with acting context, timestamp, and the reason (i.e., the actual score/slab that triggered the routing) — not just "routed," but why |

---

## 8. Priority Summary for Judges/Demo

**GOV18-09 through GOV18-12** are the four scenarios lifted directly from the spec's own "QA Test Cases (Proving the Engine to Judges)" table — this is literally titled for demo purposes. Run all four in sequence during your live demo: clean quote (auto-approve) → single breach (Manager) → mixed category (Manager+Finance) → death by a thousand cuts (Manager, via aggregate not worst-line). This progression visibly proves the engine handles both single severe breaches and widespread small ones, which is the entire differentiating pitch of DealFlow360. **GOV18-19** (client-side tamper resistance) is the single highest-value security test in this whole test plan — verify it before demo day, since it's invisible in a normal walkthrough but catastrophic if a judge happens to open dev tools.
