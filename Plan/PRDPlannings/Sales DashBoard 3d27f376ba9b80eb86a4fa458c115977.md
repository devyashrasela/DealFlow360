# Sales DashBoard

# PRD — Screen 2: Sales Dashboard / Home

**Product:** DealFlow360
**Screen:** Screen 2 (per mockup navigation key — opened via "Dashboard" tab)
**Source:** Excalidraw mockup (Screen 2 frame) + DealFlow360 problem statement (Section B1, B9)

---

## 1. Purpose

The Sales Dashboard is the **central hub** internal users land on after login. It is not a deep-dive analytics screen (that's Screen 14 – Deal Health, and Screen 15 – Reports) — it's a **quick-glance + navigation launchpad**: what needs attention right now, and one-click paths into the modules where the actual work happens.

Per the mockup's own annotation: *"Central hub, links out to every module below."*

---

## 2. Users

| Role | What they see / can do here |
| --- | --- |
| Sales Rep | Own pending items, quick action to start a new quotation |
| Sales Manager/Approver | Pending Approvals count relevant to their queue |
| Finance/Ops | Pending Approvals (finance-stage items) |
| Admin | Same dashboard, plus access to backend config via top nav (not part of this screen) |

*(Note: confirm with dev team whether this dashboard is role-scoped — e.g., does a Rep's "Pending Approvals" count include approvals they don't have permission to act on? See Section 6 — Open Questions.)*

---

## 3. Screen Layout (as per mockup)

### 3.1 Top Navigation (persistent across all internal screens)

- Logo / product name ("DealFlow360")
- Tabs: **Dashboard** (active/highlighted here) | Quotations | Approvals | Fulfillment | Subscriptions | Invoices | Deal Health | Reports

### 3.2 Header

- Screen title: **"Sales Dashboard / Home"**
- Subtitle: *"Central hub, links out to every module below"*

### 3.3 Summary Cards (3 cards, left to right)

| Card | Label shown | Sample value in mockup |
| --- | --- | --- |
| Card 1 | Pending Approvals | "4 quotations waiting" |
| Card 2 | Open Quotations | "12 active deals" |
| Card 3 | At-Risk Deals | "3 flagged by Deal Health" |

Each card is a **count + one-line context label**, not a chart — this screen is meant to be scanned in seconds.

### 3.4 Quick Action Buttons (row below summary cards)

- **"+ New Quotation"** — primary action, starts a new quotation (→ opens Screen 3/4 quotation builder flow)
- **"View Approvals"** — secondary action, jumps to the Approvals list (→ Screen 5)

### 3.5 Recent Activity Feed

- Header: **"Recent Activity"**
- Simple reverse-chronological list, examples shown in mockup:
    - "Acme Corp quotation approved by Finance"
    - "Beta Industries requested a discount change"
    - "East Depot stock updated for Order #2291"

Note: activity entries span multiple modules (approvals, customer negotiation, warehouse/fulfillment) — this is a cross-module feed, not scoped to one entity type.

---

## 4. Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Display 3 summary cards: Pending Approvals count, Open Quotations count, At-Risk Deals count — values must be live, pulled from actual data, not hardcoded | Must |
| FR-2 | "Pending Approvals" count reflects quotations currently awaiting Manager and/or Finance approval | Must |
| FR-3 | "Open Quotations" count reflects quotations in Draft, Pending Approval, Negotiation, or Approved states (i.e., not yet Confirmed/closed — confirm exact state list with team) | Must |
| FR-4 | "At-Risk Deals" count reflects quotations flagged by Deal Health logic (stalled deals, discount anomalies, delivery slippage — per Section B9 of PDF) | Must |
| FR-5 | Clicking a summary card navigates to the relevant filtered list (e.g., clicking "Pending Approvals" → Approvals screen pre-filtered to pending items) | Should |
| FR-6 | "+ New Quotation" button opens a blank quotation builder | Must |
| FR-7 | "View Approvals" button opens the Approvals list screen | Must |
| FR-8 | Recent Activity feed shows the latest N events across modules (approvals, negotiation requests, stock/fulfillment updates), most recent first | Must |
| FR-9 | Recent Activity entries are clickable and deep-link to the relevant quotation/order record | Should |
| FR-10 | Dashboard data refreshes on load and via the global "Reload Data" action (per PDF Section B1) | Must |

---

## 5. Non-Functional Requirements

- **Freshness:** Counts and activity feed must reflect near-real-time state — this is the first screen a user sees, so stale numbers undermine trust in the whole "self-governing" pitch of the product.
- **Performance:** Should load without waiting on heavy report-style aggregation; this is a lightweight glance screen, not the Reports module.
- **Consistency:** Numbers shown here (e.g., "12 active deals") must match what's actually visible when the user clicks through to the Quotations list — no drift between summary and detail.

---

## 6. Open Questions / Ambiguities to Clarify With Dev Team

1. **Role scoping:** Does "Pending Approvals: 4" mean *all* pending approvals company-wide, or only those this specific user can act on? (A Rep shouldn't see Finance-only approval counts as if they're actionable by them.)
2. **"At-Risk Deals" definition:** The PDF's Deal Health section (B9) defines multiple flag types (stalled, discount anomaly, delivery slippage) — does this card count all of them combined, or is it a single specific trigger? Needs a precise definition for testing.
3. **Time window for Recent Activity:** Is it "last 24 hours," "last N events," or unbounded? Mockup doesn't specify — needs a team decision.
4. **Multi-org context:** Given the multi-tenant architecture discussed earlier, this dashboard must be scoped to the currently-selected organization only — confirm data isolation applies here too (see earlier architecture note on tenant isolation).

---

## 7. Test Cases (for QA)

| # | Test | Expected Result |
| --- | --- | --- |
| 1 | Create a new quotation with a discount that requires approval | "Pending Approvals" count increments by 1 without manual refresh (or after Reload Data) |
| 2 | Approve a pending quotation | "Pending Approvals" count decrements; "Recent Activity" shows the approval event |
| 3 | Age a quotation past the stalled-deal threshold (via seed data) | "At-Risk Deals" count increments; Deal Health flag appears |
| 4 | Click "Pending Approvals" card | Navigates to Approvals list, correctly filtered |
| 5 | Click "+ New Quotation" | Opens blank quotation builder (Screen 3/4) |
| 6 | Trigger a warehouse stock update | "Recent Activity" reflects it (e.g., "East Depot stock updated for Order #XXXX") |
| 7 | Log in as two different orgs (multi-tenant test) | Dashboard numbers and activity are fully separate — no cross-org data leak |
| 8 | Log in as a Rep vs a Manager | Confirm whether Pending Approvals count differs based on role scope (per Open Question #1) |

---

## 8. Downstream Screens Linked From This Screen

| Action on Screen 2 | Navigates to |
| --- | --- |
| "+ New Quotation" | Screen 3/4 (Quotation List → Builder) |
| "View Approvals" / Pending Approvals card | Screen 5/6 (Approvals List → Detail) |
| Open Quotations card | Screen 3 (Quotations List) |
| At-Risk Deals card | Screen 14 (Deal Health) |
| Recent Activity item click | Relevant quotation/order detail screen |