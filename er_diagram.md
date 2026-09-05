# DealFlow360 — Production Entity-Relationship Diagram (`er_diagram.md`)

This document provides the complete, syntax-valid Mermaid Entity-Relationship diagram (`erDiagram`) for all 34 relational entities across all 9 domain modules of the DealFlow360 platform.

---

## 1. Domain Architecture Overview

The system is partitioned into nine tightly-coupled yet logically distinct relational domains:
1. **Identity & Access Management (IAM):** Multi-tenant symmetric organizations, global human identities, memberships, and bilateral account edges.
2. **Product Catalog & Pricing Tiering:** Hardware, services, subscription plans, SKU variants, and customer-tier negotiated price lists.
3. **Upsell Engine & Mandatory Attachments:** Proactive co-purchase pairing and compulsory hardware kits with gross margin suppression filters.
4. **Governance & Blended Risk Approval Chains:** Safe-zone ceilings, slab escalation boundaries, and dynamic predicate rules.
5. **Quotations, Negotiations & Audit:** Core sales transaction header, line-level discount limits, interactive customer negotiation threads, sequential approval gates, and immutable audit logs.
6. **Multi-Warehouse Logistics & Backorders:** Multi-depot inventory tracking, automated split optimization dispatches, and backorder tracking.
7. **Subscription Contracts & Dynamic Schedules:** Recurring agreements, seat licensing, 12-month forward billing projections, and daily mid-cycle proration tracking.
8. **Unified Financial Ledger & Settlements:** Central accounting register for one-time invoices, cycle bills, proration deltas, credit notes, and payment allocations.
9. **Deal Health & Anomaly Diagnostics:** Stalled deal monitors, rep discount statistical variance baselines ($\mu + 1.5\sigma$), and logistics delivery slippage alerts.

---

## 2. Complete Mermaid Entity-Relationship Diagram

```mermaid
erDiagram

    %% =========================================================================
    %% DOMAIN 1: IDENTITY & TENANTS
    %% =========================================================================

    organizations ||--o{ organization_memberships : "has"
    users ||--o{ organization_memberships : "holds"
    organizations ||--o{ customer_accounts : "provides (as seller)"
    organizations ||--o{ customer_accounts : "buys (as buyer)"
    users ||--o{ customer_accounts : "assigned_rep"

    organizations {
        uuid id PK
        varchar legal_name
        varchar trading_name
        varchar tax_identifier
        varchar slug
        varchar organization_type
        varchar default_currency
        jsonb billing_address
        jsonb shipping_address
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    users {
        uuid id PK
        varchar email
        varchar password_hash
        varchar full_name
        varchar phone_number
        boolean is_active
        timestamptz last_login_at
        timestamptz created_at
        timestamptz updated_at
    }

    organization_memberships {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        varchar role
        varchar employee_identifier
        varchar status
        timestamptz created_at
        timestamptz updated_at
    }

    customer_accounts {
        uuid id PK
        uuid provider_organization_id FK
        uuid buyer_organization_id FK
        varchar account_number
        varchar pricing_tier
        int default_payment_terms_days
        decimal credit_limit
        uuid assigned_sales_rep_id FK
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    %% =========================================================================
    %% DOMAIN 2: CATALOG & PRICING
    %% =========================================================================

    organizations ||--o{ products : "owns"
    products ||--o{ product_variants : "has_variants"
    organizations ||--o{ price_lists : "defines"
    price_lists ||--o{ price_list_items : "contains"
    products ||--o{ price_list_items : "priced_in"
    product_variants ||--o{ price_list_items : "variant_priced_in"

    products {
        uuid id PK
        uuid organization_id FK
        varchar sku
        varchar name
        text description
        varchar category
        varchar billing_cadence
        decimal base_list_price
        decimal standard_unit_cost
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    product_variants {
        uuid id PK
        uuid product_id FK
        varchar variant_sku
        varchar variant_name
        decimal price_delta
        decimal cost_delta
        jsonb attributes
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    price_lists {
        uuid id PK
        uuid organization_id FK
        varchar name
        varchar tier
        varchar currency
        timestamptz effective_start
        timestamptz effective_end
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    price_list_items {
        uuid id PK
        uuid price_list_id FK
        uuid product_id FK
        uuid product_variant_id FK
        decimal custom_unit_price
        timestamptz created_at
        timestamptz updated_at
    }

    %% =========================================================================
    %% DOMAIN 3: UPSELL & ATTACHMENTS
    %% =========================================================================

    organizations ||--o{ upsell_rules : "configures"
    products ||--o{ upsell_rules : "trigger_for"
    products ||--o{ upsell_rules : "recommended_in"
    organizations ||--o{ product_attachments : "configures"
    products ||--o{ product_attachments : "parent_for"
    products ||--o{ product_attachments : "attached_as"

    upsell_rules {
        uuid id PK
        uuid organization_id FK
        uuid trigger_product_id FK
        uuid recommended_product_id FK
        int priority_rank
        decimal promotional_discount_percent
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    product_attachments {
        uuid id PK
        uuid organization_id FK
        uuid parent_product_id FK
        uuid attached_product_id FK
        boolean is_mandatory
        decimal quantity_ratio
        timestamptz created_at
    }

    %% =========================================================================
    %% DOMAIN 4: GOVERNANCE & POLICIES
    %% =========================================================================

    organizations ||--o{ discount_tier_ceilings : "defines"
    organizations ||--o{ category_ceilings : "defines"
    organizations ||--o{ approval_chains : "configures"
    approval_chains ||--o{ approval_rules : "governs"

    discount_tier_ceilings {
        uuid id PK
        uuid organization_id FK
        varchar tier
        decimal max_discount_percentage
        timestamptz created_at
        timestamptz updated_at
    }

    category_ceilings {
        uuid id PK
        uuid organization_id FK
        varchar category
        decimal max_discount_percentage
        timestamptz created_at
        timestamptz updated_at
    }

    approval_chains {
        uuid id PK
        uuid organization_id FK
        varchar risk_tier
        decimal min_risk_score
        decimal max_risk_score
        boolean requires_manager_approval
        boolean requires_finance_approval
        decimal minimum_upsell_margin_threshold
        decimal absolute_margin_hard_stop
        timestamptz created_at
        timestamptz updated_at
    }

    approval_rules {
        uuid id PK
        uuid approval_chain_id FK
        varchar rule_name
        jsonb predicate_condition
        varchar escalate_to_role
        boolean is_active
        timestamptz created_at
    }

    %% =========================================================================
    %% DOMAIN 5: QUOTATIONS, DEALS & NEGOTIATION
    %% =========================================================================

    organizations ||--o{ quotations : "originates"
    customer_accounts ||--o{ quotations : "quotes_for"
    users ||--o{ quotations : "rep_authors"
    price_lists ||--o{ quotations : "prices_via"
    quotations ||--o{ quotation_lines : "contains"
    products ||--o{ quotation_lines : "referenced_in"
    product_variants ||--o{ quotation_lines : "variant_in"
    quotations ||--o{ negotiation_threads : "discussed_in"
    quotation_lines ||--o{ negotiation_threads : "line_discussed_in"
    users ||--o{ negotiation_threads : "authors"
    quotations ||--o{ quotation_approvals : "requires"
    users ||--o{ quotation_approvals : "assigned_reviewer"
    users ||--o{ quotation_approvals : "actioned_by"
    quotations ||--o{ approval_audit_logs : "audits"
    users ||--o{ approval_audit_logs : "audited_actor"

    quotations {
        uuid id PK
        uuid organization_id FK
        uuid customer_account_id FK
        varchar quotation_number
        varchar stage
        uuid assigned_sales_rep_id FK
        uuid price_list_id FK
        decimal gross_total
        decimal total_discount_amount
        decimal net_subtotal
        decimal total_tax_amount
        decimal grand_total
        decimal blended_margin_percentage
        decimal worst_line_excess
        decimal weighted_margin_bleed
        decimal blended_risk_score
        varchar risk_tier
        boolean margin_hard_stop_breached
        decimal customer_counter_total
        decimal customer_counter_discount
        timestamptz expiration_date
        timestamptz confirmed_at
        int lock_version
        timestamptz created_at
        timestamptz updated_at
    }

    quotation_lines {
        uuid id PK
        uuid quotation_id FK
        uuid product_id FK
        uuid product_variant_id FK
        int line_number
        varchar category
        varchar billing_cadence
        int quantity
        decimal unit_list_price
        decimal unit_cost_price
        decimal applied_discount_percentage
        decimal effective_ceiling_limit
        decimal line_excess_points
        boolean is_over_limit
        decimal unit_net_price
        decimal line_gross_amount
        decimal line_net_amount
        decimal line_cost_total
        decimal line_margin_amount
        decimal line_margin_percentage
        timestamptz created_at
        timestamptz updated_at
    }

    negotiation_threads {
        uuid id PK
        uuid quotation_id FK
        uuid quotation_line_id FK
        uuid author_user_id FK
        boolean is_customer_message
        varchar change_type
        decimal proposed_value
        text message_content
        varchar status
        timestamptz created_at
        timestamptz resolved_at
    }

    quotation_approvals {
        uuid id PK
        uuid quotation_id FK
        int step_order
        varchar required_role
        uuid assigned_user_id FK
        varchar status
        uuid action_by_user_id FK
        timestamptz action_timestamp
        text comments
        timestamptz created_at
    }

    approval_audit_logs {
        uuid id PK
        uuid quotation_id FK
        uuid actor_user_id FK
        varchar action_taken
        decimal blended_risk_score_at_action
        jsonb payload_snapshot
        varchar ip_address
        text user_agent
        timestamptz created_at
    }

    %% =========================================================================
    %% DOMAIN 6: FULFILLMENT & LOGISTICS
    %% =========================================================================

    organizations ||--o{ warehouses : "operates"
    warehouses ||--o{ warehouse_stock : "stocks"
    products ||--o{ warehouse_stock : "stocked_product"
    product_variants ||--o{ warehouse_stock : "stocked_variant"
    organizations ||--o{ fulfillment_orders : "dispatches"
    quotations ||--o{ fulfillment_orders : "origin_quote"
    warehouses ||--o{ fulfillment_orders : "assigned_depot"
    fulfillment_orders ||--o{ fulfillment_items : "ships"
    quotation_lines ||--o{ fulfillment_items : "fulfills_line"
    products ||--o{ fulfillment_items : "shipped_product"
    product_variants ||--o{ fulfillment_items : "shipped_variant"
    organizations ||--o{ backorders : "tracks"
    quotations ||--o{ backorders : "backordered_for"
    quotation_lines ||--o{ backorders : "backordered_line"
    products ||--o{ backorders : "backordered_product"
    product_variants ||--o{ backorders : "backordered_variant"
    warehouses ||--o{ backorders : "incoming_target_depot"
    fulfillment_orders ||--o{ backorders : "resolved_by_order"

    warehouses {
        uuid id PK
        uuid organization_id FK
        varchar code
        varchar name
        decimal shipping_base_fee
        decimal shipping_cost_multiplier
        jsonb address
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    warehouse_stock {
        uuid id PK
        uuid warehouse_id FK
        uuid product_id FK
        uuid product_variant_id FK
        int in_stock_quantity
        int reserved_quantity
        int available_quantity
        int reorder_threshold
        timestamptz updated_at
    }

    fulfillment_orders {
        uuid id PK
        uuid organization_id FK
        uuid quotation_id FK
        varchar fulfillment_number
        uuid warehouse_id FK
        varchar status
        boolean is_manual_override
        decimal estimated_shipping_cost
        timestamptz shipped_at
        timestamptz delivered_at
        timestamptz created_at
        timestamptz updated_at
    }

    fulfillment_items {
        uuid id PK
        uuid fulfillment_order_id FK
        uuid quotation_line_id FK
        uuid product_id FK
        uuid product_variant_id FK
        int quantity_allocated
        timestamptz created_at
    }

    backorders {
        uuid id PK
        uuid organization_id FK
        uuid quotation_id FK
        uuid quotation_line_id FK
        uuid product_id FK
        uuid product_variant_id FK
        int backorder_quantity
        varchar status
        uuid target_warehouse_id FK
        uuid resolved_fulfillment_order_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    %% =========================================================================
    %% DOMAIN 7: SUBSCRIPTIONS & CONTRACTS
    %% =========================================================================

    organizations ||--o{ subscriptions : "manages"
    customer_accounts ||--o{ subscriptions : "contracted_with"
    quotations ||--o{ subscriptions : "spawned_from"
    subscriptions ||--o{ subscription_line_items : "itemizes"
    products ||--o{ subscription_line_items : "recurring_product"
    subscriptions ||--o{ billing_schedules : "projects"
    subscriptions ||--o{ subscription_events : "logged_lifecycle"
    users ||--o{ subscription_events : "adjusted_by"

    subscriptions {
        uuid id PK
        uuid organization_id FK
        uuid customer_account_id FK
        uuid origin_quotation_id FK
        varchar subscription_code
        varchar status
        varchar billing_cadence
        timestamptz start_date
        timestamptz current_period_start
        timestamptz current_period_end
        timestamptz next_invoice_date
        decimal mrr_amount
        decimal arr_amount
        timestamptz cancelled_at
        text cancellation_reason
        int lock_version
        timestamptz created_at
        timestamptz updated_at
    }

    subscription_line_items {
        uuid id PK
        uuid subscription_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
        decimal applied_discount_percentage
        decimal period_amount
        timestamptz created_at
        timestamptz updated_at
    }

    billing_schedules {
        uuid id PK
        uuid subscription_id FK
        int cycle_number
        timestamptz scheduled_date
        decimal base_charge_amount
        decimal proration_adjustment
        decimal expected_total
        uuid generated_invoice_id FK
        boolean is_processed
        timestamptz created_at
    }

    subscription_events {
        uuid id PK
        uuid subscription_id FK
        uuid actor_user_id FK
        varchar event_type
        int days_remaining_in_cycle
        int total_days_in_cycle
        int prior_quantity
        int new_quantity
        decimal calculated_proration_charge
        uuid generated_invoice_id FK
        text notes
        timestamptz created_at
    }

    %% =========================================================================
    %% DOMAIN 8: UNIFIED FINANCIAL LEDGER & PAYMENTS
    %% =========================================================================

    organizations ||--o{ invoices : "registers"
    customer_accounts ||--o{ invoices : "billed_to"
    quotations ||--o{ invoices : "origin_deal"
    subscriptions ||--o{ invoices : "origin_contract"
    invoices ||--o{ invoice_lines : "itemizes"
    products ||--o{ invoice_lines : "line_product"
    invoices ||--o{ billing_schedules : "fulfills_schedule"
    invoices ||--o{ subscription_events : "records_event"
    organizations ||--o{ payments : "records"
    customer_accounts ||--o{ payments : "paid_by"
    invoices ||--o{ payments : "settles"
    users ||--o{ payments : "recorded_by"
    invoices ||--o{ credit_allocations : "source_credit_note"
    invoices ||--o{ credit_allocations : "target_receivable"
    users ||--o{ credit_allocations : "authorized_by"

    invoices {
        uuid id PK
        uuid organization_id FK
        uuid customer_account_id FK
        uuid origin_quotation_id FK
        uuid origin_subscription_id FK
        varchar invoice_number
        varchar document_type
        varchar status
        timestamptz issue_date
        timestamptz due_date
        decimal gross_subtotal
        decimal discount_amount
        decimal tax_amount
        decimal total_amount
        decimal amount_paid
        decimal amount_credited
        decimal balance_due
        varchar payment_terms_notes
        int lock_version
        timestamptz created_at
        timestamptz updated_at
    }

    invoice_lines {
        uuid id PK
        uuid invoice_id FK
        uuid product_id FK
        varchar line_description
        varchar category
        varchar billing_cadence
        int quantity
        decimal unit_price
        decimal discount_amount
        decimal net_amount
        decimal tax_rate_percentage
        decimal line_total_with_tax
        timestamptz created_at
    }

    payments {
        uuid id PK
        uuid organization_id FK
        uuid customer_account_id FK
        uuid invoice_id FK
        varchar payment_number
        decimal amount
        varchar payment_method
        varchar payment_status
        varchar transaction_reference
        timestamptz payment_date
        uuid recorded_by_user_id FK
        timestamptz created_at
    }

    credit_allocations {
        uuid id PK
        uuid credit_note_invoice_id FK
        uuid target_invoice_id FK
        decimal allocated_amount
        uuid allocated_by_user_id FK
        timestamptz allocated_at
    }

    %% =========================================================================
    %% DOMAIN 9: DEAL HEALTH & ANOMALY DIAGNOSTICS
    %% =========================================================================

    organizations ||--o{ deal_health_alerts : "monitors"
    quotations ||--o{ deal_health_alerts : "flags_quote"
    fulfillment_orders ||--o{ deal_health_alerts : "flags_logistics"
    users ||--o{ deal_health_alerts : "remediated_by"
    organizations ||--o{ rep_discount_baselines : "evaluates"
    users ||--o{ rep_discount_baselines : "profiles_rep"

    deal_health_alerts {
        uuid id PK
        uuid organization_id FK
        varchar anomaly_type
        varchar severity
        uuid quotation_id FK
        uuid fulfillment_order_id FK
        varchar title
        text description
        jsonb diagnostic_payload
        varchar resolution_status
        uuid resolved_by_user_id FK
        timestamptz resolved_at
        timestamptz created_at
        timestamptz updated_at
    }

    rep_discount_baselines {
        uuid id PK
        uuid organization_id FK
        uuid sales_rep_id FK
        int rolling_window_days
        int completed_deal_count
        decimal mean_discount_percentage
        decimal std_dev_percentage
        decimal anomaly_threshold_percentage
        timestamptz last_recalculated_at
    }
```

---

## 3. Structural Cross-Domain Integrity Principles

1. **Symmetric Tenant Segregation:** `organizations` serves as the root tenant for all internal operational activities, but dual-links into `customer_accounts` to cleanly isolate external buyer orgs without account duplication.
2. **Unified Commercial Spine:** `quotations` serves as the single source of truth that spawns `fulfillment_orders` for physical inventory, `subscriptions` for recurring revenue, and `invoices` for upfront ledger posting.
3. **Double-Entry Ledger Invariance:** `credit_allocations` references `invoices` twice (`credit_note_invoice_id` and `target_invoice_id`), guaranteeing that negative credit notes directly offset positive accounts receivable balances without unlinked ledger entries.
