# DealFlow360 — B2B Sales Operations & CPQ-to-Cash Platform

DealFlow360 is an enterprise-grade, multi-tenant B2B commercial operations and Configure-Price-Quote (CPQ) to Cash platform. It orchestrates the full quote-to-cash lifecycle: multi-currency catalog and price lists, rule-based discount governance, automated multi-level approval workflows, bilateral customer negotiations, warehouse fulfillment with backorder splitting, subscription lifecycle management, invoice generation with credit allocations, and real-time deal health diagnostics.

---

## Table of Contents

- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
  - [High-Level System Architecture](#high-level-system-architecture)
  - [Repository Layout](#repository-layout)
  - [Data Model & Entity Relationships](#data-model--entity-relationships)
  - [Security & Access Control (RBAC + ABAC)](#security--access-control-rbac--abac)
  - [Commercial Lifecycle & State Machine](#commercial-lifecycle--state-machine)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Environment Configuration](#2-environment-configuration)
  - [3. Backend Installation & Database Setup](#3-backend-installation--database-setup)
  - [4. Frontend Installation & Startup](#4-frontend-installation--startup)
  - [5. Demo Credentials](#5-demo-credentials)
- [Environment Variables Reference](#environment-variables-reference)
- [Available Scripts](#available-scripts)
- [API Reference Summary](#api-reference-summary)
- [Testing Guide](#testing-guide)
- [Production Deployment](#production-deployment)
  - [Docker & Containerized Deployment](#docker--containerized-deployment)
  - [Production Environment Hardening](#production-environment-hardening)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Key Features

- **Multi-Tenant Organization Isolation**: Strict organization-scoped isolation supporting Provider, Customer, and Partner entities with bilateral relationship graphs and ABAC assignment models.
- **Dynamic Catalog & Pricing Engine**: Hierarchical product categories (Hardware, Services, Subscriptions), product variants with configurable JSON attributes, multi-currency price lists, upsell recommendations, and mandatory product attachments.
- **Discount Governance & Margin Guardrails**: Margin floor rules, discount tier ceilings (Bronze/Silver/Gold/Platinum), category ceilings, blended risk scoring, and automated multi-tier approval routing based on transaction values and discount thresholds.
- **B2B Quotation Builder & CPQ**: Real-time line math computation, multi-currency conversions with exchange rate tracking, upsell drawers, margin recalculation, and one-click quotation confirmation.
- **Interactive Customer Negotiation Portal**: Dedicated customer-facing portal allowing buyers to request line-level revisions, submit order-level counter-offers, track negotiation message threads, and accept agreements.
- **Multi-Warehouse Fulfillment & Backorder Engine**: Real-time stock reservation, automated warehouse split dispatching, and automated backorder generation when quantities exceed available stock.
- **Recurring Subscription Lifecycle**: Quotation-to-subscription spawning, billing schedule intervals (monthly, quarterly, annual), subscription line management, renewal event auditing, and MRR metrics.
- **Financial Ledger & Invoicing**: Automated invoice generation from confirmed quotes and subscriptions, multi-line tax calculations, payment status tracking, and credit note allocations.
- **Deal Health & Anomaly Diagnostics**: Statistical scanner detecting stalled deals, discount anomalies against rep cohort baselines, and fulfillment delivery slippage with automated nudge alerts and escalation pathways.
- **Reporting & Export Suite**: Interactive sales pipeline reporting, MRR summaries, margin distributions, and formatted multi-table client exports in both PDF (via jsPDF) and Excel XLSX (via SheetJS).

---

## Tech Stack

### Frontend
- **Framework**: React 19.2 (Vite 8.2 bundler)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Icons**: Lucide React
- **Routing**: React Router DOM v7
- **Document & Spreadsheet Generation**: jsPDF, jsPDF-AutoTable, SheetJS (`xlsx`)
- **Linter**: Oxlint

### Backend
- **Runtime**: Node.js (ES Modules, `node:crypto`, `node:fs`)
- **Server Framework**: Express 5.2
- **Database & ORM**: Sequelize 6.37 with SQLite 3 (local development) and MySQL 2 / PostgreSQL compatibility
- **Authentication & Security**: JSON Web Tokens (`jsonwebtoken`), Argon2 password hashing (`argon2`), Bcrypt.js, CORS
- **Documentation**: Swagger UI Express

---

## Architecture Overview

### High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                              BROWSER CLIENT                            │
│                                                                        │
│   ┌───────────────────────────┐      ┌─────────────────────────────┐   │
│   │   Provider Workspace UI   │      │   Customer Portal (/portal) │   │
│   │   (Sales, Ops, Admin)     │      │   (Negotiation, Counter)    │   │
│   └─────────────┬─────────────┘      └──────────────┬──────────────┘   │
└─────────────────┼───────────────────────────────────┼──────────────────┘
                  │                                   │
                  ▼                                   ▼
         Vite Dev Server (Port 5173) / Reverse Proxy (Nginx)
                  │                                   │
                  └─────────────────┬─────────────────┘
                                    │ /api/*
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EXPRESS APPLICATION (Port 5001)                 │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │  Middleware: Logger, CORS, JWT Auth, Org Context, RBAC/ABAC    │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                     Domain Route Handlers                      │   │
│   │  • /api/auth          • /api/catalog        • /api/quotations  │   │
│   │  • /api/approvals     • /api/negotiations   • /api/fulfillment │   │
│   │  • /api/subscriptions • /api/invoices       • /api/deal-health │   │
│   │  • /api/reports       • /api/governance     • /api/team        │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │          Domain Services & Calculation Engines                 │   │
│   │  • riskEngine.service.js (Line Math, Margin, Ceilings)         │   │
│   │  • approvalEngine.service.js (Approval Chains & Escalations)   │   │
│   │  • fulfillment.service.js (Stock Allocation & Backorders)      │   │
│   │  • ledger.service.js (Invoices, Credits, Ledger Entries)       │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                  Sequelize ORM (39 Models)                     │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
└───────────────────────────────────┼────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         PERSISTENCE TIER                               │
│        SQLite3 (database.sqlite)  /  MySQL / PostgreSQL                │
└────────────────────────────────────────────────────────────────────────┘
```

### Repository Layout

```
DealFlow360/
├── backend/
│   ├── index.js                      # HTTP server bootstrap entry point
│   ├── package.json                  # Backend scripts and dependencies
│   ├── .env.example                  # Environment template
│   ├── database.sqlite               # Local development SQLite store
│   ├── src/
│   │   ├── server.js                 # Express application wiring & middleware
│   │   ├── config/
│   │   │   └── db.js                 # Sequelize connection configuration
│   │   ├── controllers/              # Request handlers (Reports, Negotiation, DealHealth, etc.)
│   │   ├── middleware/               # Auth, role authorization, tenant scoping
│   │   ├── models/                   # 39 domain models & relational associations
│   │   ├── routes/                   # Express route definitions
│   │   ├── seeds/
│   │   │   └── seed.js               # Comprehensive idempotent master test seed fixture
│   │   └── services/                 # Risk calculation, governance, fulfillment services
│   └── tests/                        # Automated functional test suites per screen
├── frontend/
│   ├── index.html                    # Single-page application root HTML
│   ├── vite.config.js                # Vite configuration with Tailwind CSS & API proxy
│   ├── package.json                  # Frontend dependencies and build scripts
│   └── src/
│       ├── main.jsx                  # React DOM mount point
│       ├── App.jsx                   # Route registration and layout gating
│       ├── index.css                 # Tailwind CSS v4 directives and design tokens
│       ├── api/
│       │   └── client.js             # Base fetch client with auth token headers
│       ├── components/               # UI components (Button, Modal, Card, Table, Layout)
│       ├── context/
│       │   └── AuthContext.jsx       # Auth provider (JWT, user, active organization)
│       ├── pages/                    # Domain pages
│       │   ├── admin/                # Catalog, Governance, Warehouses, Exchange Rates, Team
│       │   ├── approvals/            # Approval lists and detail actions
│       │   ├── customer/             # Customer portal, messaging, profile
│       │   ├── features/             # Invoices, Subscriptions lists & details
│       │   ├── fulfillment/          # Fulfillment cockpit, warehouse split review
│       │   ├── quotations/           # Quotation list, CPQ interactive builder
│       │   ├── DashboardPage.jsx     # Executive KPI overview
│       │   ├── DealHealthDashboard.jsx # Risk anomalies & deal alert monitor
│       │   ├── LandingPage.jsx       # Public landing page
│       │   ├── LoginPage.jsx         # Sign-in page
│       │   └── ReportingDashboard.jsx# Analytics and export to PDF/Excel
│       ├── rbac/                     # Role gates and permissions configuration
│       └── utils/                    # Math, formatters, export helpers
└── Plan/                             # Architectural specifications and PRD documents
```

### Data Model & Entity Relationships

The relational architecture spans 39 domain models organized into 13 core subsystems:

```
Organizations (Provider / Customer)
  ├── OrganizationMemberships (Users + Roles: admin, sales_manager, sales_rep, finance_ops, customer_portal)
  ├── OrganizationRelationships ── RelationshipAssignments (ABAC Rep Mapping)
  └── CustomerAccounts (Gold, Silver, Bronze tiers, Credit Limits, Terms)
        │
        ├── PriceLists ── PriceListItems ── Products ── ProductVariants
        │                                       ├── UpsellRules
        │                                       └── ProductAttachments
        ├── Governance Rules
        │     ├── DiscountTierCeilings
        │     ├── CategoryCeilings
        │     └── ApprovalChains ── ApprovalRules
        │
        ├── Quotations ── QuotationLines
        │     ├── NegotiationThreads (Customer Counter-Offers & Inquiries)
        │     ├── QuotationApprovals ── ApprovalAuditLogs
        │     │
        │     ├── FulfillmentOrders ── FulfillmentItems
        │     │     ├── Warehouses ── WarehouseStocks
        │     │     └── Backorders (Stock shortfall management)
        │     │
        │     ├── Subscriptions ── SubscriptionLineItems
        │     │     ├── BillingSchedules
        │     │     └── SubscriptionEvents
        │     │
        │     ├── Invoices ── InvoiceLines
        │     │     ├── Payments
        │     │     └── CreditAllocations (Credit Notes to Invoices)
        │     │
        │     └── DealHealthAlerts (Stalled Deals, Margin Drops, Delivery Slippage)
        │
        └── RoleChangeAuditLogs (Immutable logs of administrative privilege modifications)
```

### Security & Access Control (RBAC + ABAC)

Access is strictly governed across two orthogonal dimensions:
1. **Role-Based Access Control (RBAC)**:
   - **`admin`**: Full organization configuration, catalog governance, warehouse parameters, team role promotion/demotion, and audit logs.
   - **`sales_manager`**: Organization-wide quotation review, multi-tier discount approval, deal health triage, and performance reports.
   - **`sales_rep`**: Creation of quotations for assigned customer accounts, interaction with customer inquiries, upsell management.
   - **`finance_ops`**: Fulfillment order release, backorder routing, subscription schedule lifecycle, and invoice reconciliation.
   - **`customer_portal`**: Restricted isolated access (`/portal`) scoped exclusively to the buyer's organization quotations and negotiation threads.
2. **Attribute-Based Access Control (ABAC)**:
   - Sales reps are restricted to `CustomerAccount` records matching their explicit `assigned_sales_rep_id` or explicit `RelationshipAssignment` mapping.

### Commercial Lifecycle & State Machine

```
[Draft Quote] 
      │
      ▼
(Line Discount > Floor / Tier Ceiling?)
   ├── No  ─► [Confirmed / Ready for Review]
   └── Yes ─► [Pending Approval]
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
    [Approved]              [Rejected]
        │                       │
        ▼                       ▼
 [Under Negotiation]        [Revising]
   (Customer Portal)
        │
        ▼
   [Confirmed]
        │
 ┌──────┴──────────────────────────┐
 │                                 │
 ▼                                 ▼
[Fulfillment Order Created]   [Subscription Spawned]
 (Stock Reserved / Backordered) (Billing Schedules Activated)
 │                                 │
 └────────────────┬────────────────┘
                  ▼
          [Invoice Generated]
                  │
                  ▼
       [Paid / Reconciliation]
```

---

## Prerequisites

Ensure the following runtimes are installed on your workstation:

- **Node.js**: `v20.0.0` or higher (`v22.x` recommended)
- **npm**: `v10.0.0` or higher
- **Git**: `2.30+`
- **Optional**: MySQL 8.0+ or PostgreSQL 15+ (if running with external database instead of local SQLite)

---

## Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/your-org/DealFlow360.git
cd DealFlow360
```

### 2. Environment Configuration

The repository includes pre-configured environment templates.

#### Configure Backend Environment:

```bash
cd backend
cp .env.example .env
```

Review and adjust `backend/.env`:

```env
PORT=5001
NODE_ENV=development
DB_DIALECT=sqlite
DB_STORAGE=./database.sqlite
JWT_SECRET=dev-secret-change-me
FRONTEND_URL=http://localhost:5173
```

### 3. Backend Installation & Database Setup

Navigate to the `backend` directory, install dependencies, and execute the deterministic master seed fixture:

```bash
cd backend
npm install
npm run seed
```

> **What `npm run seed` does**:
> - Rebuilds the database schema.
> - Seeds multi-tenant organizations (Acme Global as Provider, Apex Mfg and Northstar as Buyers).
> - Populates user credentials across all 5 roles.
> - Generates realistic product catalogs, variants, price lists, discount ceilings, warehouses, stock levels, quotations, fulfillment records, subscriptions, and invoices.

Start the backend server in development mode:

```bash
npm run dev
```

The backend API will start on: **`http://localhost:5001`**

### 4. Frontend Installation & Startup

Open a new terminal window, navigate to the `frontend` directory, install packages, and launch Vite:

```bash
cd frontend
npm install
npm run dev
```

The frontend application will be live at: **`http://localhost:5173`**

Vite is configured with a built-in reverse proxy forwarding `/api` calls directly to `http://localhost:5001`.

---

### 5. Demo Credentials

The seed fixture populates test accounts for every role:

| Role | Email | Password | Organization Context |
|------|-------|----------|----------------------|
| **System Admin** | `admin@acme.com` | `admin123` | Acme Global (Provider) |
| **Sales Manager** | `manager@acme.com` | `manager123` | Acme Global (Provider) |
| **Sales Representative** | `rep@acme.com` | `rep123` | Acme Global (Provider) |
| **Finance & Operations** | `finance@acme.com` | `finance123` | Acme Global (Provider) |
| **Customer Buyer Portal** | `portal@apex.com` | `portal123` | Apex Advanced Mfg (Buyer) |

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description | Required | Default / Example |
|----------|-------------|----------|-------------------|
| `PORT` | HTTP port for the Express API | Yes | `5001` |
| `NODE_ENV` | Application environment (`development`, `production`, `test`) | Yes | `development` |
| `DB_DIALECT` | Database engine (`sqlite`, `mysql`, `postgres`) | Yes | `sqlite` |
| `DB_STORAGE` | Filepath for SQLite persistence (when dialect is sqlite) | Conditional | `./database.sqlite` |
| `DATABASE_URL` | Connection URI for external MySQL/PostgreSQL | Conditional | `mysql://user:pass@host:3306/dealflow` |
| `JWT_SECRET` | Cryptographic secret key used to sign session tokens | Yes | `dev-secret-change-me` |
| `FRONTEND_URL` | Permitted CORS origin for browser clients | No | `http://localhost:5173` |
| `EXCHANGE_RATE_API_KEY` | Optional API key for live external currency feeds | No | `your_api_key_here` |

---

## Available Scripts

### Backend (`backend/`)

| Script | Command | Purpose |
|--------|---------|---------|
| Start Server | `npm start` | Runs production server (`node index.js`) |
| Dev Server | `npm run dev` | Runs development server with automatic file watching (`node --watch index.js`) |
| Seed Database | `npm run seed` | Synchronizes models and inserts complete seed dataset |

### Frontend (`frontend/`)

| Script | Command | Purpose |
|--------|---------|---------|
| Dev Server | `npm run dev` | Launches Vite dev server with Hot Module Replacement on port 5173 |
| Production Build | `npm run build` | Compiles optimized production bundle into `dist/` |
| Preview Build | `npm run preview`| Locally serves production build output for validation |
| Linter | `npm run lint` | Runs oxlint across frontend source files |

---

## API Reference Summary

All internal endpoints require authentication header:
`Authorization: Bearer <JWT_TOKEN>`
`x-organization-id: <ORGANIZATION_UUID>` (when working within multi-organization context)

### 1. Authentication & Workspace (`/api/auth`)
- `POST /api/auth/login` — Authenticates credentials; returns JWT and user membership profiles.
- `POST /api/auth/register` — Registers new user and organization.
- `GET /api/auth/me` — Returns current authenticated user and organization memberships.
- `POST /api/auth/switch-workspace` — Issues refreshed context for selected organization.

### 2. Catalog & Pricing (`/api/catalog`)
- `GET /api/catalog/products` — Retrieves paginated products, category filters, and attached variants.
- `POST /api/catalog/products` — Creates product with base price, cost, and stock rules.
- `GET /api/catalog/price-lists` — Lists multi-currency price schedules and customer tier mappings.

### 3. Quotations & CPQ (`/api/quotations`)
- `GET /api/quotations` — Scoped list of quotations (filtered by status, customer, date).
- `POST /api/quotations` — Initializes a new commercial quotation.
- `GET /api/quotations/:quotationId` — Complete quotation aggregate with lines, margin, and approvals.
- `POST /api/quotations/:quotationId/lines` — Adds SKU line, validates attachments, recalculates margin.
- `POST /api/quotations/:quotationId/confirm` — Transitions quote to confirmed; initiates downstream operations.

### 4. Approvals & Governance (`/api/approvals`, `/api/governance`)
- `GET /api/approvals` — Lists pending approval requests matching the caller's authority level.
- `POST /api/approvals/:id/action` — Executes `approved` or `rejected` with required audit remarks.
- `GET /api/governance/ceilings` — Returns organization discount tier ceilings and category limits.

### 5. Customer Portal Negotiations (`/api/negotiations`)
- `GET /api/negotiations/my-quotes` — Customer-scoped quotation list.
- `POST /api/negotiations/line-request` — Line-level revision request (e.g. requested discount %).
- `POST /api/negotiations/counter-offer` — Order-level counter offer (target total / target discount).
- `POST /api/negotiations/confirm` — One-click acceptance by customer.

### 6. Fulfillment & Logistics (`/api/fulfillment`, `/api/warehouses`)
- `GET /api/fulfillment` — Dispatched and pending fulfillment orders.
- `POST /api/fulfillment/split-order` — Splits lines across designated warehouses.
- `GET /api/warehouses` — Warehouse storage capacities and itemized stock levels.

### 7. Subscriptions & Invoicing (`/api/subscriptions`, `/api/invoices`)
- `GET /api/subscriptions` — Active recurring billing contracts and renewal schedules.
- `GET /api/invoices` — Invoices, payments, outstanding balances, and credit memos.
- `POST /api/invoices/:id/payments` — Records ledger payment against posted invoice.

### 8. Deal Health & Anomaly Scanner (`/api/deal-health`)
- `POST /api/deal-health/scan` — Runs algorithmic scanner for stalled deals, discount spikes, and slippage.
- `GET /api/deal-health/alerts` — Retrieves active deal health alerts.
- `POST /api/deal-health/send-nudge` — Dispatches notification nudge to sales representative.

### 9. Reports & Analytics (`/api/reports`)
- `GET /api/reports/kpi-summary` — Pipeline value, active MRR, blended margin, and fulfillment slippage.
- `GET /api/reports/pipeline-by-stage` — Deal distribution by status.
- `GET /api/reports/revenue-by-month` — 12-month revenue history.

---

## Testing Guide

The codebase provides dedicated automated test suites covering all operational screens and backend services in `backend/tests/`:

### Executing Screen Test Suites

Run individual test suites using Node.js:

```bash
cd backend

# Validate complete master seed fixture integrity
node tests/validate_seed.js

# Authentication & Multi-Tenancy (Screen 1)
node tests/run_auth_screen1_tests.js

# Quotation List & Builder (Screens 3 & 4)
node tests/run_quotation_screen3_tests.js
node tests/run_builder_screen4_tests.js

# Approvals & Governance (Screens 5 & 6)
node tests/run_approvals_screen5_tests.js
node tests/run_approval_detail_screen6_tests.js

# Customer Portal Negotiation (Screen 11)
node tests/run_customer_portal_screen11_tests.js

# Fulfillment & Warehouse Split (Screen 7)
node tests/run_fulfillment_screen7_tests.js

# Subscriptions & Invoices (Screens 9, 10, 12, 13)
node tests/run_subscriptions_screen9_tests.js
node tests/run_subscription_detail_screen10_tests.js
node tests/run_invoices_screen12_tests.js
node tests/run_invoice_detail_screen13_tests.js

# Deal Health Diagnostics & Reports (Screens 14 & 15)
node tests/run_deal_health_screen14_tests.js
node tests/run_reports_screen15_tests.js

# RBAC Team & Role Authority (Screen 19)
node tests/run_team_roles_screen19_tests.js
```

---

## Production Deployment

### Docker & Containerized Deployment

You can containerize and deploy DealFlow360 using Docker:

#### 1. Backend Dockerfile (`backend/Dockerfile`)

```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5001
CMD ["node", "index.js"]
```

#### 2. Frontend Production Dockerfile (`frontend/Dockerfile`)

```dockerfile
# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serving Stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 3. Docker Compose (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    restart: always
    environment:
      - PORT=5001
      - NODE_ENV=production
      - DB_DIALECT=sqlite
      - DB_STORAGE=/data/database.sqlite
      - JWT_SECRET=${JWT_SECRET}
      - FRONTEND_URL=https://dealflow360.yourdomain.com
    volumes:
      - db-data:/data
    ports:
      - "5001:5001"

  frontend:
    build: ./frontend
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  db-data:
```

### Production Environment Hardening

1. **Strong Secrets**: Generate a high-entropy `JWT_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
2. **Reverse Proxy & SSL/TLS**: Ensure Nginx, Caddy, or Cloudflare terminates TLS (HTTPS) and enforces HTTP Strict Transport Security (HSTS).
3. **Persistent Volume Protection**: Ensure database volumes (`/data/database.sqlite` or managed MySQL/PostgreSQL instances) have regular automated point-in-time snapshots.
4. **CORS Restrictions**: Explicitly configure `FRONTEND_URL` to restrict cross-origin requests to your authorized production domain.

---

## Troubleshooting

### 1. Database Locked / SQLITE_BUSY
- **Cause**: Concurrent write locks held in SQLite during heavy test runs or rapid seed resets.
- **Remedy**: Stop any background test processes or running backend instances. If `database.sqlite` becomes locked, restart the backend server or re-run `npm run seed`. For production enterprise deployments, transition `DB_DIALECT` to `mysql` or `postgres`.

### 2. Port Mismatch / Connection Refused
- **Symptom**: `Failed to fetch` in browser or `ECONNREFUSED` on port 5001.
- **Remedy**: 
  - Ensure backend is running (`node index.js` listening on port 5001).
  - Verify `vite.config.js` proxy targets `http://localhost:5001`.
  - Confirm `backend/.env` specifies `PORT=5001`.

### 3. File Downloads Falling Back to UUID Filenames
- **Cause**: Browser download race conditions where `URL.revokeObjectURL()` was triggered synchronously before the browser download manager consumed the Blob URL.
- **Remedy**: Fixed in `ReportingDashboard.jsx` using `downloadBlob` helper with `requestAnimationFrame` and deferred revocation (`setTimeout`), ensuring file downloads retain descriptive names such as `DealFlow360_Reports_all_2026-09-06.pdf` and `.xlsx`.

### 4. Missing Column / Schema Drift
- **Symptom**: `SQLITE_ERROR: no such column: Quotation...`
- **Remedy**: The local SQLite database schema was modified or is out of sync with recent model changes. Run `npm run seed` inside `backend/` to force-sync and repopulate all 39 models cleanly.

---

## Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/commercial-enhancement`).
3. Commit your changes with clear intent (`git commit -m 'feat: add automated multi-currency hedge limits'`).
4. Run test suites (`node backend/tests/validate_seed.js`).
5. Push to the branch (`git push origin feature/commercial-enhancement`).
6. Open a Pull Request.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
