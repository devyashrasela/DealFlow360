# Test Plan — Screen 11: Customer Portal Negotiation

**Product:** DealFlow360
**Source:** Customer Portal Negotiation spec (both versions provided — Section 3.1, FR-POR-01 through FR-POR-07)

---

## 1. Test Scope

Covers the customer-facing negotiation experience: authentication boundary, line-level negotiation requests, order-level counter-proposals, status transitions (Sent → Under Negotiation → Confirmed), auto re-routing to approval on threshold breach, and downstream event generation on confirmation. This screen is the customer-facing half of the auth model tested in Screen 1 — several tests here directly verify that Screen 1's redaction/scoping rules actually hold up in this specific UI.

---

## 2. Preconditions / Test Data Setup

- A customer portal user account correctly scoped to exactly one relationship (e.g., Acme Corp ↔ provider).
- A quotation (Q-1042) in `Sent` status, visible to that customer, with a known Gold-tier discount ceiling (15%) for breach testing.
- A second, unrelated quotation belonging to a different customer org, to test cross-tenant access attempts.
- An assigned Sales Rep account to verify negotiation alerts arrive correctly.

---

## 3. Functional Test Cases — Authentication Boundary (FR-POR-01)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| POR11-01 | Customer login scoping | Log in via customer portal credentials for Acme Corp | Loads Screen 11 pre-filtered to Acme Corp's own quotations only; internal nav tabs (Approvals, Fulfillment, Reports, etc.) are completely invisible, not just disabled | Must |
| POR11-02 | Cross-tenant quotation access attempt | While logged in as Acme's customer user, attempt to open a quotation URL belonging to a different customer org | Denied — per the Screen 1 pattern, expect `404 Not Found` rather than `403`, to avoid confirming the record exists | Must |
| POR11-03 | Internal API access attempt | While authenticated as a customer, call an internal endpoint directly (e.g., `/api/approvals`, `/api/stock`, `/api/margin`) | `403 Forbidden` on every internal endpoint, regardless of how the request is crafted | Must |
| POR11-04 | Redacted field check on portal payload | Inspect the actual data delivered to Screen 11 for a quotation | No margin %, unit cost, internal notes, or approval rejection reasons present anywhere in the payload — consistent with AUTH-29 from the Screen 1 test plan | Must |

---

## 4. Functional Test Cases — Line-Level Negotiation (FR-POR-02)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| POR11-05 | Expand line item negotiation drawer | Click "Negotiate Line" on any line item | Inline drawer opens beneath that specific line with Request Type dropdown, Counter Value input, and Note field | Must |
| POR11-06 | Request type — additional discount | Select "Request Additional Discount", enter a target %, add a justification note, save | Line-level request is saved and associated with the correct line item | Must |
| POR11-07 | Request type — adjust quantity | Select "Adjust Quantity", enter a new target quantity, save | Line-level request saved correctly, distinct from a discount request | Must |
| POR11-08 | Request type — general question | Select "Ask a Question" / "General Question", enter free text only (no numeric value) | Saves correctly without requiring a numeric counter value — confirm the numeric field isn't force-required for this request type | Should |
| POR11-09 | Save Line Request vs. Clear | Enter data in the drawer, click "Clear" | Drawer resets without saving; clicking "Save Line Request" afterward on a cleared drawer doesn't submit stale data | Should |
| POR11-10 | Multiple line requests before submission | Add negotiation requests to 2+ different lines before clicking the overall "Submit Request" | All line-level requests are bundled and submitted together in one submission event, not sent as separate individual triggers | Must |

---

## 5. Functional Test Cases — Order-Level Counter & Status Transitions (FR-POR-03, FR-POR-04)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| POR11-11 | Order-level counter live recalculation | Enter a target overall discount % or target total in the counter box | Net Amount Payable recalculates live in the customer view before submission | Must |
| POR11-12 | Submit Request transitions status | Click "Submit Request" with at least one line or order-level request pending | Quotation status pill changes from `Sent` to `Under Negotiation`; internal rep receives a negotiation alert in their Recent Activity feed | Must |
| POR11-13 | Confirm Quotation disabled during pending review | After submitting a request, attempt to click "Confirm Quotation" before the rep has responded | Button is disabled/locked, per FR-POR-04, preventing the customer from confirming outdated or unreviewed terms | Must |
| POR11-14 | Confirm Quotation re-enabled after rep response | Rep accepts/adjusts the counter-proposal internally | "Confirm Quotation" becomes available again for the customer to act on | Must |

---

## 6. Functional Test Cases — Approval Re-Routing on Breach (FR-POR-05)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| POR11-15 | Counter within tier limit | Gold customer (15% ceiling) requests a 12% counter-discount | Rep can accept without triggering re-approval; quote proceeds toward confirmation | Must |
| POR11-16 | Counter breaches tier limit (spec worked example) | Gold customer requests 22% counter-discount, exceeding their 15% ceiling | Rep accepting the terms automatically re-routes the quote to Manager/Finance approval (Screens 5/6) — this must happen automatically, not require the rep to manually resubmit | Must — critical governance test, matches earlier blended-risk-score priority |
| POR11-17 | Counter breaches category (not tier) limit | Customer counters a Services line specifically, pushing it above the Services category ceiling even though overall tier limit isn't breached | Same auto re-routing behavior applies — confirms the blended risk engine (Screen 17/18 logic) is actually invoked here, not bypassed because the request came from the portal | Must |
| POR11-18 | Rep rejects the counter instead of accepting | Rep declines the customer's counter-proposal | Quote does NOT proceed to re-approval; status handling should return quote to a state where customer can revise or confirm original terms — confirm exact behavior with dev team | Should |

---

## 7. Functional Test Cases — Confirmation & Downstream Events (FR-POR-06, FR-POR-07)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| POR11-19 | Confirm Quotation lock | Click "Confirm Quotation" on accepted terms | Line items immediately lock to immutable state; status becomes `Confirmed` | Must |
| POR11-20 | Downstream: fulfillment trigger | Confirm a quote containing physical goods | Order appears in Screen 7 (Fulfillment List) shortly after confirmation | Must |
| POR11-21 | Downstream: subscription trigger | Confirm a quote containing recurring lines | New subscription record appears in Screen 9 | Must |
| POR11-22 | Downstream: invoice trigger | Confirm any quote | Standard invoice posts to Screen 12 (Invoices List) | Must |
| POR11-23 | Downstream: all three simultaneously | Confirm a quote mixing hardware + subscription lines | All three downstream events (fulfillment, subscription, invoice) fire correctly from the single confirmation action, without requiring separate manual triggers | Must |
| POR11-24 | Double-confirmation race (ties to Screen 1 Edge Case 9) | Two customer users from the same org both click Confirm at nearly the same time | Exactly one succeeds; the second receives `409 Conflict` per the optimistic concurrency pattern | Must |

---

## 8. Edge Cases & Open Questions

| ID | Test / Question | Notes |
|---|---|---|
| POR11-25 | Payment gateway vs. manual recording | Confirm with dev team whether Screen 11 needs an actual mock card checkout, or whether payment is purely recorded internally on Screen 12/13. Test whichever is decided — don't assume | Open question from spec |
| POR11-26 | Partial payment status labeling | If partial payment support intersects this screen (e.g., a "balance due" indicator on a confirmed quote), confirm whether it shows a distinct `Partially Paid` state | Open question from spec |
| POR11-27 | PDF export watermarking during negotiation | Attempt to download a PDF while quote is `Under Negotiation` | Confirm with team whether download is allowed at this stage, and if so, that it's watermarked `DRAFT / UNDER NEGOTIATION` — don't assume this exists until confirmed | Open question from spec |

---

## 9. Non-Functional Test Cases

| ID | Test | Expected Result |
|---|---|---|
| POR11-NFR1 | Role/session isolation under load | Customer portal tokens carry `role: customer_portal` scope; verify this holds even under concurrent multi-user sessions, not just single-session manual testing |
| POR11-NFR2 | State transition latency | Confirm Quotation → internal Confirmed state resolves across fulfillment/billing in under 400ms per spec |
| POR11-NFR3 | Audit completeness | Every counter-proposal, rep acceptance, approval re-entry, and downstream trigger produces a distinct timestamped audit entry — spot-check the full chain for one end-to-end negotiation, not just the final Confirmed state |

---

## 10. Priority Summary for Judges/Demo

**POR11-16** (the 22%-over-Gold-limit auto re-routing) is your single most important demo moment on this screen — it's the exact scenario called out in the QA Test Cases of the original problem statement (Section 9, step 7: "request a bigger discount as the customer... confirm the quote goes back for approval automatically"). Rehearse this specific flow end-to-end before the demo. **POR11-02/03** (cross-tenant and internal-API access attempts) are the security tests most worth running early, since a portal that leaks internal data or another customer's quote undermines the entire "zero cross-tenant leakage" pitch from Screen 1's own stated KPIs.
