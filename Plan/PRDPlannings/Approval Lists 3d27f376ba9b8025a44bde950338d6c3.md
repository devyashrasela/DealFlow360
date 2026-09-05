# Approval Lists

# PRD — Screen 5: Approvals (List)

**Product:** DealFlow360
**Screen:** Screen 5 (opened via "Approvals" tab, or "View Approvals" / "Pending Approvals" card from Dashboard)
**Source:** Excalidraw mockup (Screen 5 frame) + DealFlow360 problem statement (Section B4, Section 10)

---

## 1. Purpose

Screen 5 is the master list of **every quotation that needed, needs, or is currently going through discount approval**. Per the mockup subtitle: *"Every quotation that needed, needs, or is going through discount approval."*

This is where Sales Managers and Finance/Ops users work from — it surfaces the **Blended Risk score** per quotation (the core governance mechanism from PDF Section 10) and routes into Screen 6 (Approval Detail) for the actual review/decision.

---

## 2. Users

| Role | What they do here |
| --- | --- |
| Sales Manager/Approver | Reviews quotations assigned to them or awaiting Manager-level approval |
| Finance/Ops | Reviews quotations that passed Manager approval and now need Finance-level review |
| Sales Rep | Likely read-only view of their own submitted quotations' approval status (confirm with team — see Open Questions) |
| Admin | Full visibility across all approvals |

---

## 3. Screen Layout (as per mockup)

### 3.1 Top Navigation (persistent)

- Logo, tabs: Dashboard | Quotations | **Approvals** (active) | Fulfillment | Subscriptions | Invoices | Deal Health | Reports

### 3.2 Header

- Title: **"Approvals (List)"**
- Subtitle: *"Every quotation that needed, needs, or is going through discount approval"*

### 3.3 Summary Counters (row below header)

- **"3 Pending"**
- **"1 Returned"**
- **"12 Approved"**

These are quick-glance counts, similar in spirit to the Dashboard's summary cards.

### 3.4 Approvals Table

| Column | Purpose |
| --- | --- |
| Quotation | Quotation ID |
| Customer | Customer name |
| Blended Risk | Risk level: HIGH / MEDIUM / LOW (per PDF Section 10 blended discount risk score) |
| Stage | Current approval stage: e.g., "Sales Manager", "Finance", or "Auto-Approved" |
| Assigned To | Named approver, or "-" if not applicable (e.g., auto-approved) |

**Example rows from mockup:**

| Quotation | Customer | Blended Risk | Stage | Assigned To |
| --- | --- | --- | --- | --- |
| Q-1042 | Acme Corp | HIGH | Sales Manager | M. Shah |
| Q-1039 | Beta Industries | MEDIUM | Finance | R. Iyer |
| Q-1035 | Nova Retail | LOW | Auto-Approved | – |

Caption: *"Click any row to open its full approval detail, risk breakdown, and audit trail."*

### 3.5 Filter Control

- **"Filter: Pending Only"** toggle/control shown at the bottom — implies the list defaults to showing everything (Pending, Returned, Approved) but can be narrowed to pending items only.

---

## 4. Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Display all quotations that have gone through, or are going through, discount approval | Must |
| FR-2 | Show live summary counters: Pending, Returned, Approved (counts must reflect actual data, not static) | Must |
| FR-3 | Table shows Quotation ID, Customer, Blended Risk level, current Stage, and Assigned To | Must |
| FR-4 | **Blended Risk** value (HIGH/MEDIUM/LOW) is computed from the actual per-line discount breach logic (PDF Section 10), not a manual/arbitrary tag | Must |
| FR-5 | **Stage** correctly reflects where in the chain the quotation currently sits: Sales Manager, Finance, or Auto-Approved (no approval needed) | Must |
| FR-6 | Quotations requiring only Manager approval never show a "Finance" stage; quotations requiring both show Manager first, then Finance, in sequence | Must |
| FR-7 | "Auto-Approved" quotations (LOW risk) show "-" in Assigned To, since no human approver was involved | Must |
| FR-8 | Clicking any row opens Screen 6 (Approval Detail) for that specific quotation, showing full risk breakdown and audit trail | Must |
| FR-9 | "Filter: Pending Only" toggle narrows the table to only quotations currently awaiting action | Should |
| FR-10 | List respects multi-tenant boundaries — only the active organization's approvals are shown | Must |
| FR-11 | List respects role scope — a Sales Manager should see items relevant to Manager-level review; Finance sees Finance-stage items (confirm exact scoping rule with team) | Should |

---

## 5. Non-Functional Requirements

- **Accuracy over speed:** since this list drives real approval decisions with financial consequences, Blended Risk and Stage values must always be correct and current — no caching that could show a stale risk level for a quotation that was just edited.
- **Traceability:** every quotation on this list must have a discoverable audit trail once opened (per PDF's explicit requirement that approvals, rejections, and edits are logged with user, timestamp, and reason).
- **Consistency with Screen 2 and Screen 3:** the "Pending" count here must match the "Pending Approvals" count shown on the Dashboard (Screen 2), and quotations shown as "Pending Approval" on the Screen 3 pipeline board must appear here too.

---

## 6. Open Questions / Ambiguities to Clarify With Dev Team

1. **Role-based row visibility:** does a Sales Manager see *all* pending approvals company-wide, or only ones specifically assigned to them ("Assigned To" column implies individual assignment)? This affects both UI filtering and access-control testing.
2. **"Returned" status meaning:** the counter shows "1 Returned" — per PDF Section B4, this maps to "return for revision." Confirm: does a returned quotation go back to the Rep as Draft, or does it stay visible here in a distinct "Returned" state until resubmitted?
3. **Auto-Approved definition:** does LOW risk always mean zero human approval step, or could a LOW-risk quotation still require at least Manager sign-off depending on org configuration? The mockup example (Q-1035, LOW, Auto-Approved) suggests LOW = fully automatic, but this should be confirmed against the configured approval chain rules (PDF Section A3).
4. **Sort order / default view:** is the table sorted by risk (HIGH first), by date, or by stage? Not specified in mockup.
5. **Assigned To — manual or automatic assignment?** Is "M. Shah" assigned automatically (e.g., the Manager for that customer/territory) or manually picked? Matters for testing the routing logic end-to-end.

---

## 7. Test Cases (for QA)

| # | Test | Expected Result |
| --- | --- | --- |
| 1 | Submit a quotation with one line breaching its category limit (Manager-only threshold) | Appears here with Stage = "Sales Manager", correct Blended Risk level |
| 2 | Submit a quotation with a severe breach requiring Finance-level review | Appears with Stage = "Finance" (only after Manager step is done, or immediately if config allows — confirm with team) |
| 3 | Submit a quotation where all lines are within limits | Never appears here as Pending; if it appears at all, shows as "Auto-Approved" / LOW with "-" in Assigned To |
| 4 | Compare "3 Pending" counter against actual number of Pending rows in the table | Counts match exactly |
| 5 | Click "Filter: Pending Only" | Table narrows to only Pending-stage rows; Returned/Approved rows disappear |
| 6 | Click a row (e.g., Q-1042) | Opens Screen 6 with matching quotation ID, customer, and risk detail |
| 7 | Approve a quotation from Screen 6, then return to Screen 5 | Row's Stage updates (e.g., Manager → Finance, or Manager → Approved if no Finance step needed); Pending counter decrements accordingly |
| 8 | Return a quotation for revision | "Returned" counter increments; quotation status updates correctly and is traceable |
| 9 | Compare Blended Risk badges (HIGH/MEDIUM/LOW) against the same quotations' line-level data from Screen 4 | Risk level accurately reflects actual per-line breach severity, not a rough guess |
| 10 | Log in as a different organization | Approvals list is fully separate — no cross-tenant data leakage |
| 11 | Log in as Sales Manager vs Finance user | Confirm each sees the appropriately scoped subset (per Open Question #1) |

---

## 8. Downstream Screens Linked From This Screen

| Action on Screen 5 | Navigates to |
| --- | --- |
| Click any approval row | Screen 6 (Approval Detail — full risk breakdown, audit trail, approve/reject/return actions) |