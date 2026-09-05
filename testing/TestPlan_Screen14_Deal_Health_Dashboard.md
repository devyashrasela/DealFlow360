# Test Plan — Screen 14: Deal Health & Anomaly Dashboard

**Product:** DealFlow360
**Source:** Invoice Detail and Deal Health Dashboard spec (Section 3.2, FR-HLT-01 through FR-HLT-06)

---

## 1. Test Scope

Covers the three anomaly detection streams (Stalled Deals, Discount Anomaly, Delivery Slippage), the statistical engine behind discount anomaly detection, deep-linking from alerts, and the rep-nudge/escalation actions. This screen is where several other modules' data converges (Quotations, Approvals, Fulfillment), so many tests here are cross-screen integration checks, not isolated UI checks.

---

## 2. Preconditions / Test Data Setup

- A quotation with `Last Activity Date` set 6+ days in the past, with the Stalled Deal threshold configured to 5 days.
- A sales rep with a known historical discounting average (e.g., 7%) and enough closed deals to establish that baseline (ties to Open Question below).
- A confirmed order with a 3-day promised delivery date where part of the order is marked Backorder (per Screen 8 fulfillment split).
- Admin access to configure Deal Health thresholds (stalled aging days, anomaly sensitivity, SLA windows).

---

## 3. Functional Test Cases — Header & Global Actions

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| HLT14-01 | Run Diagnostic Scan | Click "Run Diagnostic Scan" | Forces immediate rule re-evaluation across all three streams, rather than waiting for the next scheduled/background pass | Must |
| HLT14-02 | Configure Thresholds access | Click "Configure Thresholds" | Opens Admin-only threshold configuration (stalled deal aging days, discount anomaly sensitivity, SLA windows) | Must |
| HLT14-03 | Risk Overview cards accuracy | Compare the 3 summary cards (Stalled Quotations, Discount Anomalies, Delivery Slippage Risks) against the actual row counts in each stream below | Counts match exactly — same class of bug as the Dashboard/Approvals counter mismatches tested earlier | Must |

---

## 4. Functional Test Cases — Stream A: Stalled Deals (FR-HLT-01)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| HLT14-04 | Stalled detection — spec worked example | Seed a quote with Last Activity Date 6 days prior, threshold set to 5 days | Deal appears in Stalled Deals feed with high-risk badge and active "Send Nudge" action — this is the spec's own Test Case 3 | Must |
| HLT14-05 | Just-under-threshold exclusion | Seed a quote with Last Activity Date exactly 4 days prior (threshold 5 days) | Deal does NOT appear as stalled — confirms the boundary isn't off-by-one in the wrong direction | Must |
| HLT14-06 | Exact-threshold boundary | Seed a quote at exactly 5 days inactive | Confirm with dev team whether "≥ 5" (inclusive, per FR-HLT-01's own formula) is implemented correctly — test this exact boundary explicitly | Must |
| HLT14-07 | Stage restriction | Confirm stalled detection only applies to quotes in Draft, Pending Approval, or Under Negotiation | A quote sitting untouched in `Confirmed` or `Approved` state for 6+ days should NOT appear as stalled — it's not actively "stuck" | Must |
| HLT14-08 | Column accuracy | Inspect a stalled row | Quotation #, Customer, Rep, Current Stage, Days Inactive, Deal Value, Risk Level, Quick Action all populate correctly | Must |
| HLT14-09 | Quick Action — Send Nudge to Rep | Click "Send Nudge to Rep" on a stalled row | Triggers FR-HLT-05 behavior (see Section 6 below) | Must |
| HLT14-10 | Quick Action — Escalate to Manager | Click "Escalate to Manager" | Escalation is logged and routed appropriately (confirm exact destination/notification with dev team) | Should |
| HLT14-11 | Quick Action — Open Quotation deep-link | Click "Open Quotation" on a stalled row | Deep-links directly to Screen 4 with that exact quotation loaded | Must |

---

## 5. Functional Test Cases — Stream B: Discount Anomaly (FR-HLT-02)

**Reference formula:** flag when `Discount_quote > μ_rep + 1.5σ`

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| HLT14-12 | Discount anomaly — spec worked example | Rep with 7% historical average submits a quote offering 24% discount | Screen 14 flags the quote in Discount Anomaly feed; displays delta (+17pt) and blended risk level — this is the spec's own Test Case 4 | Must |
| HLT14-13 | Within-normal-variance quote | Rep with 7% average and low variance submits a quote at 9% | Should NOT be flagged as an anomaly if within `μ + 1.5σ` — confirms the engine isn't just flagging "above average" but genuinely above statistical variance | Must |
| HLT14-14 | Column accuracy | Inspect a flagged row | Quotation #, Customer, Rep, Quoted Discount, Rep Historical Avg, Variance Delta, Blended Risk, Action all populate and match the underlying math | Must |
| HLT14-15 | Quick Action — Inspect Discount Breakdown | Click this action | Opens or expands the underlying blended risk score breakdown, consistent with Screen 6's "Why This Quote Was Flagged" logic | Should |
| HLT14-16 | Quick Action — Re-route to Finance Approval (FR-HLT-06) | Click "Re-route to Finance Approval" on a flagged deal | One-click action moves the pending deal into the Finance approval queue (Screen 5/6) without requiring the rep to manually resubmit | Must |
| HLT14-17 | Distinct from blended risk score (Screen 4/17/18) | Compare this stream's anomaly detection against the blended discount risk score from the Governance module | Confirm these are two DIFFERENT (complementary) mechanisms: blended risk score checks against configured category/tier ceilings; this stream checks against the REP's own historical pattern — a quote could pass one check and fail the other. Test a case where a rep's discount is within their category ceiling but still anomalous relative to their own history | Must — this distinction is easy to conflate and worth explicitly verifying isn't accidentally implemented as the same check twice |

---

## 6. Functional Test Cases — Stream C: Delivery Slippage (FR-HLT-03)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| HLT14-18 | Slippage detection — spec worked example | Create an order with 3-day promised delivery where 4 units are marked Backorder on Screen 8 | Screen 14 flags the order under Delivery Slippage with a bottleneck notice pointing to the backorder depot — this is the spec's own Test Case 5 | Must |
| HLT14-19 | 48-hour threshold boundary | Test an order with a backordered line exactly 48 hours from expected delivery, and one at 49 hours | Confirm the flag triggers correctly at/inside the 48-hour window per FR-HLT-03, and does NOT trigger prematurely for orders with more runway | Must |
| HLT14-20 | Column accuracy | Inspect a flagged row | Order #, Customer, Promised Date, Projected Dispatch, Slippage Delay, Bottleneck Location all populate correctly, matching Screen 8's actual warehouse split data | Must |
| HLT14-21 | Quick Action — Open Fulfillment Split | Click "Open Fulfillment Split" | Deep-links directly to Screen 8 for that exact order | Must |
| HLT14-22 | Quick Action — Notify Customer | Click "Notify Customer" | Triggers an appropriate customer-facing communication (confirm exact channel/behavior with dev team) | Should |

---

## 7. Rep Nudge & Escalation Action Tests (FR-HLT-04, FR-HLT-05, FR-HLT-06)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| HLT14-23 | Automated rep nudge — spec worked example | Click "Send Nudge" on a stalled quotation row | Rep's dashboard/workspace displays the alert; deal audit history logs "Management nudge dispatched" — this is the spec's own Test Case 7 | Must |
| HLT14-24 | Nudge dispatch timing | Time the nudge from click to appearance in rep's workspace | Dispatches within 5 seconds per NFR | Should |
| HLT14-25 | Deep-link from anomaly alert — spec worked example | Click the quotation badge on a discount anomaly alert | Browser deep-links directly to Screen 4 with the discount risk breakdown visible — this is the spec's own Test Case 6 | Must |
| HLT14-26 | Deep-link consistency across all 3 streams | Test deep-links from all three stream types (Stalled → Screen 4, Anomaly → Screen 4, Slippage → Screen 8) | Every deep-link opens the CORRECT screen type for its entity — a common bug is all three streams routing to the same generic detail screen | Must |

---

## 8. Edge Cases Tied to Open Questions

| ID | Open Question | Test Once Resolved |
|---|---|---|
| HLT14-27 | Baseline sample size for anomaly detection | Test a brand-new rep with 0 or 1 closed deals — confirm whether the system falls back to a company-wide tier benchmark instead of an undefined/unreliable personal average. A rep with insufficient history should not produce a nonsensical anomaly flag (or a false negative from a zero-variance calculation) |
| HLT14-28 | Business days vs. calendar days | Seed a quote inactive over a weekend — confirm whether "Days Inactive" counts calendar days or excludes weekends/holidays, and test the stalled threshold accordingly |
| HLT14-29 | Automated escalation after N nudges | If implemented, test that after N unacknowledged nudges the deal auto-escalates to a manager; if NOT implemented (manual-only per spec ambiguity), confirm escalation always requires explicit manager action | Confirm actual behavior with dev team before finalizing this test's pass criteria |

---

## 9. Non-Functional Test Cases

| ID | Test | Expected Result |
|---|---|---|
| HLT14-NFR1 | Diagnostic scan latency at scale | Seed 1,000+ active quotes and open fulfillments, run the diagnostic scan | Completes in under 500ms without locking transactional tables (verify via DB lock monitoring, not just wall-clock time) |
| HLT14-NFR2 | Notification reliability | Trigger multiple nudges/escalations in quick succession | All dispatch within 5 seconds each, none silently dropped |
| HLT14-NFR3 | Multi-tenant isolation | Log in under a different organization | All three streams show only that org's deals — no cross-tenant flags visible |

---

## 10. Priority Summary for Judges/Demo

**HLT14-04, HLT14-12, and HLT14-18** are the three spec-provided worked examples — rehearse all three as your primary demo path, since together they prove all three detection streams work with real thresholds, not just static badges. **HLT14-17** (distinguishing rep-historical anomaly from category/tier blended risk) is worth double-checking internally even if you don't demo it explicitly, since conflating the two is an easy shortcut a rushed build might take, and a technically-minded judge may ask about the difference.
