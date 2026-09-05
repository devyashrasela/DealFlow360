# DealFlow360 — Relational Integrity, Indexing & Concurrency Controls (`relationship_schema.md`)

This specification provides the production database constraints, foreign key matrix, indexing architecture, and concrete concurrency controls for DealFlow360.

---

## 1. Foreign Key & Relational Integrity Matrix

| Source Table & Column | Target Table & Column | Cardinality | ON DELETE | ON UPDATE | Business Justification |
|---|---|---|---|---|---|
| `organization_memberships(organization_id)` | `organizations(id)` | 1:N | `CASCADE` | `CASCADE` | Purging tenant purges employee affiliations cleanly. |
| `organization_memberships(user_id)` | `users(id)` | 1:N | `CASCADE` | `CASCADE` | Deleting global user de-links contextual memberships. |
| `customer_accounts(provider_organization_id)`| `organizations(id)` | 1:N | `RESTRICT` | `CASCADE` | Cannot delete seller organization with active client accounts. |
| `customer_accounts(buyer_organization_id)` | `organizations(id)` | 1:N | `RESTRICT` | `CASCADE` | Cannot delete customer organization with commercial ties. |
| `customer_accounts(assigned_sales_rep_id)` | `users(id)` | 1:N | `SET NULL` | `CASCADE` | Rep turnover unassigns account without deleting commercial history. |
| `products(organization_id)` | `organizations(id)` | 1:N | `CASCADE` | `CASCADE` | Deleting seller organization removes its product catalog. |
| `product_variants(product_id)` | `products(id)` | 1:N | `CASCADE` | `CASCADE` | Deleting parent product cascades to delete its SKU variants. |
| `price_lists(organization_id)` | `organizations(id)` | 1:N | `CASCADE` | `CASCADE` | Price lists belong to seller tenant. |
| `price_list_items(price_list_id)` | `price_lists(id)` | 1:N | `CASCADE` | `CASCADE` | Deleting price schedule removes its itemized rates. |
| `price_list_items(product_id)` | `products(id)` | 1:N | `CASCADE` | `CASCADE` | Removing catalog product removes its price list entries. |
| `price_list_items(product_variant_id)` | `product_variants(id)` | 1:N | `CASCADE` | `CASCADE` | Removing SKU variant removes variant price overrides. |
| `upsell_rules(organization_id)` | `organizations(id)` | 1:N | `CASCADE` | `CASCADE` | Tenant owns upsell rule configurations. |
| `upsell_rules(trigger_product_id)` | `products(id)` | 1:N | `CASCADE` | `CASCADE` | Removing trigger item purges recommendation trigger. |
| `upsell_rules(recommended_product_id)` | `products(id)` | 1:N | `CASCADE` | `CASCADE` | Removing recommended item purges suggestion. |
| `product_attachments(parent_product_id)` | `products(id)` | 1:N | `CASCADE` | `CASCADE` | Removing parent SKU removes attachment requirements. |
| `product_attachments(attached_product_id)` | `products(id)` | 1:N | `CASCADE` | `CASCADE` | Removing attached SKU deletes dependency rule. |
| `discount_tier_ceilings(organization_id)` | `organizations(id)` | 1:N | `CASCADE` | `CASCADE` | Tenant owns customer tier discount policies. |
| `category_ceilings(organization_id)` | `organizations(id)` | 1:N | `CASCADE` | `CASCADE` | Tenant owns product category discount policies. |
| `approval_chains(organization_id)` | `organizations(id)` | 1:N | `CASCADE` | `CASCADE` | Tenant owns risk slab definitions. |
| `approval_rules(approval_chain_id)` | `approval_chains(id)` | 1:N | `CASCADE` | `CASCADE` | Removing approval slab removes nested escalation rules. |
| `quotations(organization_id)` | `organizations(id)` | 1:N | `CASCADE` | `CASCADE` | Tenant isolation boundary. |
| `quotations(customer_account_id)` | `customer_accounts(id)`| 1:N | `RESTRICT` | `CASCADE` | Cannot delete customer account with active deals. |
| `quotations(assigned_sales_rep_id)` | `users(id)` | 1:N | `RESTRICT` | `CASCADE` | Sales rep auditing integrity; rep cannot be purged if owning quotes. |
| `quotations(price_list_id)` | `price_lists(id)` | 1:N | `RESTRICT` | `CASCADE` | Prevents removing active pricing schedule tied to live quotes. |
| `quotation_lines(quotation_id)` | `quotations(id)` | 1:N | `CASCADE` | `CASCADE` | Deleting draft quote cascades to purge line items. |
| `quotation_lines(product_id)` | `products(id)` | 1:N | `RESTRICT` | `CASCADE` | Cannot delete product currently quoted on deals. |
| `quotation_lines(product_variant_id)` | `product_variants(id)` | 1:N | `RESTRICT` | `CASCADE` | Cannot delete variant referenced in deal lines. |
| `negotiation_threads(quotation_id)` | `quotations(id)` | 1:N | `CASCADE` | `CASCADE` | Negotiation messages deleted if draft quote is destroyed. |
| `negotiation_threads(quotation_line_id)` | `quotation_lines(id)` | 1:N | `SET NULL` | `CASCADE` | If quote line is deleted during editing, preserves negotiation text. |
| `negotiation_threads(author_user_id)` | `users(id)` | 1:N | `RESTRICT` | `CASCADE` | Author attribution must remain permanent for audit. |
| `quotation_approvals(quotation_id)` | `quotations(id)` | 1:N | `CASCADE` | `CASCADE` | Quote deletion removes approval workflow chain. |
| `quotation_approvals(assigned_user_id)` | `users(id)` | 1:N | `SET NULL` | `CASCADE` | Unassigns reviewer if reviewer account is modified. |
| `quotation_approvals(action_by_user_id)` | `users(id)` | 1:N | `SET NULL` | `CASCADE` | Retains approval signoff even if approving manager leaves. |
| `approval_audit_logs(quotation_id)` | `quotations(id)` | 1:N | `CASCADE` | `CASCADE` | Audit records linked to quotation lifecycle. |
| `approval_audit_logs(actor_user_id)` | `users(id)` | 1:N | `RESTRICT` | `CASCADE` | Preserves immutable audit compliance identity. |
| `warehouses(organization_id)` | `organizations(id)` | 1:N | `CASCADE` | `CASCADE` | Warehouses belong to seller tenant. |
| `warehouse_stock(warehouse_id)` | `warehouses(id)` | 1:N | `CASCADE` | `CASCADE` | Decommissioning facility cascades stock balances. |
| `warehouse_stock(product_id)` | `products(id)` | 1:N | `RESTRICT` | `CASCADE` | Cannot delete product that has existing stock records. |
| `warehouse_stock(product_variant_id)` | `product_variants(id)` | 1:N | `RESTRICT` | `CASCADE` | Cannot delete variant with active inventory records. |
| `fulfillment_orders(quotation_id)` | `quotations(id)` | 1:N | `RESTRICT` | `CASCADE` | Cannot delete quote once fulfillment order is issued. |
| `fulfillment_orders(warehouse_id)` | `warehouses(id)` | 1:N | `RESTRICT` | `CASCADE` | Warehouse cannot be deleted with pending dispatches. |
| `fulfillment_items(fulfillment_order_id)`| `fulfillment_orders(id)`| 1:N | `CASCADE` | `CASCADE` | Cancelling fulfillment order deletes itemized split items. |
| `fulfillment_items(quotation_line_id)` | `quotation_lines(id)` | 1:N | `RESTRICT` | `CASCADE` | Prevents removing quote line when goods are allocated. |
| `backorders(quotation_id)` | `quotations(id)` | 1:N | `RESTRICT` | `CASCADE` | Backorder preserves connection to originating deal. |
| `backorders(quotation_line_id)` | `quotation_lines(id)` | 1:N | `RESTRICT` | `CASCADE` | Backorder ties directly to specific physical line item. |
| `backorders(target_warehouse_id)` | `warehouses(id)` | 1:N | `SET NULL` | `CASCADE` | Deleting depot leaves backorder open for reallocation. |
| `backorders(resolved_fulfillment_order_id)`| `fulfillment_orders(id)`| 1:N | `SET NULL`| `CASCADE` | Links resolved backorder to outgoing fulfillment dispatch. |
| `subscriptions(customer_account_id)` | `customer_accounts(id)`| 1:N | `RESTRICT` | `CASCADE` | Account cannot be deleted with active recurring contracts. |
| `subscriptions(origin_quotation_id)` | `quotations(id)` | 1:N | `RESTRICT` | `CASCADE` | Subscription retains origin sales quote reference. |
| `subscription_line_items(subscription_id)`| `subscriptions(id)`| 1:N | `CASCADE` | `CASCADE` | Subscription deletion cascades to line items. |
| `billing_schedules(subscription_id)` | `subscriptions(id)` | 1:N | `CASCADE` | `CASCADE` | Terminating contract purges projected future schedules. |
| `billing_schedules(generated_invoice_id)`| `invoices(id)` | 1:1 | `SET NULL` | `CASCADE` | Prevents invoice deletion from cascading into contract schedule. |
| `subscription_events(subscription_id)` | `subscriptions(id)` | 1:N | `CASCADE` | `CASCADE` | Contract audit history cascades with contract. |
| `invoices(customer_account_id)` | `customer_accounts(id)`| 1:N | `RESTRICT` | `CASCADE` | Financial ledger cannot be deleted; preserves tax compliance. |
| `invoices(origin_quotation_id)` | `quotations(id)` | 1:N | `SET NULL` | `CASCADE` | Invoices remain immutable in ledger even if quote is archived. |
| `invoices(origin_subscription_id)` | `subscriptions(id)` | 1:N | `SET NULL` | `CASCADE` | Invoices remain valid even if subscription is cancelled. |
| `invoice_lines(invoice_id)` | `invoices(id)` | 1:N | `CASCADE` | `CASCADE` | Voiding unposted invoice removes lines. |
| `payments(invoice_id)` | `invoices(id)` | 1:N | `RESTRICT` | `CASCADE` | Cannot delete invoice with recorded cash payments. |
| `payments(recorded_by_user_id)` | `users(id)` | 1:N | `RESTRICT` | `CASCADE` | Finance cashier audit identity cannot be purged. |
| `credit_allocations(credit_note_invoice_id)`| `invoices(id)` | 1:N | `RESTRICT` | `CASCADE` | Credit note cannot be deleted while offset against open invoice. |
| `credit_allocations(target_invoice_id)` | `invoices(id)` | 1:N | `RESTRICT` | `CASCADE` | Target invoice cannot be deleted while holding applied credit. |
| `deal_health_alerts(quotation_id)` | `quotations(id)` | 1:N | `CASCADE` | `CASCADE` | Archiving quote cleans up active diagnostics. |
| `rep_discount_baselines(sales_rep_id)` | `users(id)` | 1:1 | `CASCADE` | `CASCADE` | Deleting sales rep profile deletes their baseline stats. |

---

## 2. Composite Keys, Unique Constraints & Check Constraints

```sql
-- 1. Unique Constraints & Composite Identifiers
ALTER TABLE organizations ADD CONSTRAINT uq_organizations_slug UNIQUE (slug);
ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email);
ALTER TABLE organization_memberships ADD CONSTRAINT uq_org_user UNIQUE (organization_id, user_id);

ALTER TABLE customer_accounts ADD CONSTRAINT uq_provider_buyer_account 
  UNIQUE (provider_organization_id, buyer_organization_id);
ALTER TABLE customer_accounts ADD CONSTRAINT uq_provider_account_number 
  UNIQUE (provider_organization_id, account_number);

ALTER TABLE products ADD CONSTRAINT uq_org_sku UNIQUE (organization_id, sku);
ALTER TABLE product_variants ADD CONSTRAINT uq_product_variant_sku UNIQUE (product_id, variant_sku);
ALTER TABLE price_list_items ADD CONSTRAINT uq_price_list_product_variant 
  UNIQUE NULLS NOT DISTINCT (price_list_id, product_id, product_variant_id);

ALTER TABLE upsell_rules ADD CONSTRAINT uq_org_upsell_pair 
  UNIQUE (organization_id, trigger_product_id, recommended_product_id);
ALTER TABLE product_attachments ADD CONSTRAINT uq_parent_attached_pair 
  UNIQUE (parent_product_id, attached_product_id);

ALTER TABLE discount_tier_ceilings ADD CONSTRAINT uq_org_tier_ceiling 
  UNIQUE (organization_id, tier);
ALTER TABLE category_ceilings ADD CONSTRAINT uq_org_category_ceiling 
  UNIQUE (organization_id, category);
ALTER TABLE approval_chains ADD CONSTRAINT uq_org_risk_tier 
  UNIQUE (organization_id, risk_tier);

ALTER TABLE quotations ADD CONSTRAINT uq_org_quotation_number 
  UNIQUE (organization_id, quotation_number);
ALTER TABLE quotation_lines ADD CONSTRAINT uq_quote_line_number 
  UNIQUE (quotation_id, line_number);
ALTER TABLE quotation_approvals ADD CONSTRAINT uq_quote_step_order 
  UNIQUE (quotation_id, step_order);

ALTER TABLE warehouses ADD CONSTRAINT uq_org_warehouse_code 
  UNIQUE (organization_id, code);
ALTER TABLE warehouse_stock ADD CONSTRAINT uq_warehouse_product_variant 
  UNIQUE NULLS NOT DISTINCT (warehouse_id, product_id, product_variant_id);

ALTER TABLE fulfillment_orders ADD CONSTRAINT uq_org_fulfillment_number 
  UNIQUE (organization_id, fulfillment_number);
ALTER TABLE fulfillment_items ADD CONSTRAINT uq_fulfillment_order_line 
  UNIQUE (fulfillment_order_id, quotation_line_id);

ALTER TABLE subscriptions ADD CONSTRAINT uq_org_subscription_code 
  UNIQUE (organization_id, subscription_code);
ALTER TABLE billing_schedules ADD CONSTRAINT uq_sub_cycle_number 
  UNIQUE (subscription_id, cycle_number);

ALTER TABLE invoices ADD CONSTRAINT uq_org_invoice_number 
  UNIQUE (organization_id, invoice_number);
ALTER TABLE payments ADD CONSTRAINT uq_org_payment_number 
  UNIQUE (organization_id, payment_number);

ALTER TABLE rep_discount_baselines ADD CONSTRAINT uq_org_rep_baseline 
  UNIQUE (organization_id, sales_rep_id);

-- 2. Domain Business Rule CHECK Constraints
ALTER TABLE products ADD CONSTRAINT chk_product_prices_positive 
  CHECK (base_list_price >= 0.00 AND standard_unit_cost >= 0.00);

ALTER TABLE quotation_lines ADD CONSTRAINT chk_quote_line_discount_range 
  CHECK (applied_discount_percentage >= 0.00 AND applied_discount_percentage <= 100.00);
ALTER TABLE quotation_lines ADD CONSTRAINT chk_quote_line_qty_positive 
  CHECK (quantity > 0);
ALTER TABLE quotation_lines ADD CONSTRAINT chk_quote_line_prices_positive 
  CHECK (unit_list_price >= 0.00 AND unit_cost_price >= 0.00 AND unit_net_price >= 0.00);

ALTER TABLE warehouse_stock ADD CONSTRAINT chk_warehouse_stock_quantities 
  CHECK (on_hand_quantity >= 0 AND soft_reserved_quantity >= 0 AND hard_allocated_quantity >= 0 
         AND on_hand_quantity >= (soft_reserved_quantity + hard_allocated_quantity));

ALTER TABLE fulfillment_items ADD CONSTRAINT chk_fulfillment_item_qty_positive 
  CHECK (quantity_allocated > 0);
ALTER TABLE backorders ADD CONSTRAINT chk_backorder_qty_positive 
  CHECK (backorder_quantity > 0);

ALTER TABLE subscriptions ADD CONSTRAINT chk_subscription_period_valid 
  CHECK (current_period_end > current_period_start);
ALTER TABLE subscription_line_items ADD CONSTRAINT chk_sub_line_qty_price 
  CHECK (quantity > 0 AND unit_price >= 0.00 AND applied_discount_percentage BETWEEN 0.00 AND 100.00);

ALTER TABLE payments ADD CONSTRAINT chk_payment_amount_positive 
  CHECK (amount > 0.00);
ALTER TABLE credit_allocations ADD CONSTRAINT chk_credit_allocation_positive 
  CHECK (allocated_amount > 0.00);
ALTER TABLE credit_allocations ADD CONSTRAINT chk_credit_allocation_distinct_invoices 
  CHECK (credit_note_invoice_id <> target_invoice_id);

ALTER TABLE approval_chains ADD CONSTRAINT chk_approval_chains_risk_scores 
  CHECK (min_risk_score >= 0.00 AND (max_risk_score IS NULL OR max_risk_score >= min_risk_score));
```

---

## 3. Indexing & Optimization Strategy

```sql
-- 1. Foreign Key & Tenant Isolation B-Tree Indexes
CREATE INDEX idx_memberships_user ON organization_memberships(user_id);
CREATE INDEX idx_customer_accounts_buyer ON customer_accounts(buyer_organization_id);
CREATE INDEX idx_products_tenant ON products(organization_id, category, is_active);
CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_price_list_items_lookup ON price_list_items(price_list_id, product_id, product_variant_id);

-- 2. High-Frequency Composite Query Indexes
-- Quotation Builder & Dashboard Filtering
CREATE INDEX idx_quotations_tenant_stage_rep ON quotations(organization_id, stage, assigned_sales_rep_id);
CREATE INDEX idx_quotations_customer_account ON quotations(customer_account_id, stage);
CREATE INDEX idx_quotation_lines_quote_id ON quotation_lines(quotation_id, line_number);

-- Inventory & Stock Resolution (Pessimistic Locking Path)
CREATE INDEX idx_warehouse_stock_lookup ON warehouse_stock(warehouse_id, product_id, product_variant_id);

-- Unified Financial Ledger Queries
CREATE INDEX idx_invoices_tenant_status_due ON invoices(organization_id, status, due_date);
CREATE INDEX idx_invoices_customer_status ON invoices(customer_account_id, status);
CREATE INDEX idx_invoices_origin_quotation ON invoices(origin_quotation_id);
CREATE INDEX idx_invoices_origin_subscription ON invoices(origin_subscription_id);
CREATE INDEX idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_credit_allocations_target ON credit_allocations(target_invoice_id);
CREATE INDEX idx_credit_allocations_source ON credit_allocations(credit_note_invoice_id);

-- 3. High-Performance Partial Indexes
-- Unresolved Deal Health Anomalies for Instant Dashboard Rendering (< 50ms)
CREATE INDEX idx_deal_health_active_alerts ON deal_health_alerts(organization_id, anomaly_type, severity)
  WHERE resolution_status = 'active';

-- Quotations Awaiting Review (Manager & Finance Queues)
CREATE INDEX idx_quotations_pending_approval ON quotations(organization_id, risk_tier, created_at)
  WHERE stage = 'pending_approval';

-- Active Customer Negotiations Requiring Rep Response
CREATE INDEX idx_quotations_under_negotiation ON quotations(organization_id, assigned_sales_rep_id, updated_at)
  WHERE stage = 'under_negotiation';

-- Unfulfilled Open Backorders Requiring Consolidation
CREATE INDEX idx_backorders_open ON backorders(organization_id, product_id, status)
  WHERE status IN ('open', 'stock_received_pending_consolidation');

-- Subscriptions Due for Automated Cycle Billing
CREATE INDEX idx_subscriptions_cycle_due ON subscriptions(organization_id, next_invoice_date)
  WHERE status = 'active';

-- 4. Semi-Structured JSONB GIN Indexes
CREATE INDEX idx_audit_payload_gin ON approval_audit_logs USING gin (payload_snapshot);
CREATE INDEX idx_product_variant_attr_gin ON product_variants USING gin (attributes);
CREATE INDEX idx_deal_health_payload_gin ON deal_health_alerts USING gin (diagnostic_payload);
```

---

## 4. Concurrency & Race Condition Controls

### 4.1 Multi-Warehouse Inventory Reservation Pattern (`SELECT ... FOR UPDATE`)
When an order is confirmed or a warehouse split is accepted, concurrent requests competing for the same SKU inventory must serialize on the physical stock row:

```sql
-- Executed inside a Read-Committed Transaction:
BEGIN;

-- 1. Acquire exclusive row lock on target depot stock in deterministic PK order to avoid deadlocks:
SELECT id, on_hand_quantity, soft_reserved_quantity, hard_allocated_quantity, 
       (on_hand_quantity - soft_reserved_quantity - hard_allocated_quantity) AS available_to_fulfill
FROM warehouse_stock
WHERE warehouse_id = 'c38a2e31-8f92-4f3b-9e4a-912a7a4b1234'
  AND product_id = 'e7b1a092-2b3c-4a11-8f3e-4b1a2c3d4e5f'
  AND (product_variant_id IS NULL OR product_variant_id = '00000000-0000-0000-0000-000000000000')
FOR UPDATE;

-- 2. Verify stock sufficiency in application tier:
-- If available_to_fulfill >= requested_units:
UPDATE warehouse_stock
SET hard_allocated_quantity = hard_allocated_quantity + :requested_units,
    updated_at = CURRENT_TIMESTAMP
WHERE id = :stock_record_id;

-- 3. Insert fulfillment parcel item:
INSERT INTO fulfillment_items (fulfillment_order_id, quotation_line_id, product_id, quantity_allocated)
VALUES (:fulfillment_order_id, :quotation_line_id, :product_id, :requested_units);

-- Else (Insufficient stock):
-- Allocate available_quantity to fulfillment_items and spill excess to backorders table:
INSERT INTO backorders (organization_id, quotation_id, quotation_line_id, product_id, backorder_quantity, status)
VALUES (:org_id, :quote_id, :line_id, :product_id, (:requested_units - available_quantity), 'open');

COMMIT;
```

### 4.2 Invoice Payment Reconciliation & Credit Note Offsetting
Prevents race conditions where concurrent payments or simultaneous credit note applications overpay an invoice or double-spend an unallocated credit note balance:

```sql
-- Executed inside a Serializable Transaction:
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- 1. Lock target invoice row:
SELECT id, total_amount, amount_paid, amount_credited, balance_due
FROM invoices
WHERE id = :target_invoice_id
FOR UPDATE;

-- 2. Lock credit note invoice row:
SELECT id, total_amount, amount_credited
FROM invoices
WHERE id = :credit_note_id AND document_type = 'credit_note'
FOR UPDATE;

-- 3. Verify invariants:
-- :allocation_amount <= target_invoice.balance_due
-- :allocation_amount <= (ABS(credit_note.total_amount) - credit_note.amount_credited)

-- 4. Apply allocation:
INSERT INTO credit_allocations (credit_note_invoice_id, target_invoice_id, allocated_amount, allocated_by_user_id)
VALUES (:credit_note_id, :target_invoice_id, :allocation_amount, :current_user_id);

-- 5. Update target invoice balances:
UPDATE invoices
SET amount_credited = amount_credited + :allocation_amount,
    balance_due = total_amount - (amount_paid + amount_credited + :allocation_amount),
    status = CASE 
      WHEN (amount_paid + amount_credited + :allocation_amount) >= total_amount THEN 'paid'::invoice_status_enum
      ELSE 'partially_paid'::invoice_status_enum
    END,
    lock_version = lock_version + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE id = :target_invoice_id;

-- 6. Update credit note consumed balance:
UPDATE invoices
SET amount_credited = amount_credited + :allocation_amount,
    status = CASE 
      WHEN (amount_credited + :allocation_amount) >= ABS(total_amount) THEN 'credited'::invoice_status_enum
      ELSE status
    END,
    lock_version = lock_version + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE id = :credit_note_id;

COMMIT;
```

### 4.3 Optimistic Concurrency Control (OCC) for Quotation Builder
To prevent two sales reps or a customer portal user and sales rep from overwriting quote line items simultaneously:
```sql
UPDATE quotations
SET stage = :new_stage,
    gross_total = :new_gross,
    net_subtotal = :new_net,
    blended_risk_score = :new_score,
    lock_version = lock_version + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE id = :quote_id AND lock_version = :expected_lock_version;

-- If rows affected == 0, rollback and return 409 Conflict:
-- "Quotation has been updated by another user. Please refresh and review latest changes."
```
