# DealFlow360 — Production Database Architecture & Data Dictionary (`db_design.md`)

## 1. Architecture & Design Philosophy

DealFlow360 is an enterprise-grade, self-governing B2B sales operations platform governing the entire quotation-to-cash lifecycle. The persistence tier is architected for PostgreSQL (v15+) adhering to rigorous systems engineering principles:

### 1.1 Normalization & Strategic Semi-Structured Data (3NF + JSONB)
- **Core Entities in Strict 3NF:** All relational contracts, commercial states, financial ledgers, inventory balances, and approval audit logs are modeled in Third Normal Form (3NF) to guarantee transactional integrity, eliminate update anomalies, and enforce relational invariants.
- **Tactical JSONB Extensions:** Semi-structured `JSONB` columns are strictly isolated to non-relational extension points:
  - Polymorphic audit log snapshots (`approval_audit_logs.payload_snapshot`) capturing the frozen quotation state at the moment of approval.
  - Variant dynamic attributes (`product_variants.attributes`) such as `{ "color": "space_gray", "storage": "512GB" }` allowing schemaless SKU permutations.
  - Alert context payloads (`deal_health_alerts.diagnostic_payload`) storing transient regression model outputs and statistical anomaly vectors.
  - GIN indexes (`USING gin`) are indexed on queryable JSONB keys.

### 1.2 Multi-Tenant Isolation Model (`organization_id`)
- **Shared Database, Shared Schema with Row-Level Isolation:** Every tenant-scoped table enforces an indexed `organization_id UUID NOT NULL REFERENCES organizations(id)` column.
- **Row-Level Security (RLS) Ready:** PostgreSQL RLS policies can be activated across all tenant tables using:
  ```sql
  ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation_policy ON quotations
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
  ```
- **Symmetric Organization Mapping:** Commercial interactions occur between two registered organizations (`provider_organization_id` and `customer_organization_id`) joined via bilateral `customer_accounts` or `organization_relationships`.

### 1.3 Concurrency & Transactional Isolation
- **Pessimistic Row-Locking for Inventory:** Inventory reservations under `warehouse_stock` strictly execute via `SELECT ... FOR UPDATE` within read-committed transactions to prevent overselling and race-condition over-allocations.
- **Serializable Ledger Consistency:** Payment allocations and credit note applications against invoices execute within `ISOLATION LEVEL SERIALIZABLE` or explicit invoice row locks to prevent double-spending and ledger balance drift.
- **Optimistic Concurrency Control (OCC):** Mutable transactional aggregates (`quotations`, `invoices`, `subscriptions`) contain a `lock_version INT NOT NULL DEFAULT 1` to prevent lost updates across concurrent sales rep and customer portal sessions.

---

## 2. Global Enums & Custom Types

```sql
-- User and Access Management
CREATE TYPE user_role_enum AS ENUM (
  'admin',
  'sales_manager',
  'sales_rep',
  'finance_ops',
  'customer_portal'
);

CREATE TYPE organization_type_enum AS ENUM (
  'provider',
  'customer',
  'partner'
);

CREATE TYPE membership_status_enum AS ENUM (
  'active',
  'suspended',
  'invited'
);

-- Catalog and Pricing
CREATE TYPE product_category_enum AS ENUM (
  'hardware',
  'services',
  'subscriptions'
);

CREATE TYPE billing_cadence_enum AS ENUM (
  'one_time',
  'monthly',
  'quarterly',
  'annual'
);

CREATE TYPE pricing_tier_enum AS ENUM (
  'standard',
  'bronze',
  'silver',
  'gold',
  'custom'
);

-- Governance and Approvals
CREATE TYPE risk_tier_enum AS ENUM (
  'low_risk_auto',
  'medium_risk_manager',
  'high_risk_finance'
);

CREATE TYPE approval_status_enum AS ENUM (
  'pending',
  'approved',
  'rejected',
  'escalated',
  'bypassed'
);

CREATE TYPE approval_step_role_enum AS ENUM (
  'sales_manager',
  'finance_ops',
  'executive'
);

-- Quotation Lifecycle
CREATE TYPE quote_stage_enum AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'under_negotiation',
  'confirmed',
  'rejected',
  'expired'
);

CREATE TYPE negotiation_change_type_enum AS ENUM (
  'discount_request',
  'quantity_change',
  'general_inquiry',
  'order_counter'
);

CREATE TYPE negotiation_status_enum AS ENUM (
  'submitted',
  'accepted_by_rep',
  'rejected_by_rep',
  'superseded'
);

-- Fulfillment and Logistics
CREATE TYPE warehouse_split_status_enum AS ENUM (
  'pending_allocation',
  'split_suggested',
  'allocated',
  'partially_allocated',
  'picking',
  'dispatched',
  'delivered',
  'cancelled'
);

CREATE TYPE backorder_status_enum AS ENUM (
  'open',
  'stock_received_pending_consolidation',
  'consolidated',
  'cancelled'
);

-- Subscriptions and Contracts
CREATE TYPE subscription_status_enum AS ENUM (
  'active',
  'paused',
  'pending_proration',
  'past_due',
  'pending_cancellation',
  'cancelled'
);

CREATE TYPE subscription_event_type_enum AS ENUM (
  'provisioned',
  'quantity_increase',
  'quantity_decrease',
  'plan_change',
  'paused',
  'resumed',
  'cancelled_period_end',
  'cancelled_immediate'
);

-- Invoicing, Ledger, and Settlements
CREATE TYPE document_type_enum AS ENUM (
  'standard_invoice',
  'recurring_cycle_invoice',
  'proration_invoice',
  'credit_note'
);

CREATE TYPE invoice_status_enum AS ENUM (
  'draft',
  'posted',
  'partially_paid',
  'paid',
  'credited',
  'overdue',
  'void'
);

CREATE TYPE payment_method_enum AS ENUM (
  'wire_transfer',
  'ach_check',
  'credit_card',
  'credit_note_offset'
);

CREATE TYPE payment_status_enum AS ENUM (
  'pending',
  'succeeded',
  'failed',
  'refunded'
);

-- Deal Health and Alerts
CREATE TYPE anomaly_type_enum AS ENUM (
  'stalled_deal',
  'discount_anomaly',
  'delivery_slippage',
  'margin_leak'
);

CREATE TYPE alert_severity_enum AS ENUM (
  'info',
  'warning',
  'critical'
);

CREATE TYPE alert_resolution_status_enum AS ENUM (
  'active',
  'acknowledged',
  'escalated',
  'resolved',
  'dismissed'
);
```

---

## 3. Data Dictionary / Table Specifications

### Module 1: Tenants & Auth

#### 3.1 `organizations`
Represents seller providers, buyer client accounts, and enterprise entities.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Unique immutable organization identifier |
| `legal_name` | `VARCHAR(255)` | `NOT NULL` | Registered legal business entity name |
| `trading_name` | `VARCHAR(255)` | `NULL` | DBA / commercial trading name |
| `tax_identifier` | `VARCHAR(64)` | `NULL` | Federal Tax ID, EIN, or VAT registration number |
| `slug` | `VARCHAR(100)` | `NOT NULL`, `UNIQUE` | Normalized URL identifier for routing |
| `organization_type` | `organization_type_enum` | `NOT NULL`, `DEFAULT 'provider'` | Tenant classification (`provider`, `customer`) |
| `default_currency` | `VARCHAR(3)` | `NOT NULL`, `DEFAULT 'USD'` | ISO 4217 standard 3-character currency code |
| `billing_address` | `JSONB` | `NOT NULL`, `DEFAULT '{}'` | Structured billing address JSON |
| `shipping_address` | `JSONB` | `NOT NULL`, `DEFAULT '{}'` | Structured primary physical shipping location |
| `is_active` | `BOOLEAN` | `NOT NULL`, `DEFAULT true` | Logical tenancy toggle flag |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Last updated timestamp |

#### 3.2 `users`
Global identities authenticating across internal provider systems or customer portals.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Global user identity identifier |
| `email` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` | Normalized RFC 5322 primary login email |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | Argon2id cryptographic password hash |
| `full_name` | `VARCHAR(255)` | `NOT NULL` | Display name of user |
| `phone_number` | `VARCHAR(32)` | `NULL` | International E.164 phone number |
| `is_active` | `BOOLEAN` | `NOT NULL`, `DEFAULT true` | Global login suspension toggle |
| `last_login_at` | `TIMESTAMP WITH TIME ZONE` | `NULL` | Timestamp of last successful authentication |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Identity creation timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Last profile update timestamp |

#### 3.3 `organization_memberships`
Binds global users to specific organizations with specific operational roles.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Membership assignment ID |
| `organization_id` | `UUID` | `NOT NULL`, `FK -> organizations(id) ON DELETE CASCADE` | Scoped organization tenant ID |
| `user_id` | `UUID` | `NOT NULL`, `FK -> users(id) ON DELETE CASCADE` | Associated global user ID |
| `role` | `user_role_enum` | `NOT NULL` | User RBAC role within this organization |
| `employee_identifier` | `VARCHAR(64)` | `NULL` | Tenant-specific employee code (e.g. `EMP-1042`) |
| `status` | `membership_status_enum` | `NOT NULL`, `DEFAULT 'active'` | Membership lifecycle state |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Record update timestamp |

#### 3.4 `customer_accounts`
Bilateral edge binding a buyer organization to a seller provider, storing pricing tiers, payment terms, and credit governance.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Account relationship unique ID |
| `provider_organization_id` | `UUID` | `NOT NULL`, `FK -> organizations(id) ON DELETE RESTRICT` | Seller provider tenant ID |
| `buyer_organization_id` | `UUID` | `NOT NULL`, `FK -> organizations(id) ON DELETE RESTRICT` | Buyer customer organization ID |
| `account_number` | `VARCHAR(64)` | `NOT NULL` | Provider-assigned account reference (e.g. `CUST-8021`) |
| `pricing_tier` | `pricing_tier_enum` | `NOT NULL`, `DEFAULT 'bronze'` | Pricing & discount tier (Bronze, Silver, Gold) |
| `default_payment_terms_days` | `INT` | `NOT NULL`, `DEFAULT 30` | Commercial settlement terms (Net 30, Net 60) |
| `credit_limit` | `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0.00` | Authorized maximum credit exposure |
| `assigned_sales_rep_id` | `UUID` | `NULL`, `FK -> users(id) ON DELETE SET NULL` | Dedicated sales rep handling account |
| `is_active` | `BOOLEAN` | `NOT NULL`, `DEFAULT true` | Account active state |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Timestamp established |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Timestamp modified |

---

### Module 2: Catalog & Pricing

#### 3.5 `products`
Master catalog items representing physical hardware, milestone services, and recurring subscriptions.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Product unique identifier |
| `organization_id` | `UUID` | `NOT NULL`, `FK -> organizations(id) ON DELETE CASCADE` | Tenant owner of product |
| `sku` | `VARCHAR(64)` | `NOT NULL` | Stock Keeping Unit identifier |
| `name` | `VARCHAR(255)` | `NOT NULL` | Product commercial display name |
| `description` | `TEXT` | `NULL` | Detailed technical product specification |
| `category` | `product_category_enum` | `NOT NULL` | Category (`hardware`, `services`, `subscriptions`) |
| `billing_cadence` | `billing_cadence_enum` | `NOT NULL`, `DEFAULT 'one_time'` | Payment frequency cadence |
| `base_list_price` | `DECIMAL(12,2)` | `NOT NULL`, `CHECK (base_list_price >= 0.00)` | Standard catalog list price before tiers |
| `standard_unit_cost` | `DECIMAL(12,2)` | `NOT NULL`, `CHECK (standard_unit_cost >= 0.00)` | Internal unit acquisition / COGS cost |
| `is_active` | `BOOLEAN` | `NOT NULL`, `DEFAULT true` | Catalog availability toggle |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Last updated timestamp |

#### 3.6 `product_variants`
SKU permutations (e.g. RAM, Storage, Finish) with discrete price/cost deltas.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Variant identifier |
| `product_id` | `UUID` | `NOT NULL`, `FK -> products(id) ON DELETE CASCADE` | Parent product relation |
| `variant_sku` | `VARCHAR(64)` | `NOT NULL` | Variant-specific SKU code |
| `variant_name` | `VARCHAR(255)` | `NOT NULL` | Name descriptor (e.g., "16GB RAM / 1TB SSD") |
| `price_delta` | `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0.00` | Incremental price variance added to base list |
| `cost_delta` | `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0.00` | Incremental unit COGS delta |
| `attributes` | `JSONB` | `NOT NULL`, `DEFAULT '{}'` | Structured key/value attributes JSON |
| `is_active` | `BOOLEAN` | `NOT NULL`, `DEFAULT true` | Variant status toggle |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Modification timestamp |

#### 3.7 `price_lists`
Tiered or contracted price schedules linked to customer tiers.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Price list ID |
| `organization_id` | `UUID` | `NOT NULL`, `FK -> organizations(id) ON DELETE CASCADE` | Owning tenant ID |
| `name` | `VARCHAR(255)` | `NOT NULL` | Price list name (e.g., "Gold Enterprise 2026") |
| `tier` | `pricing_tier_enum` | `NOT NULL`, `DEFAULT 'standard'` | Customer tier mapped to this list |
| `currency` | `VARCHAR(3)` | `NOT NULL`, `DEFAULT 'USD'` | Pricing ISO currency |
| `effective_start` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL` | Schedule activation validity start date |
| `effective_end` | `TIMESTAMP WITH TIME ZONE` | `NULL` | Schedule expiration date |
| `is_active` | `BOOLEAN` | `NOT NULL`, `DEFAULT true` | Active schedule status flag |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Update timestamp |

#### 3.8 `price_list_items`
Explicit negotiated unit prices overriding standard product catalog rates.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Price list line item ID |
| `price_list_id` | `UUID` | `NOT NULL`, `FK -> price_lists(id) ON DELETE CASCADE` | Parent price list ID |
| `product_id` | `UUID` | `NOT NULL`, `FK -> products(id) ON DELETE CASCADE` | Target product ID |
| `product_variant_id` | `UUID` | `NULL`, `FK -> product_variants(id) ON DELETE CASCADE` | Optional specific variant ID |
| `custom_unit_price` | `DECIMAL(12,2)` | `NOT NULL`, `CHECK (custom_unit_price >= 0.00)` | Negotiated locked unit price |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Modification timestamp |

---

### Module 3: Upsell & Bundles

#### 3.9 `upsell_rules`
Algorithmic co-purchase pairing rules with profit margin guardrails.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Upsell rule ID |
| `organization_id` | `UUID` | `NOT NULL`, `FK -> organizations(id) ON DELETE CASCADE` | Tenant ID |
| `trigger_product_id` | `UUID` | `NOT NULL`, `FK -> products(id) ON DELETE CASCADE` | Cart product that triggers recommendation |
| `recommended_product_id` | `UUID` | `NOT NULL`, `FK -> products(id) ON DELETE CASCADE` | Recommended companion product |
| `priority_rank` | `INT` | `NOT NULL`, `DEFAULT 1` | Presentation order in builder UI |
| `promotional_discount_percent` | `DECIMAL(5,2)` | `NOT NULL`, `DEFAULT 0.00`, `CHECK (promotional_discount_percent BETWEEN 0.00 AND 100.00)` | Discount applied if added via prompt |
| `is_active` | `BOOLEAN` | `NOT NULL`, `DEFAULT true` | Rule active toggle |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Modification timestamp |

#### 3.10 `product_attachments`
Mandatory attachments (e.g. compulsory power supplies, installation kits) or warranty add-ons.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Attachment rule ID |
| `organization_id` | `UUID` | `NOT NULL`, `FK -> organizations(id) ON DELETE CASCADE` | Tenant ID |
| `parent_product_id` | `UUID` | `NOT NULL`, `FK -> products(id) ON DELETE CASCADE` | Primary product requiring attachment |
| `attached_product_id` | `UUID` | `NOT NULL`, `FK -> products(id) ON DELETE CASCADE` | Compulsory or suggested attached product |
| `is_mandatory` | `BOOLEAN` | `NOT NULL`, `DEFAULT false` | If true, automatically injected into quote |
| `quantity_ratio` | `DECIMAL(8,4)` | `NOT NULL`, `DEFAULT 1.0000` | Units of attached SKU per unit of parent SKU |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |

---

### Module 4: Governance & Policies

#### 3.11 `discount_tier_ceilings`
Safe-zone discount percentage limits dictated by customer account tier.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Ceiling rule ID |
| `organization_id` | `UUID` | `NOT NULL`, `FK -> organizations(id) ON DELETE CASCADE` | Tenant ID |
| `tier` | `pricing_tier_enum` | `NOT NULL` | Customer tier (`bronze`, `silver`, `gold`) |
| `max_discount_percentage` | `DECIMAL(5,2)` | `NOT NULL`, `CHECK (max_discount_percentage BETWEEN 0.00 AND 100.00)` | Safe ceiling percentage (e.g., 15.00 for Gold) |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Modification timestamp |

#### 3.12 `category_ceilings`
Inherent product category discount thresholds preserving margins.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Category ceiling ID |
| `organization_id` | `UUID` | `NOT NULL`, `FK -> organizations(id) ON DELETE CASCADE` | Tenant ID |
| `category` | `product_category_enum` | `NOT NULL` | Category (`hardware`, `services`, `subscriptions`) |
| `max_discount_percentage` | `DECIMAL(5,2)` | `NOT NULL`, `CHECK (max_discount_percentage BETWEEN 0.00 AND 100.00)` | Category ceiling (e.g., 15% HW, 10% Svc, 5% Sub) |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Modification timestamp |

#### 3.13 `approval_chains`
Slab routing configurations based on the Blended Risk Score and gross margin floors.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Chain definition ID |
| `organization_id` | `UUID` | `NOT NULL`, `FK -> organizations(id) ON DELETE CASCADE` | Tenant ID |
| `risk_tier` | `risk_tier_enum` | `NOT NULL` | Routing slab (`low_risk_auto`, `medium_risk_manager`, `high_risk_finance`) |
| `min_risk_score` | `DECIMAL(6,2)` | `NOT NULL`, `DEFAULT 0.00` | Lower bound score of slab |
| `max_risk_score` | `DECIMAL(6,2)` | `NULL` | Upper bound score of slab (NULL = infinity) |
| `requires_manager_approval` | `BOOLEAN` | `NOT NULL`, `DEFAULT true` | Step 1 gate toggle |
| `requires_finance_approval` | `BOOLEAN` | `NOT NULL`, `DEFAULT false` | Step 2 gate toggle |
| `minimum_upsell_margin_threshold` | `DECIMAL(5,2)` | `NOT NULL`, `DEFAULT 20.00` | Suppresses upsells below this margin % |
| `absolute_margin_hard_stop` | `DECIMAL(5,2)` | `NOT NULL`, `DEFAULT 10.00` | Absolute margin floor blocking quote submission |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Modification timestamp |

#### 3.14 `approval_rules`
Fine-grained escalation predicates (deal value thresholds, negative margin exceptions).

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Rule ID |
| `approval_chain_id` | `UUID` | `NOT NULL`, `FK -> approval_chains(id) ON DELETE CASCADE` | Parent chain ID |
| `rule_name` | `VARCHAR(255)` | `NOT NULL` | Rule title |
| `predicate_condition` | `JSONB` | `NOT NULL` | Condition tree JSON (e.g., `{"field": "total_amount", "gte": 50000}`) |
| `escalate_to_role` | `approval_step_role_enum` | `NOT NULL` | Designated escalation authority role |
| `is_active` | `BOOLEAN` | `NOT NULL`, `DEFAULT true` | Rule active toggle |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |

---

### Module 5: Quotations & Deals

#### 3.15 `quotations`
Header record representing the commercial deal throughout its lifecycle.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Quotation ID |
| `organization_id` | `UUID` | `NOT NULL`, `FK -> organizations(id) ON DELETE CASCADE` | Seller provider tenant ID |
| `customer_account_id` | `UUID` | `NOT NULL`, `FK -> customer_accounts(id) ON DELETE RESTRICT` | Associated buyer account relationship |
| `quotation_number` | `VARCHAR(64)` | `NOT NULL` | Human-readable deal code (e.g. `Q-1042`) |
| `stage` | `quote_stage_enum` | `NOT NULL`, `DEFAULT 'draft'` | Current quotation lifecycle state |
| `assigned_sales_rep_id` | `UUID` | `NOT NULL`, `FK -> users(id) ON DELETE RESTRICT` | Internal sales rep authoring deal |
| `price_list_id` | `UUID` | `NOT NULL`, `FK -> price_lists(id) ON DELETE RESTRICT` | Price schedule driving item costs |
| `gross_total` | `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0.00` | Sum of line items before any discounts |
| `total_discount_amount` | `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0.00` | Absolute monetary value of all applied discounts |
| `net_subtotal` | `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0.00` | Post-discount line total amount |
| `total_tax_amount` | `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0.00` | Calculated jurisdiction sales tax |
| `grand_total` | `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0.00` | Final payable total (`net_subtotal + tax`) |
| `blended_margin_percentage` | `DECIMAL(5,2)` | `NOT NULL`, `DEFAULT 0.00` | Overall deal gross profit margin % |
| `worst_line_excess` | `DECIMAL(5,2)` | `NOT NULL`, `DEFAULT 0.00` | Maximum single line discount ceiling breach ($E_{max}$) |
| `weighted_margin_bleed` | `DECIMAL(6,2)` | `NOT NULL`, `DEFAULT 0.00` | Revenue-weighted discount bleed ($W_{bleed}$) |
| `blended_risk_score` | `DECIMAL(6,2)` | `NOT NULL`, `DEFAULT 0.00` | Blended score: `(0.6 * E_max) + (0.4 * W_bleed)` |
| `risk_tier` | `risk_tier_enum` | `NOT NULL`, `DEFAULT 'low_risk_auto'` | Computed approval routing slab |
| `margin_hard_stop_breached` | `BOOLEAN` | `NOT NULL`, `DEFAULT false` | Flag blocking submission if margin < 10% |
| `customer_counter_total` | `DECIMAL(12,2)` | `NULL` | Proposed total from customer negotiation |
| `customer_counter_discount` | `DECIMAL(5,2)` | `NULL` | Proposed counter discount % from customer |
| `expiration_date` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL` | Quote commercial validity deadline |
| `confirmed_at` | `TIMESTAMP WITH TIME ZONE` | `NULL` | Moment deal was finalized by buyer |
| `lock_version` | `INT` | `NOT NULL`, `DEFAULT 1` | Optimistic locking counter |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Deal creation timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Last modification timestamp |

#### 3.16 `quotation_lines`
Individual hardware, service, or recurring line items within a quotation.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Line item ID |
| `quotation_id` | `UUID` | `NOT NULL`, `FK -> quotations(id) ON DELETE CASCADE` | Parent quotation ID |
| `product_id` | `UUID` | `NOT NULL`, `FK -> products(id) ON DELETE RESTRICT` | Catalog product |
| `product_variant_id` | `UUID` | `NULL`, `FK -> product_variants(id) ON DELETE RESTRICT` | Specific product variant |
| `line_number` | `INT` | `NOT NULL` | Sequential line position (1, 2, 3) |
| `category` | `product_category_enum` | `NOT NULL` | Cached category for governance execution |
| `billing_cadence` | `billing_cadence_enum` | `NOT NULL` | Billing frequency |
| `quantity` | `INT` | `NOT NULL`, `CHECK (quantity > 0)` | Ordered quantity count |
| `unit_list_price` | `DECIMAL(12,2)` | `NOT NULL`, `CHECK (unit_list_price >= 0.00)` | Standard catalog unit price |
| `unit_cost_price` | `DECIMAL(12,2)` | `NOT NULL`, `CHECK (unit_cost_price >= 0.00)` | Internal unit cost (redacted from portal) |
| `applied_discount_percentage` | `DECIMAL(5,2)` | `NOT NULL`, `DEFAULT 0.00`, `CHECK (applied_discount_percentage BETWEEN 0.00 AND 100.00)` | Discount applied by rep |
| `effective_ceiling_limit` | `DECIMAL(5,2)` | `NOT NULL` | `min(Tier Ceiling, Category Ceiling)` |
| `line_excess_points` | `DECIMAL(5,2)` | `NOT NULL`, `DEFAULT 0.00` | `max(0, applied_discount - limit)` |
| `is_over_limit` | `BOOLEAN` | `NOT NULL`, `DEFAULT false` | True if discount > effective limit |
| `unit_net_price` | `DECIMAL(12,2)` | `NOT NULL` | Discounted unit sale price |
| `line_gross_amount` | `DECIMAL(12,2)` | `NOT NULL` | `quantity * unit_list_price` |
| `line_net_amount` | `DECIMAL(12,2)` | `NOT NULL` | `quantity * unit_net_price` |
| `line_cost_total` | `DECIMAL(12,2)` | `NOT NULL` | `quantity * unit_cost_price` |
| `line_margin_amount` | `DECIMAL(12,2)` | `NOT NULL` | `line_net_amount - line_cost_total` |
| `line_margin_percentage` | `DECIMAL(5,2)` | `NOT NULL` | `(line_margin_amount / line_net_amount) * 100` |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Modification timestamp |

#### 3.17 `negotiation_threads`
Bidirectional communication threads and counter-proposals at quote or line level.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Negotiation message/thread ID |
| `quotation_id` | `UUID` | `NOT NULL`, `FK -> quotations(id) ON DELETE CASCADE` | Parent quotation ID |
| `quotation_line_id` | `UUID` | `NULL`, `FK -> quotation_lines(id) ON DELETE SET NULL` | Line item (NULL if order-level counter) |
| `author_user_id` | `UUID` | `NOT NULL`, `FK -> users(id) ON DELETE RESTRICT` | Message sender (customer or rep) |
| `is_customer_message` | `BOOLEAN` | `NOT NULL` | True if authored by external client |
| `change_type` | `negotiation_change_type_enum` | `NOT NULL` | Type of request (discount, qty, general) |
| `proposed_value` | `DECIMAL(12,2)` | `NULL` | Proposed counter-value (discount % or qty) |
| `message_content` | `TEXT` | `NOT NULL` | Written commentary / business justification |
| `status` | `negotiation_status_enum` | `NOT NULL`, `DEFAULT 'submitted'` | Lifecycle state of change request |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Timestamp posted |
| `resolved_at` | `TIMESTAMP WITH TIME ZONE` | `NULL` | Timestamp rep accepted/rejected request |

#### 3.18 `quotation_approvals`
Tracks sequential manager and finance approval workflow stages.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Approval step ID |
| `quotation_id` | `UUID` | `NOT NULL`, `FK -> quotations(id) ON DELETE CASCADE` | Target quotation ID |
| `step_order` | `INT` | `NOT NULL` | Step position (1 = Manager, 2 = Finance) |
| `required_role` | `approval_step_role_enum` | `NOT NULL` | Authority required to sign off |
| `assigned_user_id` | `UUID` | `NULL`, `FK -> users(id) ON DELETE SET NULL` | Specific user designated to review |
| `status` | `approval_status_enum` | `NOT NULL`, `DEFAULT 'pending'` | Step approval status |
| `action_by_user_id` | `UUID` | `NULL`, `FK -> users(id) ON DELETE SET NULL` | Actual user who approved or rejected |
| `action_timestamp` | `TIMESTAMP WITH TIME ZONE` | `NULL` | Timestamp action occurred |
| `comments` | `TEXT` | `NULL` | Written justification or rejection reason |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |

#### 3.19 `approval_audit_logs`
Immutable compliance append-only log capturing quotation state snapshots during signoffs.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Audit log ID |
| `quotation_id` | `UUID` | `NOT NULL`, `FK -> quotations(id) ON DELETE CASCADE` | Associated quote ID |
| `actor_user_id` | `UUID` | `NOT NULL`, `FK -> users(id) ON DELETE RESTRICT` | Acting party ID |
| `action_taken` | `VARCHAR(64)` | `NOT NULL` | Action (`SUBMIT`, `MANAGER_APPROVE`, `FINANCE_REJECT`) |
| `blended_risk_score_at_action` | `DECIMAL(6,2)` | `NOT NULL` | Frozen risk score at moment of action |
| `payload_snapshot` | `JSONB` | `NOT NULL` | Full serialized quotation + lines JSON snapshot |
| `ip_address` | `VARCHAR(45)` | `NULL` | Origin IPv4 / IPv6 address |
| `user_agent` | `TEXT` | `NULL` | Client user agent string |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Immutable log creation timestamp |

---

### Module 6: Fulfillment & Logistics

#### 3.20 `warehouses`
Physical storage facilities and fulfillment distribution centers.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Warehouse ID |
| `organization_id` | `UUID` | `NOT NULL`, `FK -> organizations(id) ON DELETE CASCADE` | Tenant ID |
| `code` | `VARCHAR(32)` | `NOT NULL` | Facility code (e.g. `WH-MAIN`, `WH-EAST`) |
| `name` | `VARCHAR(255)` | `NOT NULL` | Warehouse descriptive name |
| `shipping_base_fee` | `DECIMAL(10,2)` | `NOT NULL`, `DEFAULT 25.00` | Flat dispatch charge per parcel shipment |
| `shipping_cost_multiplier`| `DECIMAL(5,2)` | `NOT NULL`, `DEFAULT 1.00` | Proximity / carrier cost weight multiplier |
| `address` | `JSONB` | `NOT NULL` | Physical location JSON address |
| `is_active` | `BOOLEAN` | `NOT NULL`, `DEFAULT true` | Facility active toggle |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Modification timestamp |

#### 3.21 `warehouse_stock`
Current inventory levels per SKU per depot with Salesforce OCI-style 3-balance tracking and pessimistic row-locking support.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Inventory record ID |
| `warehouse_id` | `UUID` | `NOT NULL`, `FK -> warehouses(id) ON DELETE CASCADE` | Target warehouse ID |
| `product_id` | `UUID` | `NOT NULL`, `FK -> products(id) ON DELETE RESTRICT` | Target product ID |
| `product_variant_id` | `UUID` | `NULL`, `FK -> product_variants(id) ON DELETE RESTRICT` | Specific variant ID |
| `on_hand_quantity` | `INT` | `NOT NULL`, `DEFAULT 0`, `CHECK (on_hand_quantity >= 0)` | Physical units present in warehouse |
| `soft_reserved_quantity` | `INT` | `NOT NULL`, `DEFAULT 0`, `CHECK (soft_reserved_quantity >= 0)` | Committed to confirmed orders awaiting parcel split |
| `hard_allocated_quantity` | `INT` | `NOT NULL`, `DEFAULT 0`, `CHECK (hard_allocated_quantity >= 0)` | Committed to active pickpack dispatch parcels |
| `available_to_fulfill` | `INT` | `GENERATED ALWAYS AS (on_hand_quantity - soft_reserved_quantity - hard_allocated_quantity) STORED` | Net available inventory (ATF) |
| `reorder_threshold` | `INT` | `NOT NULL`, `DEFAULT 10` | Low-stock notification trigger count |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Inventory balance update timestamp |

#### 3.22 `fulfillment_orders`
Fulfillment dispatch packages generated upon quote confirmation.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Fulfillment order ID |
| `organization_id` | `UUID` | `NOT NULL`, `FK -> organizations(id) ON DELETE CASCADE` | Tenant ID |
| `quotation_id` | `UUID` | `NOT NULL`, `FK -> quotations(id) ON DELETE RESTRICT` | Origin confirmed quotation |
| `fulfillment_number` | `VARCHAR(64)` | `NOT NULL` | Tracking reference (e.g. `FO-1042-A`) |
| `warehouse_id` | `UUID` | `NOT NULL`, `FK -> warehouses(id) ON DELETE RESTRICT` | Assigned warehouse depot |
| `status` | `warehouse_split_status_enum`| `NOT NULL`, `DEFAULT 'split_suggested'` | Fulfillment lifecycle stage |
| `is_manual_override` | `BOOLEAN` | `NOT NULL`, `DEFAULT false` | True if operator altered algorithm split |
| `estimated_shipping_cost`| `DECIMAL(10,2)` | `NOT NULL`, `DEFAULT 0.00` | Calculated freight charge for this shipment |
| `shipped_at` | `TIMESTAMP WITH TIME ZONE` | `NULL` | Carrier dispatch timestamp |
| `delivered_at` | `TIMESTAMP WITH TIME ZONE` | `NULL` | Final proof-of-delivery timestamp |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Modification timestamp |

#### 3.23 `fulfillment_items`
Individual SKU quantities allocated to a specific warehouse dispatch parcel.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Item shipment record ID |
| `fulfillment_order_id` | `UUID` | `NOT NULL`, `FK -> fulfillment_orders(id) ON DELETE CASCADE` | Parent fulfillment parcel ID |
| `quotation_line_id` | `UUID` | `NOT NULL`, `FK -> quotation_lines(id) ON DELETE RESTRICT` | Source quotation line |
| `product_id` | `UUID` | `NOT NULL`, `FK -> products(id) ON DELETE RESTRICT` | Product being fulfilled |
| `product_variant_id` | `UUID` | `NULL`, `FK -> product_variants(id) ON DELETE RESTRICT` | Product variant |
| `quantity_allocated` | `INT` | `NOT NULL`, `CHECK (quantity_allocated > 0)` | Quantity fulfilled from this warehouse |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |

#### 3.24 `backorders`
Tracks unfulfilled demand when total network stock is insufficient.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Backorder record ID |
| `organization_id` | `UUID` | `NOT NULL`, `FK -> organizations(id) ON DELETE CASCADE` | Tenant ID |
| `quotation_id` | `UUID` | `NOT NULL`, `FK -> quotations(id) ON DELETE RESTRICT` | Parent quotation ID |
| `quotation_line_id` | `UUID` | `NOT NULL`, `FK -> quotation_lines(id) ON DELETE RESTRICT` | Source line requiring stock |
| `product_id` | `UUID` | `NOT NULL`, `FK -> products(id) ON DELETE RESTRICT` | Backordered product |
| `product_variant_id` | `UUID` | `NULL`, `FK -> product_variants(id) ON DELETE RESTRICT` | Backordered variant |
| `backorder_quantity` | `INT` | `NOT NULL`, `CHECK (backorder_quantity > 0)` | Quantity awaiting replenishment |
| `status` | `backorder_status_enum` | `NOT NULL`, `DEFAULT 'open'` | Backorder lifecycle state |
| `target_warehouse_id` | `UUID` | `NULL`, `FK -> warehouses(id) ON DELETE SET NULL` | Warehouse designated for incoming stock |
| `resolved_fulfillment_order_id` | `UUID` | `NULL`, `FK -> fulfillment_orders(id) ON DELETE SET NULL` | Resulting fulfillment order upon receipt |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Modification timestamp |

---

### Module 7: Subscriptions & Schedules

#### 3.25 `subscriptions`
Recurring contract agreement spawned from confirmed quotation subscription lines.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Subscription contract ID |
| `organization_id` | `UUID` | `NOT NULL`, `FK -> organizations(id) ON DELETE CASCADE` | Provider tenant ID |
| `customer_account_id` | `UUID` | `NOT NULL`, `FK -> customer_accounts(id) ON DELETE RESTRICT` | Buyer account ID |
| `origin_quotation_id` | `UUID` | `NOT NULL`, `FK -> quotations(id) ON DELETE RESTRICT` | Source confirmed quote |
| `subscription_code` | `VARCHAR(64)` | `NOT NULL` | Contract code (e.g. `SUB-4021`) |
| `status` | `subscription_status_enum` | `NOT NULL`, `DEFAULT 'active'` | Contract state |
| `billing_cadence` | `billing_cadence_enum` | `NOT NULL` | Frequency (`monthly`, `quarterly`, `annual`) |
| `start_date` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL` | Contract initiation date |
| `current_period_start`| `TIMESTAMP WITH TIME ZONE` | `NOT NULL` | Start of active billing cycle |
| `current_period_end` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL` | End of active billing cycle |
| `next_invoice_date` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL` | Date next scheduled cycle bill runs |
| `mrr_amount` | `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0.00` | Normalized Monthly Recurring Revenue |
| `arr_amount` | `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0.00` | Normalized Annual Recurring Revenue |
| `cancelled_at` | `TIMESTAMP WITH TIME ZONE` | `NULL` | Moment contract was terminated |
| `cancellation_reason` | `TEXT` | `NULL` | Stated cancellation rationale |
| `lock_version` | `INT` | `NOT NULL`, `DEFAULT 1` | Optimistic locking token |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Modification timestamp |

#### 3.26 `subscription_line_items`
Itemized recurring plans and seat counts on the contract.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Subscription line ID |
| `subscription_id` | `UUID` | `NOT NULL`, `FK -> subscriptions(id) ON DELETE CASCADE` | Parent contract ID |
| `product_id` | `UUID` | `NOT NULL`, `FK -> products(id) ON DELETE RESTRICT` | Recurring SaaS or retainer SKU |
| `quantity` | `INT` | `NOT NULL`, `CHECK (quantity > 0)` | Number of seats / licenses |
| `unit_price` | `DECIMAL(12,2)` | `NOT NULL`, `CHECK (unit_price >= 0.00)` | Recurring price per seat per period |
| `applied_discount_percentage` | `DECIMAL(5,2)` | `NOT NULL`, `DEFAULT 0.00` | Contractual recurring discount % |
| `period_amount` | `DECIMAL(12,2)` | `NOT NULL` | Net period billing amount (`qty * price * (1 - disc)`) |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Modification timestamp |

#### 3.27 `billing_schedules`
12-to-36 month forward billing projection matrix.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Schedule entry ID |
| `subscription_id` | `UUID` | `NOT NULL`, `FK -> subscriptions(id) ON DELETE CASCADE` | Parent contract ID |
| `cycle_number` | `INT` | `NOT NULL` | Sequential cycle number (1, 2, 3...) |
| `scheduled_date` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL` | Date invoice is generated |
| `base_charge_amount` | `DECIMAL(12,2)` | `NOT NULL` | Standard recurring charge for cycle |
| `proration_adjustment`| `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0.00` | Prior mid-cycle seat change delta |
| `expected_total` | `DECIMAL(12,2)` | `NOT NULL` | `base_charge_amount + proration_adjustment` |
| `generated_invoice_id`| `UUID` | `NULL`, `FK -> invoices(id) ON DELETE SET NULL` | Created invoice once triggered |
| `is_processed` | `BOOLEAN` | `NOT NULL`, `DEFAULT false` | True once automated runner processes cycle |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |

#### 3.28 `subscription_events`
Audit trail recording mid-cycle quantity changes, daily proration calculations, and cancellations.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Event log ID |
| `subscription_id` | `UUID` | `NOT NULL`, `FK -> subscriptions(id) ON DELETE CASCADE` | Target contract ID |
| `actor_user_id` | `UUID` | `NOT NULL`, `FK -> users(id) ON DELETE RESTRICT` | User who made adjustment |
| `event_type` | `subscription_event_type_enum` | `NOT NULL` | Action classification |
| `days_remaining_in_cycle` | `INT` | `NULL` | Daily proration numerator ($d_{remaining}$) |
| `total_days_in_cycle` | `INT` | `NULL` | Daily proration denominator ($d_{total}$) |
| `prior_quantity` | `INT` | `NULL` | Quantity before change |
| `new_quantity` | `INT` | `NULL` | Quantity after change |
| `calculated_proration_charge` | `DECIMAL(12,2)` | `NULL` | Calculated $\Delta Charge$ |
| `generated_invoice_id` | `UUID` | `NULL`, `FK -> invoices(id) ON DELETE SET NULL` | Immediate proration invoice or credit note |
| `notes` | `TEXT` | `NULL` | Operational remarks |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Event timestamp |

---

### Module 8: Billing & Ledger

#### 3.29 `invoices`
Unified financial ledger holding standard one-time invoices, recurring cycles, proration invoices, and negative credit notes.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Invoice ledger ID |
| `organization_id` | `UUID` | `NOT NULL`, `FK -> organizations(id) ON DELETE CASCADE` | Provider tenant ID |
| `customer_account_id` | `UUID` | `NOT NULL`, `FK -> customer_accounts(id) ON DELETE RESTRICT` | Buyer account |
| `origin_quotation_id` | `UUID` | `NULL`, `FK -> quotations(id) ON DELETE SET NULL` | Origin quote (if one-time order) |
| `origin_subscription_id` | `UUID` | `NULL`, `FK -> subscriptions(id) ON DELETE SET NULL` | Origin contract (if recurring plan) |
| `invoice_number` | `VARCHAR(64)` | `NOT NULL` | Sequential ledger code (e.g. `INV-9011`, `CR-3004`) |
| `document_type` | `document_type_enum` | `NOT NULL` | Classification (`standard_invoice`, `credit_note`, etc.) |
| `status` | `invoice_status_enum` | `NOT NULL`, `DEFAULT 'posted'` | Settlement status |
| `issue_date` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL` | Document posting date |
| `due_date` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL` | Settlement due deadline |
| `gross_subtotal` | `DECIMAL(12,2)` | `NOT NULL` | Gross undiscounted amount |
| `discount_amount` | `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0.00` | Deductions applied |
| `tax_amount` | `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0.00` | Jurisdiction tax liability |
| `total_amount` | `DECIMAL(12,2)` | `NOT NULL` | Net document total (negative for credit notes) |
| `amount_paid` | `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0.00` | Total settled receipts to date |
| `amount_credited` | `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0.00` | Sum of credit note offsets applied |
| `balance_due` | `DECIMAL(12,2)` | `NOT NULL` | Net remaining balance due (`total - paid - credited`) |
| `payment_terms_notes`| `VARCHAR(255)` | `NULL` | Commercial terms string (e.g., "Net 30 Wire") |
| `lock_version` | `INT` | `NOT NULL`, `DEFAULT 1` | Optimistic locking counter |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Ledger posting timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Last updated timestamp |

#### 3.30 `invoice_lines`
Itemized product, service, tax, or proration components on the ledger document.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Line record ID |
| `invoice_id` | `UUID` | `NOT NULL`, `FK -> invoices(id) ON DELETE CASCADE` | Parent invoice ID |
| `product_id` | `UUID` | `NULL`, `FK -> products(id) ON DELETE SET NULL` | Invoiced product (or NULL for adjustments) |
| `line_description` | `VARCHAR(255)` | `NOT NULL` | Clear line text descriptor |
| `category` | `product_category_enum` | `NOT NULL` | Classification |
| `billing_cadence` | `billing_cadence_enum` | `NOT NULL` | Cadence descriptor |
| `quantity` | `INT` | `NOT NULL`, `DEFAULT 1` | Unit count |
| `unit_price` | `DECIMAL(12,2)` | `NOT NULL` | Unit rate charged |
| `discount_amount` | `DECIMAL(12,2)` | `NOT NULL`, `DEFAULT 0.00` | Line discount reduction |
| `net_amount` | `DECIMAL(12,2)` | `NOT NULL` | Subtotal after discount |
| `tax_rate_percentage` | `DECIMAL(5,2)` | `NOT NULL`, `DEFAULT 0.00` | Tax percentage (e.g. 8.25%) |
| `line_total_with_tax` | `DECIMAL(12,2)` | `NOT NULL` | Total line receivable liability |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Creation timestamp |

#### 3.31 `payments`
Cash, Wire, Card, and ACH settlement transactions.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Payment transaction ID |
| `organization_id` | `UUID` | `NOT NULL`, `FK -> organizations(id) ON DELETE CASCADE` | Provider tenant ID |
| `customer_account_id` | `UUID` | `NOT NULL`, `FK -> customer_accounts(id) ON DELETE RESTRICT` | Buyer account |
| `invoice_id` | `UUID` | `NOT NULL`, `FK -> invoices(id) ON DELETE RESTRICT` | Invoice being paid |
| `payment_number` | `VARCHAR(64)` | `NOT NULL` | Receipt code (e.g. `PMT-5012`) |
| `amount` | `DECIMAL(12,2)` | `NOT NULL`, `CHECK (amount > 0.00)` | Paid cash value |
| `payment_method` | `payment_method_enum` | `NOT NULL` | Transaction method |
| `payment_status` | `payment_status_enum` | `NOT NULL`, `DEFAULT 'succeeded'` | Gateway / settlement status |
| `transaction_reference`| `VARCHAR(255)` | `NOT NULL` | Bank reference or Stripe Charge ID |
| `payment_date` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL` | Date receipt received |
| `recorded_by_user_id` | `UUID` | `NOT NULL`, `FK -> users(id) ON DELETE RESTRICT` | Operator who booked payment |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp |

#### 3.32 `credit_allocations`
Ledger junction offsetting outstanding invoice balances against available credit notes (incorporating Salesforce Billing debit/credit allocation rules to prevent unearned credit release).

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Allocation record ID |
| `credit_note_invoice_id` | `UUID` | `NOT NULL`, `FK -> invoices(id) ON DELETE RESTRICT` | Source credit document (`document_type = 'credit_note'`) |
| `target_invoice_id` | `UUID` | `NOT NULL`, `FK -> invoices(id) ON DELETE RESTRICT` | Target receivable invoice receiving credit |
| `allocated_amount` | `DECIMAL(12,2)` | `NOT NULL`, `CHECK (allocated_amount > 0.00)` | Credit applied to balance |
| `is_origin_debt_offset` | `BOOLEAN` | `NOT NULL`, `DEFAULT false` | True if this allocation directly offsets unpaid parent order/subscription invoice |
| `allocated_by_user_id` | `UUID` | `NOT NULL`, `FK -> users(id) ON DELETE RESTRICT` | Finance operator executing allocation |
| `allocated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Execution timestamp |

---

### Module 9: Deal Health & Diagnostics

#### 3.33 `deal_health_alerts`
Algorithmic detection anomalies (stalled deals, delivery slippage, margin bleed).

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Alert ID |
| `organization_id` | `UUID` | `NOT NULL`, `FK -> organizations(id) ON DELETE CASCADE` | Tenant ID |
| `anomaly_type` | `anomaly_type_enum` | `NOT NULL` | Category (`stalled_deal`, `discount_anomaly`, etc.) |
| `severity` | `alert_severity_enum` | `NOT NULL`, `DEFAULT 'warning'` | Alert severity tier |
| `quotation_id` | `UUID` | `NULL`, `FK -> quotations(id) ON DELETE CASCADE` | Target quotation (if quote anomaly) |
| `fulfillment_order_id` | `UUID` | `NULL`, `FK -> fulfillment_orders(id) ON DELETE CASCADE` | Target order (if logistics slippage) |
| `title` | `VARCHAR(255)` | `NOT NULL` | Summary headline |
| `description` | `TEXT` | `NOT NULL` | Detailed diagnostic context |
| `diagnostic_payload` | `JSONB` | `NOT NULL`, `DEFAULT '{}'` | Raw metrics ($\Delta pt, \mu, \sigma$, days inactive) |
| `resolution_status` | `alert_resolution_status_enum` | `NOT NULL`, `DEFAULT 'active'` | Remediation state |
| `resolved_by_user_id` | `UUID` | `NULL`, `FK -> users(id) ON DELETE SET NULL` | Manager who dismissed or escalated |
| `resolved_at` | `TIMESTAMP WITH TIME ZONE` | `NULL` | Resolution timestamp |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Alert generation timestamp |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Last updated timestamp |

#### 3.34 `rep_discount_baselines`
Moving statistical discount profile ($\mu, \sigma$) per sales rep paired with Einstein Discovery-style peer cohort baselines and hierarchical cold-start fallbacks.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Baseline profile ID |
| `organization_id` | `UUID` | `NOT NULL`, `FK -> organizations(id) ON DELETE CASCADE` | Tenant ID |
| `sales_rep_id` | `UUID` | `NOT NULL`, `FK -> users(id) ON DELETE CASCADE` | Associated sales rep |
| `rolling_window_days` | `INT` | `NOT NULL`, `DEFAULT 90` | Evaluation historical horizon (e.g. 90 days) |
| `completed_deal_count` | `INT` | `NOT NULL`, `DEFAULT 0` | Sample size $N$ of confirmed deals |
| `mean_discount_percentage` | `DECIMAL(5,2)` | `NOT NULL`, `DEFAULT 0.00` | Historical average discount $\mu_{rep}$ |
| `std_dev_percentage` | `DECIMAL(5,2)` | `NOT NULL`, `DEFAULT 0.00` | Standard deviation $\sigma_{rep}$ |
| `peer_cohort_type` | `VARCHAR(32)` | `NOT NULL`, `DEFAULT 'user_role'` | Benchmark cohort grouping (`user_role`, `territory`, `organization`) |
| `peer_cohort_id` | `UUID` | `NULL` | Cohort identifier (e.g., enterprise AE team ID) |
| `cohort_mean_discount_percentage` | `DECIMAL(5,2)` | `NOT NULL`, `DEFAULT 8.00` | Peer cohort average discount $\mu_{cohort}$ |
| `cohort_std_dev_percentage` | `DECIMAL(5,2)` | `NOT NULL`, `DEFAULT 2.50` | Peer cohort standard deviation $\sigma_{cohort}$ |
| `hierarchical_fallback_level` | `VARCHAR(32)` | `NOT NULL`, `DEFAULT 'cohort'` | Active baseline level (`individual`, `cohort`, `org`) based on $N \ge 20$ floor |
| `effective_anomaly_threshold` | `DECIMAL(5,2)` | `NOT NULL`, `DEFAULT 11.75` | Final trigger limit: evaluated against cohort $\mu + 1.5\sigma$ when $N < 20$ |
| `last_recalculated_at`| `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Batch calculation timestamp |

---

## 4. State Machine Definitions

```
                             =========================
                             QUOTATION LIFECYCLE GRAPH
                             =========================

           +------------------+
           |      Draft       |<-----------------------------------------+
           +------------------+                                          |
                     |                                                   |
        (Submit: Risk Check)                                             |
                     |                                                   |
       +-------------+-------------+                                     |
       |                           |                                     |
 [Low Risk / Autonomy]      [Medium / High Risk]                         |
       |                           |                                     |
       v                           v                                     |
+--------------+        +---------------------+                          |
|   Approved   |        |  Pending Approval   |                          |
+--------------+        +---------------------+                          |
       |                           |                                     |
       |             (Manager / Finance Rejection)                       |
       |                           |                                     |
       |                           v                                     |
       |                 +-------------------+                           |
       |                 |     Rejected      |                           |
       |                 +-------------------+                           |
       |                                                                 |
 (Send to Customer)                                                      |
       |                                                                 |
       v                                                                 |
+---------------------+   (Customer Counter)    +--------------------+   |
|   Sent / Viewed     |------------------------>| Under Negotiation  |   |
+---------------------+                         +--------------------+   |
       |                                                   |             |
       |                                        (Rep Accepts Counter     |
       |                                            Exceeds Ceilings)----+
(Customer Confirms)                                        |
       |                                                   |
       +-------------------+   +---------------------------+
                           |   | (Rep Accepts / Counter OK)
                           v   v
                   +---------------+
                   |   Confirmed   | ===> [Triggers Downstream Engines]
                   +---------------+        1. Fulfillment Split (Hardware)
                                            2. Subscription Spawn (Recurring)
                                            3. Invoice Posting (Unified Ledger)
```

### 4.1 Quotations State Transitions
- `draft` $\to$ `pending_approval`: Rep clicks submit; risk engine calculates score $> 0$ or margin $< 10\%$.
- `draft` $\to$ `approved`: Rep clicks submit; score $= 0$ (Auto-Approved).
- `pending_approval` $\to$ `approved`: Designated Manager / Finance signs off in `quotation_approvals`.
- `pending_approval` $\to$ `rejected`: Manager / Finance rejects quote with comment.
- `approved` $\to$ `under_negotiation`: Sent to customer; customer submits counter-proposal or line comments.
- `under_negotiation` $\to$ `pending_approval`: Rep accepts customer counter, but new terms exceed ceiling limits.
- `under_negotiation` $\to$ `confirmed`: Customer confirms accepted quote.
- `approved` $\to$ `confirmed`: Customer confirms quote directly.
- `confirmed` $\to$ *Terminal Immutable State*.

### 4.2 Invoices Ledger State Transitions
```
[Draft] -> [Posted] -> [Partially Paid] -> [Paid]
               |               |
               v               v
           [Overdue]       [Overdue]
               |
               v (Credit Applied)
          [Credited]
```
- `draft` $\to$ `posted`: Invoice locked and issued to customer receivables.
- `posted` $\to$ `partially_paid`: Payment recorded where `amount_paid < total_amount`.
- `partially_paid` $\to$ `paid`: Subsequent payment recorded where `amount_paid + amount_credited >= total_amount`.
- `posted` / `partially_paid` $\to$ `overdue`: System date exceeds `due_date` with `balance_due > 0`.
- `posted` $\to$ `credited`: Credit note allocation covers 100% of balance due.

### 4.3 Subscriptions State Transitions
```
[Active] <====> [Paused]
   |
   +---> [Pending Proration] ---> [Active]
   |
   +---> [Past Due] ------------> [Cancelled]
   |
   +---> [Pending Cancellation] -> [Cancelled] (at period end)
   |
   +---> [Cancelled] (immediate refund credit note)
```

### 4.4 Fulfillment Orders State Transitions
```
[Pending Allocation] -> [Split Suggested] -> [Allocated] -> [Picking] -> [Dispatched] -> [Delivered]
                                                  |
                                                  +---> [Backorder Open] ---> [Consolidation Prompt]
```
