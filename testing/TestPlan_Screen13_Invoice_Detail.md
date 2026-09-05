# Test Plan — Screen 13: Invoice Detail

**Product:** DealFlow360
**Source:** Invoice Detail and Deal Health Dashboard spec (Section 3.1, FR-INV-07 through FR-INV-12)

---

## 1. Test Scope

Covers the single-invoice deep-dive: hybrid line-item breakdown (hardware/services/subscription on one document), financial summary/totals math, payment/credit ledger tabs, and the immutability lock once an invoice reaches Posted/Paid status. This is the screen where tax and rounding precision actually gets scrutinized line by line, so several tests here are deliberately arithmetic-heavy.

---

## 2. Preconditions / Test Data Setup

- An invoice with genuinely mixed line types on one document: a hardware line (with discount and tax), a services line (with discount, no tax), and a subscription line (recurring, with tax) — matching the spec's own worked example (INV-9011).
- Payment history with at least 2 recorded payments (to test the Payment History tab with multiple rows).
- At least one linked credit note available for the "Applied Credits" tab.
- An invoice already in `Posted` or `Paid` status, to test the immutability lock.

---

## 3. Functional Test Cases — Invoice Rendering (FR-INV-07, FR-INV-08)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| INV13-01 | Navigate from ledger to detail | Click `INV-9011` on Screen 12 | Screen 13 renders line items, discounts, customer billing details, and correct $0 paid balance matching the ledger record — this is the spec's own Test Case 1 | Must |
| INV13-02 | Header and status badge | Open any invoice | Document Title shows correct ID (`Invoice: INV-9011` or `Credit Note: CR-3004` format); Status Badge color matches actual state (Posted/Paid/Partially Paid/Credited/Overdue) | Must |
| INV13-03 | Context & linkage strip | Open any invoice | Origin Reference badge correctly links to parent order or subscription; Customer Context shows org name, billing address, tax ID, tier badge; Timeline shows Invoice Date, Due Date, Payment Terms | Must |
| INV13-04 | Hybrid line itemization (spec worked example) | Open an invoice with Laptop (Hardware, One-Time), Setup Service (Services, One-Time), Cloud Security Retainer (Subscription, Recurring Monthly) | All three lines display separately with correct Category and Billing Type columns — subscription line clearly marked as recurring, not lumped with one-time items | Must |
| INV13-05 | Line-level tax calculation accuracy | Verify Laptop line: Qty 2, $1,200 unit, 12% discount, 8.25% tax | Net Amount = `2 × 1200 × (1-0.12) = $2,112.00`; Line Total = `2112 × 1.0825 = $2,286.24` — confirm exact match, not approximate | Must |
| INV13-06 | Zero-tax line handling | Verify Setup Service line: 0.00% tax rate | Net Amount and Line Total are equal (no tax added); confirm the system doesn't apply a default/fallback tax rate incorrectly | Must |
| INV13-07 | Subscription line recurring cadence display | Verify Cloud Security Retainer line | Billing Type clearly shows "Recurring (Mo)" or equivalent, distinguishing it from the one-time lines on the same document | Must |

---

## 4. Functional Test Cases — Financial Summary Block

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| INV13-08 | Gross Subtotal accuracy | Sum all lines' undiscounted amounts | Matches displayed Gross Subtotal exactly | Must |
| INV13-09 | Applied Discounts accuracy | Sum all line-level discount deductions | Matches displayed Applied Discounts exactly | Must |
| INV13-10 | Total Tax aggregation | Sum all lines' tax amounts (including the $0 line) | Matches displayed Total Tax exactly | Must |
| INV13-11 | Grand Total = Subtotal − Discounts + Tax | Cross-check the full formula against all three lines from INV13-04 | Grand Total matches exactly, banker's-rounded to 2 decimals | Must |
| INV13-12 | Amount Paid / Balance Due consistency | Record a partial payment via Screen 12, then reopen this invoice | Amount Paid reflects the recorded amount; Balance Due = Grand Total − Amount Paid, exactly | Must |

---

## 5. Functional Test Cases — Payment Capture (FR-INV-09, FR-INV-10)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| INV13-13 | Direct payment capture validation | Click "Record Payment", enter an amount, confirm | Input is validated against Balance Due; a new row appends to Payment History; document status updates immediately | Must |
| INV13-14 | Partial settlement — spec worked example | On a $2,286.24 total invoice, record a $1,000.00 payment | Status switches to `Partially Paid`; Amount Paid shows exactly $1,000.00; Balance Due shows exactly $1,286.24 — this is the spec's own Test Case 2, treat as the acceptance test | Must |
| INV13-15 | Overpayment attempt | Attempt to record a payment greater than the current Balance Due | Confirm exact handling with dev team (reject, cap, or allow with resulting negative balance/credit) — not explicitly specified, flag as open item | Should |
| INV13-16 | Multiple partial payments accumulating to full | Record two partial payments that together equal Grand Total | Status transitions correctly to fully `Paid` after the second payment, not stuck at `Partially Paid` | Must |

---

## 6. Functional Test Cases — Credit Note Offsetting (FR-INV-11)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| INV13-17 | Apply credit note to reduce balance | Allocate an available credit note against this invoice's Balance Due | Balance Due decreases dollar-for-dollar by the credit note's amount | Must |
| INV13-18 | Applied Credits tab display | After applying a credit note | "Applied Credits" tab shows the linked credit note (e.g., CR-3004) with its offsetting amount clearly attributed | Must |

---

## 7. Functional Test Cases — Immutability Lock (FR-INV-12)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| INV13-19 | Line item lock on Posted status | Attempt to manually edit a line item (price, qty, discount) on an invoice already in `Posted` status | Edit is blocked/disabled — line items are read-only once Posted | Must — critical financial integrity test |
| INV13-20 | Line item lock on Paid status | Same as above, but on a fully `Paid` invoice | Also blocked; no distinction that would allow editing a paid invoice's line items | Must |
| INV13-21 | Payment operations still logged despite line lock | Record a payment or apply a credit note on a locked (Posted) invoice | Payment/credit operations still succeed and log to the audit trail — the lock applies to line-item editing only, not to legitimate payment recording | Must |

---

## 8. Settlement & Audit Ledger Tabs

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| INV13-22 | Payment History tab completeness | Record 2+ payments via different methods | Each appears as a separate row with Payment Date, Transaction ID, Method, Recorded By, Amount Applied — all accurate | Must |
| INV13-23 | Activity Log tab completeness | Perform several actions on the invoice (creation, email dispatch, payment) | Each action appears as a distinct timestamped entry in the Activity Log tab | Must |

---

## 9. Non-Functional Test Cases

| ID | Test | Expected Result |
|---|---|---|
| INV13-NFR1 | Banker's rounding precision | Test tax/total calculations specifically designed to hit a rounding boundary (e.g., a line total ending in exactly .xx5) to confirm consistent banker's rounding is applied, not standard round-half-up, per spec | Must |
| INV13-NFR2 | Zero fractional-cent drift across the whole document | Sum every line's exact Line Total and compare against Grand Total | Must match to the cent, with no accumulated rounding error across multiple lines |

---

## 10. Priority Summary for Judges/Demo

**INV13-04/INV13-14** together form the strongest demo pairing on this screen — showing one invoice with genuinely mixed hardware/service/subscription lines (proving hybrid billing works on a single document, not three separate invoices) and then a live partial payment recording that produces the exact $1,286.24 balance. **INV13-19/20** (immutability lock) is worth a quick manual check before the demo since it's invisible in a happy-path walkthrough but would be an obvious red flag to a judge who tries editing a posted invoice.
