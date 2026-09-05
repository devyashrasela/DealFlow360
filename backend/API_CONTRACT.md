# DealFlow360 — API Contract (Customer Portal, Deal Health, Reports)

## Authentication

All endpoints require `Authorization: Bearer <JWT>`.

JWT payload shape:
```json
{
  "id": "uuid",
  "role": "admin|sales_manager|sales_rep|finance_ops|customer_portal",
  "organization_id": "uuid",
  "customer_account_id": "uuid (portal only)"
}
```

---

## 1. Customer Portal Negotiation (`/api/negotiations`)

**Auth**: `customer_portal` role only. Scoped to `customer_account_id` from token.

### `GET /api/negotiations/my-quotes`

List all quotations for caller's customer account.

**Response** `200`: `Quotation[]` with nested `lines`.

---

### `POST /api/negotiations/line-request`

Submit line-level discount/qty/remark.

**Body**:
```json
{
  "quotation_id": "uuid (required)",
  "quotation_line_id": "uuid (optional — omit for order-level)",
  "change_type": "discount_request | quantity_change | general_inquiry",
  "proposed_value": 15.00,
  "message_content": "string (required)"
}
```

**Response** `201`: `NegotiationThread` record.

**Side effect**: Transitions quote to `under_negotiation` if not already.

---

### `POST /api/negotiations/counter-offer`

Submit order-level counter (target total or counter discount %).

**Body**:
```json
{
  "quotation_id": "uuid (required)",
  "target_total": 25000.00,
  "counter_discount_percentage": 26.5,
  "message_content": "optional"
}
```

At least one of `target_total` or `counter_discount_percentage` required.

**Response** `201`: `{ quotation, negotiation }`.

---

### `POST /api/negotiations/confirm`

One-click confirm. Locks lines, transitions to `confirmed`.

**Body**:
```json
{ "quotation_id": "uuid (required)" }
```

**Response** `200`: `{ message, quotation }`.

**Allowed from stages**: `under_negotiation`, `approved`.

---

## 2. Deal Health & Anomaly Detection (`/api/deal-health`)

**Auth**: `admin`, `sales_manager`, or `finance_ops`.

### `POST /api/deal-health/scan`

Run diagnostic scanner. Three checks:

| Check | Criteria |
|-------|----------|
| Stalled Deals | `stage IN (draft, pending_approval, under_negotiation)` AND `updated_at ≤ NOW() - 5 days` |
| Discount Anomalies | `line discount > effective_anomaly_threshold`. Fallback to cohort baseline when `completed_deal_count < 20` |
| Delivery Slippage | Open backorder exists AND fulfillment order not delivered/cancelled |

**Response** `200`:
```json
{
  "scanned_at": "ISO date",
  "alerts_created": 3,
  "alerts": [ DealHealthAlert... ]
}
```

---

### `GET /api/deal-health/alerts`

List active/acknowledged/escalated alerts for org.

**Response** `200`: `DealHealthAlert[]`.

---

### `POST /api/deal-health/send-nudge`

Notify rep about alert.

**Body**: `{ "alert_id": "uuid" }`

**Response** `200`: `{ message, alert }`. Sets `resolution_status` → `acknowledged`.

---

### `POST /api/deal-health/escalate-to-finance`

Escalate alert to finance.

**Body**: `{ "alert_id": "uuid" }`

**Response** `200`: `{ message, alert }`. Sets `resolution_status` → `escalated`.

---

## 3. Reports & Analytics (`/api/reports`)

**Auth**: `admin`, `sales_manager`, or `finance_ops`.

### `GET /api/reports/kpi-summary`

**Response** `200`:
```json
{
  "total_pipeline_value": 128560.00,
  "active_mrr": 8540.50,
  "average_margin_percentage": 35.00,
  "slippage_rate_percentage": 0.00,
  "total_fulfillment_orders": 0,
  "open_backorders": 0
}
```

---

### `GET /api/reports/pipeline-by-stage`

**Response** `200`:
```json
[
  { "stage": "draft", "count": 1, "total_value": 33990.00 },
  { "stage": "confirmed", "count": 1, "total_value": 32290.50 }
]
```

---

### `GET /api/reports/revenue-by-month`

Last 12 months of posted/paid invoices grouped by YYYY-MM.

**Response** `200`:
```json
[
  { "month": "2025-08", "revenue": 32290.50 }
]
```

---

## Seed Data Summary

| Entity | Count | Details |
|--------|-------|---------|
| Organizations | 2 | Acme Provider, Beta Buyer |
| Users | 4 | Admin, Sales Manager, Sales Rep, Customer Portal |
| Customer Account | 1 | Gold Tier, Net 30, ₹50,000 credit |
| Products | 6 | 2 Hardware, 2 Services, 2 Subscriptions |
| Product Variants | 3 | Server 16C/32C, Cloud Pro |
| Warehouses | 2 | Mumbai, Delhi with stock |
| Quotations | 4 | draft, pending_approval, under_negotiation, confirmed |
| Rep Baseline | 1 | 12 deals, threshold 11.75% |

Run seed: `npm run seed`
