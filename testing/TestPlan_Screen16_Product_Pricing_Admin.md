# Test Plan — Screen 16: Product, Price List & Upsell Admin

**Product:** DealFlow360
**Source:** Screen 15 & 16 spec (Section 3.2, FR-PRD-01 through FR-PRD-05)

---

## 1. Test Scope

Covers backend catalog administration: product/variant creation, tier-based price lists, and the upsell/cross-sell recommendation engine configuration. This is a configuration screen, but its correctness is really only provable by testing its DOWNSTREAM effect on Screen 4 (Quotation Builder) — so most tests here are two-part: configure on Screen 16, verify the effect on Screen 4.

---

## 2. Preconditions / Test Data Setup

- Admin access to the backend configuration area.
- At least one existing product with no variants, to test adding a first variant attribute.
- A customer account in a known tier (e.g., Gold) for tier-price-list cross-verification.
- At least 2 products with distinct margin profiles, to test the Minimum Margin Threshold cutoff (one above, one below a test threshold).

---

## 3. Functional Test Cases — Master Product Catalog (FR-PRD-01)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| PRD16-01 | Create new product | Click "+ Create Product", fill Name, Category, Price, Unit, Tax, Description | Product saved and appears in the Master Data Table with correct SKU Code auto-generated or entered | Must |
| PRD16-02 | Master table column accuracy | Inspect the catalog table | SKU Code, Product Name, Category, Base Price, Unit Cost, Tax Rate, Variant Count, Actions all populate correctly | Must |
| PRD16-03 | Variant creation — spec worked example | Edit a product, add Variant Attribute "Pack" with Price Delta `+$50` | Quotation Builder (Screen 4) renders a dropdown option for this variant; selecting it updates unit price automatically by exactly +$50 — this is the spec's own Test Case 3 | Must |
| PRD16-04 | Multiple variant attributes on one product | Add two variant attributes (e.g., "Size" and "Pack") to the same product | Quotation Builder shows both as independent selectable dimensions, and price deltas from both apply additively (or per whatever combination rule the team defines — confirm and test explicitly) | Should |
| PRD16-05 | Variant Count column accuracy | After adding variants | "Variant Count" in the master table reflects the actual number of variant combinations/attributes defined | Should |
| PRD16-06 | Edit existing product base fields | Change the Base Price of an existing product | New quotations reflect the updated price; existing/locked quotations do NOT retroactively change (ties to NFR below) | Must |

---

## 4. Functional Test Cases — Price Lists (FR-PRD-02)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| PRD16-07 | Tier-based price application — spec worked example | Configure a specific price list for a customer tier, build a quote for a customer in that tier | Base catalog price reflects the tier's list price BEFORE any custom line discounts are applied — this is the spec's own Test Case 4 | Must |
| PRD16-08 | Different tiers, different prices | Configure distinct price lists for Bronze/Silver/Gold, build identical quotes for customers in each tier | Base prices differ correctly per tier before any rep-applied discount | Must |
| PRD16-09 | Currency-specific rule application | If multi-currency is in scope, configure a currency-specific price rule and build a quote for a customer in that currency context | Correct currency-adjusted price applies — otherwise mark as bonus/out-of-scope per earlier Screen 15 open question | Should |
| PRD16-10 | Price list precedence over base catalog price | Customer has an active tier price list AND the base catalog price changes | Confirm the tier price list takes precedence, not the raw base price, when both exist | Must |

---

## 5. Functional Test Cases — Upsell & Cross-Sell Engine (FR-PRD-03, FR-PRD-04, FR-PRD-05)

| ID | Test | Steps | Expected Result | Priority |
|---|---|---|---|---|
| PRD16-11 | Minimum Margin Threshold cutoff — spec worked example | Set Minimum Margin Threshold to 30%, add a product pairing with 22% margin | System suppresses the pairing from the Upsell Panel when building a quote on Screen 4 — this is the spec's own Test Case 6 | Must |
| PRD16-12 | Above-threshold pairing surfaces normally | Add a pairing with margin above the configured threshold | Pairing appears normally in the Upsell Panel suggestions | Must |
| PRD16-13 | Promoted tag ranking boost — spec worked example | Mark an accessory as Promoted | On the Quotation Builder, the accessory surfaces higher in the suggestions list than it otherwise would — this is the spec's own Test Case 5 | Must |
| PRD16-14 | Historical co-purchase pairing definition | Define a new Trigger Product → Suggested Pairing rule manually | Rule appears in the Co-Purchase Rule Pairing Table with correct Historical Co-Purchase %, Promoted Tag, and Status columns | Must |
| PRD16-15 | Remove Pairing action | Click "Remove Pairing" on an existing rule | Rule is deleted from the table AND no longer surfaces as a suggestion on Screen 4 | Must |
| PRD16-16 | Margin threshold change affects existing pairings retroactively | Lower the Minimum Margin Threshold after pairings already exist | Previously-suppressed pairings that now clear the new (lower) threshold should reappear as suggestions without needing to be manually re-added | Should |
| PRD16-17 | Promoted ranking vs. margin threshold interaction | Mark a below-threshold-margin product as Promoted | Confirm the margin threshold suppression still wins — a Promoted tag should not override the hard margin cutoff, since FR-PRD-03 uses "must" language | Must — worth testing explicitly since these two rules could conflict if implemented naively |

---

## 6. Non-Functional Test Cases

| ID | Test | Expected Result |
|---|---|---|
| PRD16-NFR1 | Pricing rule integrity — locked orders unaffected | Update a tier price list or variant surcharge after some orders are already confirmed/invoiced | New quotation lines reflect the updated pricing immediately; existing locked, confirmed, or invoiced orders remain completely unchanged — this is explicitly called out in the spec and is a high-value integrity test |
| PRD16-NFR2 | Propagation immediacy | Time how quickly a price/variant change becomes available in a NEW quotation | Should be immediate (no caching delay) per spec, though this isn't given a hard millisecond figure — confirm reasonable expectation with dev team |

---

## 7. Edge Cases

| ID | Test | Expected Result |
|---|---|---|
| PRD16-18 | Automated vs. manual co-purchase mining (open question) | Confirm with dev team whether pairings are meant to be mined automatically from historical order data, or manually curated by an Admin for the hackathon demo — test whichever is actually implemented, don't assume automation exists | Flag as resolved decision before writing further tests against this feature |
| PRD16-19 | Deleting a product referenced by existing orders | Attempt to delete/deactivate a product that has already been sold on a confirmed order | Historical order/invoice line items should remain intact and display correctly even if the live catalog product is later removed or deactivated | Should |
| PRD16-20 | View-only access for Sales Rep | Log in as a Sales Rep and navigate to Screen 16 | Can view active price lists and promoted bundles, but cannot edit/create/delete — confirm this matches the spec's stated role permissions | Must |

---

## 8. Priority Summary for Judges/Demo

**PRD16-03** (variant price delta) and **PRD16-11/13** (margin cutoff suppression + promoted ranking boost) are the three spec-provided worked examples — chain them together as one demo: configure a variant and a promoted/suppressed pairing on Screen 16, then immediately jump to Screen 4 and show the Quotation Builder reflecting all three changes live. This demonstrates the config-to-builder pipeline actually works end-to-end, which is more convincing than showing Screen 16 in isolation. **PRD16-NFR1** (locked orders unaffected by later price changes) is worth a quick manual check, since a config change accidentally altering historical invoice totals would be a serious, judge-visible integrity bug.
