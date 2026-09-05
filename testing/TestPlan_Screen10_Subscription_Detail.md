# Test Plan — Screen 10: Subscription Detail & Billing Schedule

**Product:** DealFlow360
**Source:** Customer Subscriptions & Recurring Billing spec (Section 3.3, FR-SUB-03 through FR-SUB-09, Section 6 Open Questions)

---

## 1. Test Scope

Covers billing schedule generation, mid-cycle proration math (increase and decrease), two-tier cancellation logic, credit note generation, and audit logging for all lifecycle changes. This screen has the most financial-calculation risk of any screen in the product — proration math must be tested with real hand-calculated numbers, not just "did a number appear."

---

## 2. Preconditions / Test Data Setup

- A monthly subscription starting on a known date (e.g., Jan 1) with a 30-day cycle, $10/seat, 10 seats.
- A subscription with an initial rep-applied discount (e.g., 10%), to test proration discount retention (Open Question).
- An annual subscription that spans a leap-year February (Open Question test).
- A subscription in an active state, ready for both increase and decrease scenarios.

---

## 3. Functional Test Cases — Billing Schedule (FR-SUB-03)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| SUB10-01 | 12-month schedule generation, monthly cadence | Open Screen 10 for a subscription starting Jan 1, monthly | Exactly 12 forward cycles rendered with correct sequential due dates (Jan 1, Feb 1, Mar 1... Dec 1) | Must |
| SUB10-02 | Schedule generation, quarterly cadence | Open a quarterly subscription starting Jan 1 | Cycles at Jan 1, Apr 1, Jul 1, Oct 1 (4 cycles/year, extrapolated across the visible window) | Must |
| SUB10-03 | Schedule generation, yearly cadence | Open a yearly subscription | Single annual cycle correctly shown | Must |
| SUB10-04 | Invoice status column accuracy | Check a cycle that's already been invoiced and paid, one scheduled, one drafted | Status column shows `Paid` (linked), `Scheduled`, or `Drafted` correctly matching actual invoice state | Must |
| SUB10-05 | Contract terms display | Open any subscription | Left column (Base Product, Plan Interval, Unit Price, Seat/Quantity, Applied Discount) and right column (Current MRR, Lifetime Value, Unbilled Accruals, Next Invoice Trigger) both populate correctly and match underlying data | Must |

---

## 4. Functional Test Cases — Mid-Cycle Proration (FR-SUB-04, FR-SUB-05)

**Reference formula:** `ΔCharge = (days_remaining / days_total) × (new_qty − old_qty) × unit_price`

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| SUB10-06 | Exact proration math — increase (spec worked example) | Day 15 of a 30-day month, increase quantity 10 → 20 seats at $10/seat | System calculates `(15/30) × 10 × $10 = $50`; immediately generates a $50 supplemental invoice; updates next cycle base to $200 | Must — this is the spec's own worked example, treat as the acceptance test |
| SUB10-07 | Live proration calculator preview | Open the Modify Plan/Quantity modal, enter a new quantity before confirming | Callout displays days remaining/total and the calculated ΔCharge live, before the change is applied | Must |
| SUB10-08 | Mid-cycle downgrade credit (FR-SUB-06) | Day 10 of a 30-day cycle, decrease quantity from 20 to 10 seats at $10/seat | System calculates overpaid balance for the reduced days and posts an automatic credit note to the customer's ledger | Must |
| SUB10-09 | Immediate proration invoicing timing | Apply a quantity increase | Supplemental invoice is generated immediately (not deferred to next billing run), and next cycle's base amount reflects the new quantity going forward | Must |
| SUB10-10 | Multiple mid-cycle changes in same cycle | Increase quantity once, then increase again later in the same cycle | Confirm the second proration calculation uses the correct remaining days and the correct "current" quantity as its baseline, not the original cycle-start quantity | Should — stacked changes are an easy place for off-by-one errors |

---

## 5. Functional Test Cases — Cancellation (FR-SUB-07, FR-SUB-08)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| SUB10-11 | Immediate cancellation with refund (spec worked example) | Day 10 of a 30-day month, $300/mo paid upfront, select "Cancel Immediately" | Contract → `Cancelled`; auto-generates a Credit Note for 20 unused days = $200; future scheduled items are cancelled | Must — spec's own worked example, treat as acceptance test |
| SUB10-12 | Cancel at period end | Select "Cancel at Period End" on an active contract | Contract remains `Active` with a `Pending Cancellation` tag; status only flips to `Cancelled` once the current billing period elapses; NO credit note is generated | Must |
| SUB10-13 | Refund calculation display | Open the cancellation modal for immediate cancellation | Modal shows the unused-days × daily-rate calculation before confirming, so the user can see the exact credit amount in advance | Must |
| SUB10-14 | Credit note linkage (FR-SUB-08) | After an immediate cancellation | The generated Credit Note is visible and correctly linked in Screen 12 (Invoices List) and Screen 13 (Invoice Detail), referencing unused days | Must |
| SUB10-15 | Keep Subscription (cancel abort) | Open cancellation modal, click "Keep Subscription" instead of confirming | No state change occurs; subscription remains fully Active with no partial modification | Must |

---

## 6. Audit Trail Test Cases (FR-SUB-09)

| ID | Test | Expected Result |
|---|---|---|
| SUB10-16 | Plan/quantity change audit | Logs user ID, timestamp, prior value, and new value for the change |
| SUB10-17 | Cancellation audit | Logs the cancellation type (immediate vs. period-end), user, timestamp, and resulting credit note reference if applicable |
| SUB10-18 | Pause/resume audit (if supported) | Confirm with dev team whether Paused status is user-triggerable from this screen — if so, it must be logged the same way as other lifecycle changes |

---

## 7. Edge Cases Tied to Open Questions (flag to dev team before assuming behavior)

| ID | Open Question | Test Once Resolved |
|---|---|---|
| SUB10-19 | Leap year proration | For an annual contract spanning a leap-year February, confirm whether `days_total` uses 366 or a flat 365 — test both a leap-year cycle and a non-leap-year cycle side by side and confirm the daily rate differs correctly if dynamic-year logic is implemented |
| SUB10-20 | Discount retention on proration | A subscription with an initial 10% rep discount has a mid-cycle seat increase — confirm whether the new seats' proration also gets the 10% discount, or reverts to list price. Test both directions explicitly since the spec leaves this open |
| SUB10-21 | Tax on prorated credit notes | An immediate cancellation with tax-inclusive pricing — confirm whether the credit note proportionally credits back tax, or handles tax separately. This affects SUB10-11's exact expected dollar amount if tax is involved |

---

## 8. Non-Functional Test Cases

| ID | Test | Expected Result |
|---|---|---|
| SUB10-NFR1 | Financial precision | All proration and MRR calculations use banker's rounding to exactly 2 decimal places — test with numbers designed to produce a rounding edge (e.g., $0.005) to confirm rounding direction is consistent |
| SUB10-NFR2 | Idempotency of billing runs | Manually re-trigger the same billing cycle's invoice generation job twice | No duplicate invoice is created for the same subscription + billing period |
| SUB10-NFR3 | Schedule rendering performance | Load a 36-period forward projection | Renders in under 200ms per spec |
| SUB10-NFR4 | Navigation deep link accuracy | From Screen 9, click SUB-4021 | Screen 10 loads with exactly matching customer metadata, terms, and schedule history — no mismatched or stale data from a previously viewed subscription |

---

## 9. Priority Summary for Judges/Demo

**SUB10-06** and **SUB10-11** are the two worked examples the spec itself provides — these should be your literal, rehearsed demo moments, since they're the clearest proof the "hybrid billing" pitch actually works with real math, not placeholder numbers. **SUB10-08** (downgrade credit) and **SUB10-12** (period-end vs. immediate distinction) are the two most likely to be under-implemented if time runs short, since immediate cancellation with refund is more visually impressive and easier to prioritize by accident.
