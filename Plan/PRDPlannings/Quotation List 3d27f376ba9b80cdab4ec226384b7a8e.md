# Quotation List

# PRD — Screen 3: Quotations (List)

**Product:** DealFlow360
**Screen:** Screen 3 (per mockup navigation key — opened via "Quotations" tab)
**Source:** Excalidraw mockup (Screen 3 frame) + DealFlow360 problem statement (Section B2)

---

## 1. Purpose

Screen 3 is the master list of **every quotation in the system**, displayed as a **Kanban-style pipeline board** — one card per quotation, grouped into columns by stage. Per the mockup's own annotation: *"Every quotation in the system, one row per quotation, click a row to open it."*

This is the entry point to the Quotation Builder (Screen 4) and doubles as the visual pipeline view referenced in the PDF (Section B2 — "Quotation List / Pipeline View").

---

## 2. Users

| Role | What they see |
| --- | --- |
| Sales Rep | Their own quotations (and possibly team quotations, depending on permission scope — see Open Questions) |
| Sales Manager | Team-wide quotations, useful for oversight before/after approval |
| Finance/Ops | Quotations relevant to fulfillment/billing status |
| Admin | All quotations org-wide |

---

## 3. Screen Layout (as per mockup)

### 3.1 Top Navigation (persistent)

- Logo / product name
- Tabs: Dashboard | **Quotations** (active) | Approvals | Fulfillment | Subscriptions | Invoices | Deal Health | Reports

### 3.2 Header

- Screen title: **"Quotations (List)"**
- Subtitle: *"Every quotation in the system, one row per quotation, click a row to open it"*

### 3.3 Pipeline Board — 5 Stage Columns

| Column | Example card shown in mockup |
| --- | --- |
| **Draft** | Acme Corp – $12,400 <br> Delta LLC – $3,200 |
| **Pending Approval** | Beta Industries – $28,900 |
| **Approved** | Nova Retail – $9,750 |
| **Negotiation** | Zenith Co – $15,300 |
| **Confirmed** | Orion Ltd – $41,000 |
- Each card shows: **Customer name** + **quotation amount**
- Cards are clickable → opens Screen 4 (Quotation Detail/Builder) for that specific quotation
- Columns can hold multiple cards (Draft column shows 2 example cards, stacked)

### 3.4 Bottom Actions

- **"+ New Quotation"** — creates a blank quotation, opens Screen 4 in builder mode
- **"Switch to Table View"** — toggles from Kanban board to a flat table/list layout (alternate view of the same data)

---

## 4. Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Display all quotations as cards grouped into 5 stage columns: Draft, Pending Approval, Approved, Negotiation, Confirmed | Must |
| FR-2 | Each card shows customer name and quotation total amount at minimum | Must |
| FR-3 | Clicking any card opens Screen 4 (Quotation Detail) for that specific quotation | Must |
| FR-4 | "+ New Quotation" creates a new blank quotation in Draft stage and opens the builder | Must |
| FR-5 | "Switch to Table View" toggles to a flat, sortable table representation of the same underlying data — same quotations, different layout | Should |
| FR-6 | Stage column reflects the quotation's actual current status — moving between columns happens automatically as status changes elsewhere (e.g., approval granted moves a card from Pending Approval → Approved), not via manual drag-and-drop (confirm with team — see Open Questions) | Must |
| FR-7 | List/board respects role-based visibility — a Rep should not see quotations outside their scope if the org enforces per-rep restriction (confirm scope rule with team) | Should |
| FR-8 | List reflects multi-tenant boundaries — only quotations belonging to the currently active organization are shown | Must |
| FR-9 | Data refreshes via the global "Reload Data" action (per PDF Section B1) | Must |

---

## 5. Non-Functional Requirements

- **Accuracy of stage placement:** since this pipeline view is the main way reps and managers judge deal progress at a glance, a quotation sitting in the wrong column (e.g., still showing "Pending Approval" after it was actually approved) is a high-severity bug, not cosmetic.
- **Scalability of columns:** with real usage, columns like Draft or Negotiation could grow to many cards — confirm whether the board scrolls, paginates, or truncates per column.
- **Consistency with Dashboard counts:** the "Open Quotations" count on Screen 2 must match what's actually visible here (excluding Confirmed, if that's the agreed definition — see Screen 2 PRD Open Questions).

---

## 6. Open Questions / Ambiguities to Clarify With Dev Team

1. **Column transitions — automatic or draggable?** The mockup doesn't show drag handles, and the PDF's business logic (auto-routing to approval, auto re-entry into approval after customer negotiation) implies stage changes are **system-driven**, not manually dragged by the user. Confirm this explicitly — if devs build free drag-and-drop between columns, that would let a Rep illegally self-approve a quotation by dragging it into "Approved."
2. **Visibility scope:** does a Sales Rep see only their own quotations, or the whole team's? Not specified in mockup or PDF text directly.
3. **Card additional info:** should cards eventually show more than name + amount (e.g., days-in-stage, discount %, assigned rep)? Mockup shows minimal info; PDF doesn't add extra requirements here, but this could matter for spotting stalled deals at a glance (ties into Deal Health, Screen 14).
4. **Table View columns:** what fields appear in the alternate table view? Undefined in mockup — needs a decision before dev builds it.

---

## 7. Test Cases (for QA)

| # | Test | Expected Result |
| --- | --- | --- |
| 1 | Open Quotations screen with known seed data across all 5 stages | Cards appear in the correct column matching each quotation's actual status |
| 2 | Click a card in any column | Opens Screen 4 detail/builder for that exact quotation (correct customer, correct amount) |
| 3 | Click "+ New Quotation" | New blank quotation created in Draft; appears as a new card in Draft column after returning to Screen 3 |
| 4 | Approve a quotation that was in "Pending Approval" | Card automatically moves to "Approved" column without manual drag |
| 5 | Customer submits a counter-discount that exceeds threshold (from portal) | Quotation card moves from "Negotiation" → "Pending Approval" automatically |
| 6 | Click "Switch to Table View" | Same set of quotations shown in table form, no data loss or mismatch vs. board view |
| 7 | Attempt to drag a card between columns (if UI allows it) | Should be blocked/read-only, OR if allowed, confirm this doesn't bypass real approval logic (flag as high-severity if it does) |
| 8 | Log in under a different organization | Only that organization's quotations appear — no cross-tenant leakage |
| 9 | Compare "Open Quotations" count on Dashboard (Screen 2) vs. cards visible here | Counts match under the agreed definition of "open" |

---

## 8. Downstream Screens Linked From This Screen

| Action on Screen 3 | Navigates to |
| --- | --- |
| Click any quotation card | Screen 4 (Quotation Detail / Builder) |
| "+ New Quotation" | Screen 4 (blank builder) |