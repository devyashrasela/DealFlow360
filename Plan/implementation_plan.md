# DealFlow360 — Frontend Architecture

> Complete architecture specification for a multi-tenant B2B sales operations platform.

---

## 1. Existing Codebase Audit

### Current State

| Aspect | Finding |
|---|---|
| **Framework** | React 19.2.8 |
| **Bundler** | Vite 8.2.2 |
| **Language** | JavaScript (JSX) — no TypeScript |
| **Routing** | None installed |
| **State Management** | None installed (only `useState`) |
| **CSS** | Tailwind CSS v4 (via `@tailwindcss/vite` plugin) |
| **UI Library** | None |
| **Linting** | oxlint |
| **Entry** | [main.jsx](file:///Users/devyashrasela/Data/Hackathon/odoo/DealFlow360/frontend/src/main.jsx) → [App.jsx](file:///Users/devyashrasela/Data/Hackathon/odoo/DealFlow360/frontend/src/App.jsx) |
| **Content** | Vite starter boilerplate — safe to replace entirely |

### Decisions

- **Keep**: React 19, Vite 8, JavaScript, oxlint.
- **Use**: Tailwind CSS v4 (`tailwindcss` + `@tailwindcss/vite`) — already installed and configured.
- **Add**: `react-router-dom` (routing).
- **Do not add**: styled-components, MUI, Redux, Zustand, Axios. React Context + `fetch` is sufficient for this architecture.
- **Replace**: All boilerplate content in `App.jsx`, `index.css`.

---

## 2. Folder Structure

```
frontend/
├── index.html
├── package.json
├── vite.config.js                        # Tailwind v4 plugin configured
├── public/
│   └── favicon.svg
│
└── src/
    ├── main.jsx                          # Entry point
    ├── App.jsx                           # Root: providers + router
    ├── index.css                         # @import "tailwindcss" + @theme tokens
    │
    ├── components/                       # REUSABLE UI PRIMITIVES (Tailwind utility classes)
    │   ├── Button.jsx
    │   ├── Input.jsx
    │   ├── Select.jsx
    │   ├── Checkbox.jsx
    │   ├── Switch.jsx
    │   ├── Modal.jsx
    │   ├── Drawer.jsx
    │   ├── Card.jsx
    │   ├── Badge.jsx
    │   ├── StatusBadge.jsx
    │   ├── Tabs.jsx
    │   ├── DataTable.jsx
    │   ├── Pagination.jsx
    │   ├── Tooltip.jsx
    │   ├── Breadcrumb.jsx
    │   ├── Avatar.jsx
    │   ├── Menu.jsx
    │   ├── Dropdown.jsx
    │   ├── Toast.jsx
    │   ├── EmptyState.jsx
    │   ├── LoadingState.jsx
    │   ├── ErrorState.jsx
    │   ├── ConfirmDialog.jsx
    │   ├── ProgressIndicator.jsx
    │   ├── Stepper.jsx
    │   ├── FormField.jsx
    │   └── index.js                      # Barrel export
    │
    ├── layouts/                          # PAGE LAYOUTS (Tailwind utility classes)
    │   ├── AuthLayout.jsx
    │   ├── ProviderLayout.jsx
    │   ├── Sidebar.jsx
    │   ├── Topbar.jsx
    │   ├── WorkspaceSwitcher.jsx
    │   ├── CustomerPortalLayout.jsx
    │   └── WorkspaceSelectorLayout.jsx
    │
    ├── auth/                             # AUTHENTICATION
    │   ├── AuthProvider.jsx              # Context: user, tokens, login/logout
    │   └── useAuth.js                    # Hook: authentication state
    │
    ├── theme/                            # THEME SYSTEM
    │   ├── ThemeProvider.jsx             # Context: light/dark mode
    │   └── useTheme.js                   # Hook: current theme state
    │
    ├── workspace/                        # WORKSPACE CONTEXT
    │   ├── WorkspaceProvider.jsx         # Context: membership, org, relationship
    │   ├── useWorkspace.js               # Hook: current workspace state
    │   ├── useCurrentOrganization.js     # Hook: current organization
    │   └── useCurrentRelationship.js     # Hook: current relationship
    │
    ├── permissions/                      # AUTHORIZATION
    │   ├── PermissionProvider.jsx         # Context: resolved permissions
    │   ├── usePermission.js              # Hook: hasPermission(key)
    │   ├── permissionConfig.js           # Centralized permission map
    │   ├── ProtectedRoute.jsx            # Guard: authenticated?
    │   ├── PermissionGuard.jsx           # Guard: has permission?
    │   ├── RoleGuard.jsx                 # Guard: has role?
    │   ├── WorkspaceGuard.jsx            # Guard: workspace resolved?
    │   ├── ProviderRoute.jsx             # Guard: provider workspace?
    │   ├── CustomerRoute.jsx             # Guard: customer workspace?
    │   └── AdminRoute.jsx                # Guard: admin role?
    │
    ├── services/                         # API LAYER (Centralized)
    │   ├── api.js                        # Base fetch client (headers, refresh, errors)
    │   ├── authApi.js
    │   ├── workspaceApi.js
    │   ├── quotationApi.js
    │   ├── productApi.js
    │   ├── approvalApi.js
    │   ├── fulfillmentApi.js
    │   ├── subscriptionApi.js
    │   ├── invoiceApi.js
    │   ├── negotiationApi.js
    │   ├── dashboardApi.js
    │   └── reportingApi.js
    │
    ├── features/                         # BUSINESS FEATURE MODULES
    │   ├── dashboard/
    │   │   ├── components/
    │   │   ├── hooks/
    │   │   ├── DashboardPage.jsx
    │   │   └── dashboard.routes.js
    │   ├── quotations/
    │   │   ├── components/
    │   │   │   ├── QuotationList.jsx
    │   │   │   ├── QuotationBuilder.jsx
    │   │   │   ├── QuoteLineRow.jsx
    │   │   │   ├── QuoteSummary.jsx
    │   │   │   └── UpsellPanel.jsx
    │   │   ├── hooks/
    │   │   ├── QuotationsPage.jsx
    │   │   ├── QuotationBuilderPage.jsx
    │   │   └── quotations.routes.js
    │   ├── approvals/
    │   │   ├── components/
    │   │   ├── hooks/
    │   │   ├── ApprovalsListPage.jsx
    │   │   ├── ApprovalDetailPage.jsx
    │   │   └── approvals.routes.js
    │   ├── fulfillment/
    │   │   ├── components/
    │   │   ├── FulfillmentListPage.jsx
    │   │   ├── FulfillmentDetailPage.jsx
    │   │   └── fulfillment.routes.js
    │   ├── subscriptions/
    │   │   ├── components/
    │   │   ├── SubscriptionsListPage.jsx
    │   │   ├── SubscriptionDetailPage.jsx
    │   │   └── subscriptions.routes.js
    │   ├── invoices/
    │   │   ├── components/
    │   │   ├── InvoicesListPage.jsx
    │   │   ├── InvoiceDetailPage.jsx
    │   │   └── invoices.routes.js
    │   ├── deal-health/
    │   │   ├── components/
    │   │   ├── DealHealthPage.jsx
    │   │   └── dealHealth.routes.js
    │   ├── negotiation/
    │   │   ├── components/
    │   │   ├── NegotiationPage.jsx
    │   │   └── negotiation.routes.js
    │   ├── admin/
    │   │   ├── components/
    │   │   ├── ProductsPage.jsx
    │   │   ├── PriceListsPage.jsx
    │   │   ├── DiscountRulesPage.jsx
    │   │   ├── ApprovalChainsPage.jsx
    │   │   ├── WarehousesPage.jsx
    │   │   ├── SubscriptionPlansPage.jsx
    │   │   ├── SettingsPage.jsx
    │   │   └── admin.routes.js
    │   ├── reports/
    │   │   ├── components/
    │   │   ├── ReportsPage.jsx
    │   │   └── reports.routes.js
    │   └── customer-portal/
    │       ├── components/
    │       │   ├── CustomerQuoteView.jsx
    │       │   ├── NegotiationForm.jsx
    │       │   └── CustomerDashboard.jsx
    │       ├── hooks/
    │       ├── CustomerDashboardPage.jsx
    │       ├── CustomerQuotePage.jsx
    │       ├── CustomerNegotiatePage.jsx
    │       ├── CustomerMessagesPage.jsx
    │       ├── CustomerProfilePage.jsx
    │       └── customerPortal.routes.js
    │
    ├── mock/                             # MOCK DATA FIXTURES
    │   └── index.js                      # Isolated mock data layer
    │
    ├── pages/                            # THIN PAGE SHELLS
    │   ├── LoginPage.jsx
    │   ├── SignupPage.jsx
    │   ├── InvitationPage.jsx
    │   ├── WorkspaceSelectorPage.jsx
    │   └── NotFoundPage.jsx
    │
    ├── router/                           # ROUTING
    │   └── AppRouter.jsx                 # All route definitions
    │
    └── utils/                            # SHARED UTILITIES
        ├── constants.js
        ├── formatters.js
        └── validators.js
```

---

## 3. Design Token System — Tailwind CSS v4

All five colors, no exceptions. Configured via Tailwind v4 `@theme` in `src/index.css`.

### `src/index.css` — Single Source of Truth

```css
@import "tailwindcss";

@theme {
  /* ─── CORE PALETTE (the ONLY five colors) ─── */
  --color-primary:   #724B66;
  --color-secondary: #2E3141;
  --color-surface:   #F3F2F2;
  --color-white:     #FFFFFF;
  --color-dark:      #111826;

  /* ─── FONTS ─── */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* ─── LAYOUT ─── */
  --spacing-sidebar:    240px;
  --spacing-sidebar-sm: 64px;
  --spacing-topbar:     56px;
}

/* ─── BASE LAYER ─── */
@layer base {
  body {
    @apply bg-white text-dark font-sans antialiased;
  }
}
```

### Generated Tailwind Utility Classes

With the `@theme` block above, Tailwind v4 auto-generates these utilities:

| Token | Background | Text | Border |
|---|---|---|---|
| `primary` | `bg-primary` | `text-primary` | `border-primary` |
| `secondary` | `bg-secondary` | `text-secondary` | `border-secondary` |
| `surface` | `bg-surface` | `text-surface` | `border-surface` |
| `white` | `bg-white` | `text-white` | `border-white` |
| `dark` | `bg-dark` | `text-dark` | `border-dark` |

### Usage Examples

```jsx
// Primary button
<button className="bg-primary text-white px-4 py-2 rounded-md hover:opacity-85">Submit</button>

// Secondary surface card
<div className="bg-surface border border-surface rounded-lg p-6">...</div>

// Dark sidebar
<aside className="bg-secondary text-white w-sidebar min-h-screen">...</aside>

// Status badge (no extra colors — icon + label + opacity)
<span className="inline-flex items-center gap-1.5 text-primary text-sm">
  <CheckIcon className="w-4 h-4" /> Approved
</span>
```

> [!CAUTION]
> No sixth color. No red, green, blue, yellow. Status is communicated via icons + labels + typography + opacity, never by introducing new hues.

---

## 4. Application Context Model

The frontend maintains a hierarchical context chain:

```
AuthProvider (user, tokens)
  └── WorkspaceProvider (membership, organization, relationship, role)
        └── PermissionProvider (resolved permissions)
              └── Router → Layouts → Pages
```

### Context Shape

```js
// AuthContext
{
  user: { id, name, email },
  accessToken: string,
  isAuthenticated: boolean,
  login, logout, refreshToken
}

// WorkspaceContext
{
  currentMembership: { id, organization_id, role, department_id, status },
  currentOrganization: { id, name, slug, type },
  currentRelationship: { id, provider_org_id, customer_org_id, status } | null,
  workspaceType: 'PROVIDER' | 'CUSTOMER_PORTAL',
  providerSlug: string,
  customerSlug: string | null,
  memberships: [...],           // all user memberships from backend
  setWorkspace(membershipId),
  setRelationship(relationshipId),
  clearWorkspace()
}

// PermissionContext
{
  role: string,
  permissions: Set<string>,
  hasPermission(key): boolean,
  hasAnyPermission(keys): boolean,
  hasAllPermissions(keys): boolean
}
```

---

## 5. Routing Architecture

### Route Map

```
/login                                          → LoginPage           (AuthLayout)
/signup                                         → SignupPage          (AuthLayout)
/invitations/:token                             → InvitationPage      (AuthLayout)
/workspaces                                     → WorkspaceSelectorPage (WorkspaceSelectorLayout)

/:providerSlug/dashboard                        → DashboardPage       (ProviderLayout)
/:providerSlug/quotations                       → QuotationsPage      (ProviderLayout)
/:providerSlug/quotations/:quoteNumber          → QuotationBuilderPage(ProviderLayout)
/:providerSlug/approvals                        → ApprovalsListPage   (ProviderLayout)
/:providerSlug/approvals/:quoteNumber           → ApprovalDetailPage  (ProviderLayout)
/:providerSlug/fulfillment                      → FulfillmentListPage (ProviderLayout)
/:providerSlug/fulfillment/:orderId             → FulfillmentDetailPage(ProviderLayout)
/:providerSlug/subscriptions                    → SubscriptionsListPage(ProviderLayout)
/:providerSlug/subscriptions/:subscriptionId    → SubscriptionDetailPage(ProviderLayout)
/:providerSlug/invoices                         → InvoicesListPage    (ProviderLayout)
/:providerSlug/invoices/:invoiceId              → InvoiceDetailPage   (ProviderLayout)
/:providerSlug/deal-health                      → DealHealthPage      (ProviderLayout)
/:providerSlug/reports                          → ReportsPage         (ProviderLayout)

/:providerSlug/admin/products                   → ProductsPage        (ProviderLayout)
/:providerSlug/admin/price-lists                → PriceListsPage      (ProviderLayout)
/:providerSlug/admin/discount-rules             → DiscountRulesPage   (ProviderLayout)
/:providerSlug/admin/approval-chains            → ApprovalChainsPage  (ProviderLayout)
/:providerSlug/admin/warehouses                 → WarehousesPage      (ProviderLayout)
/:providerSlug/admin/subscription-plans         → SubscriptionPlansPage(ProviderLayout)
/:providerSlug/admin/reports                    → AdminReportsPage    (ProviderLayout)

/:providerSlug/:customerSlug/dashboard          → CustomerDashboardPage (CustomerPortalLayout)
/:providerSlug/:customerSlug/quotes             → CustomerQuotesPage  (CustomerPortalLayout)
/:providerSlug/:customerSlug/quotes/:quoteNumber→ CustomerQuotePage   (CustomerPortalLayout)
/:providerSlug/:customerSlug/quotes/:quoteNumber/negotiate → CustomerNegotiatePage (CustomerPortalLayout)
/:providerSlug/:customerSlug/messages           → CustomerMessagesPage(CustomerPortalLayout)
/:providerSlug/:customerSlug/profile            → CustomerProfilePage (CustomerPortalLayout)

*                                               → NotFoundPage
```

### Guard Chain (conceptual)

```
<ProtectedRoute>           ← Must be authenticated
  <WorkspaceGuard>         ← Must have resolved workspace
    <ProviderRoute>        ← Must be provider workspace type
      <PermissionGuard     ← Must have specific permission
        requires="quotations.view">
        <QuotationsPage />
      </PermissionGuard>
    </ProviderRoute>
  </WorkspaceGuard>
</ProtectedRoute>
```

---

## 6. Authentication Architecture

### Flow

```
1. User lands on /login
2. POST /api/auth/login → { accessToken, refreshToken, user }
3. Store accessToken in memory (AuthContext), refreshToken in httpOnly cookie (set by backend)
4. GET /api/auth/me → user profile
5. GET /api/auth/workspaces → memberships[]
6. If 1 workspace → auto-navigate
7. If multiple → /workspaces selector
8. On 401 → attempt silent refresh via POST /api/auth/refresh
9. If refresh fails → redirect to /login
```

### Token Handling

- Access token: in-memory only (AuthContext state). Never `localStorage`.
- Refresh token: `httpOnly` cookie managed by backend.
- Every API call includes `Authorization: Bearer <accessToken>`.
- The centralized `api.js` fetch wrapper handles 401 → refresh → retry transparently.

### Error Handling Strategy

| HTTP Status | Frontend Behavior |
|---|---|
| **401** | Attempt token refresh. If fails, clear auth state, redirect `/login`. |
| **403** | Show `PermissionDeniedState` component. No redirect. |
| **404** | Show `NotFoundState` component. |
| **409** | Show conflict message with reload/retry option. |
| **422** | Display validation errors on form fields. |
| **500** | Show `ErrorState` with generic message. |
| **Network error** | Show offline/connection error with retry button. |

---

## 7. Workspace Selector

### Behavior

```
After authentication:

  GET /api/auth/workspaces → [
    { membershipId, org: { id, name, slug }, role, workspaceType, relationship? }
  ]

  if (memberships.length === 0) → "No workspaces available"
  if (memberships.length === 1) → auto-navigate to workspace
  if (memberships.length > 1)  → show WorkspaceSelectorPage
```

### Selector Card Structure

```
┌──────────────────────────────────────┐
│  ● ACME Corp                         │
│  Sales Representative                │
│  Provider Workspace                  │
│                       [Open →]       │
├──────────────────────────────────────┤
│  ● Example Ltd                       │
│  Customer User                       │
│  Customer Portal (via ACME Corp)     │
│                       [Open →]       │
└──────────────────────────────────────┘
```

---

## 8. Permission System

### Centralized Permission Configuration

File: `src/permissions/permissionConfig.js`

```js
export const PERMISSIONS = {
  // Products & Catalog
  'products.manage':        ['PROVIDER_ADMIN'],
  'pricing.manage':         ['PROVIDER_ADMIN'],
  'discountRules.manage':   ['PROVIDER_ADMIN'],
  'warehouses.manage':      ['PROVIDER_ADMIN'],
  'subscriptions.manage':   ['PROVIDER_ADMIN'],
  'approvalChains.manage':  ['PROVIDER_ADMIN'],
  'settings.manage':        ['PROVIDER_ADMIN'],

  // Quotations
  'quotations.create':      ['PROVIDER_ADMIN', 'SALES_MANAGER', 'SALES_REP'],
  'quotations.view':        ['PROVIDER_ADMIN', 'SALES_MANAGER', 'SALES_REP'],
  'quotations.edit':        ['PROVIDER_ADMIN', 'SALES_MANAGER', 'SALES_REP'],
  'quotations.approve':     ['PROVIDER_ADMIN', 'SALES_MANAGER'],
  'quotations.viewAll':     ['PROVIDER_ADMIN', 'SALES_MANAGER'],

  // Approvals
  'approvals.view':         ['PROVIDER_ADMIN', 'SALES_MANAGER'],
  'approvals.decide':       ['PROVIDER_ADMIN', 'SALES_MANAGER'],

  // Fulfillment
  'fulfillment.view':       ['PROVIDER_ADMIN', 'SALES_MANAGER', 'SALES_REP'],
  'fulfillment.manage':     ['PROVIDER_ADMIN', 'SALES_MANAGER'],

  // Subscriptions & Invoices
  'subscriptions.view':     ['PROVIDER_ADMIN', 'SALES_MANAGER', 'SALES_REP'],
  'invoices.view':          ['PROVIDER_ADMIN', 'SALES_MANAGER', 'SALES_REP'],
  'billing.manage':         ['PROVIDER_ADMIN'],

  // Deal Health
  'dealHealth.view':        ['PROVIDER_ADMIN', 'SALES_MANAGER', 'SALES_REP'],

  // Reports
  'reports.view':           ['PROVIDER_ADMIN', 'SALES_MANAGER'],
  'reports.viewAdmin':      ['PROVIDER_ADMIN'],

  // Upsell
  'upsell.use':             ['PROVIDER_ADMIN', 'SALES_MANAGER', 'SALES_REP'],

  // Customer Portal
  'quotes.view':            ['CUSTOMER_ADMIN', 'CUSTOMER_USER'],
  'quotes.negotiate':       ['CUSTOMER_ADMIN', 'CUSTOMER_USER'],
  'quotes.accept':          ['CUSTOMER_ADMIN'],

  // Negotiation
  'negotiation.view':       ['PROVIDER_ADMIN', 'SALES_MANAGER', 'SALES_REP'],
  'negotiation.respond':    ['PROVIDER_ADMIN', 'SALES_MANAGER', 'SALES_REP'],
};

> [!IMPORTANT]
> `permissionConfig.js` is **only** frontend UX metadata. Backend authorization remains authoritative.
> Do not assume role = complete access. A Sales Rep may only access assigned relationships/resources (RBAC + ABAC architecture).
```

### Usage Pattern

```jsx
// In navigation:
{hasPermission('quotations.view') && <NavItem to="quotations" />}

// In page:
<PermissionGuard requires="quotations.create">
  <Button>Create Quotation</Button>
</PermissionGuard>

// In hook:
const { hasPermission } = usePermission();
if (hasPermission('approvals.decide')) { ... }
```

---

## 9. Navigation (Permission-Driven)

### Provider Sidebar

```
Dashboard                     — always visible
Quotations                    — quotations.view
Approvals                     — approvals.view
Fulfillment                   — fulfillment.view
Subscriptions                 — subscriptions.view
Invoices                      — invoices.view
Deal Health                   — dealHealth.view
Reports                       — reports.view

── Admin ──────────────────
Products                      — products.manage
Price Lists                   — pricing.manage
Discount Rules                — discountRules.manage
Approval Chains               — approvalChains.manage
Warehouses                    — warehouses.manage
Subscription Plans            — subscriptions.manage
Settings                      — settings.manage
```

A Sales Rep sees: Dashboard, Quotations, Fulfillment, Subscriptions, Invoices, Deal Health.

A Sales Manager sees the same plus Approvals and Reports.

A Provider Admin sees everything including Admin section.

### Customer Portal Navigation

```
Dashboard                     — always visible
My Quotations                 — quotes.view
Messages                      — quotes.negotiate
Profile                       — quotes.view
```

Intentionally minimal. No admin section.

---

## 10. Layout Architecture

### ProviderLayout

```
┌─────────────────────────────────────────────────────┐
│ Topbar  [Workspace Switcher] [User Menu]            │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ Sidebar  │  Breadcrumb                              │
│          │  ────────────────────                    │
│ Nav      │                                          │
│ Items    │  Page Content                            │
│          │                                          │
│          │                                          │
│          │                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

- Sidebar: `var(--color-secondary)` background, `var(--color-white)` text.
- Topbar: `var(--color-white)` background, subtle `var(--border-default)` bottom border.
- Content area: `var(--color-surface)` background.
- Cards within content: `var(--color-white)` background.

### CustomerPortalLayout

```
┌─────────────────────────────────────────────────────┐
│ Navbar  [Provider Logo]  [Dashboard] [Quotes] [User]│
├─────────────────────────────────────────────────────┤
│                                                     │
│  Page Content                                       │
│                                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

- No sidebar. Horizontal top navigation only.
- Simpler, cleaner. Intentionally different from provider admin.
- Navbar: `var(--color-white)` background.
- Content: `var(--color-surface)` background.

### AuthLayout

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│              ┌─────────────────────┐                │
│              │ DealFlow360 Logo    │                │
│              │                     │                │
│              │ Login / Signup Form │                │
│              │                     │                │
│              └─────────────────────┘                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

- Background: `var(--color-surface)`.
- Card: `var(--color-white)` with `var(--shadow-lg)`.
- Accent: `var(--color-primary)` on primary button.

---

## 11. State Management

### Global State (React Context)

| Context | Scope | Stability |
|---|---|---|
| `AuthContext` | User identity, tokens | Stable after login |
| `WorkspaceContext` | Membership, org, relationship | Stable per session |
| `PermissionContext` | Resolved permissions | Derived from workspace |

### Feature State (Component-local or feature Context)

| Feature | State Location |
|---|---|
| Quotation Builder | Local state within `QuotationBuilder.jsx` or feature-level context. Backend handles discount/risk logic. |
| Negotiation | Local state within negotiation components |
| Dashboard data | `useEffect` + `useState` per dashboard component |
| Data tables | Local sort/filter/pagination state |
| Forms | Local `useState` per form |
| Modals | Local `useState` toggle |

> [!NOTE]
> No global store library. React Context for stable global data. Local state for everything else. This keeps the dependency surface minimal and follows the existing project's philosophy.

---

## 12. API Service Layer

### Base Client (`src/services/api.js`)

```js
// Responsibilities:
// 1. Base URL configuration
// 2. Attach Authorization header from AuthContext
// 3. Automatic token refresh on 401
// 4. Standardized error parsing
// 5. Request/response JSON handling
// 6. AbortController support for cancellation

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export async function apiFetch(path, options = {}) {
  // Attach auth header
  // Handle 401 → refresh → retry
  // Parse JSON response
  // Throw structured ApiError on failure
}
```

### Feature Services

Each service file wraps `apiFetch` for a specific domain:

```js
// quotationApi.js
export const listQuotations = (params) => apiFetch('/api/quotations', { params });
export const getQuotation = (id)       => apiFetch(`/api/quotations/${id}`);
export const createQuotation = (data)  => apiFetch('/api/quotations', { method: 'POST', body: data });
export const updateQuotation = (id, d) => apiFetch(`/api/quotations/${id}`, { method: 'PUT', body: d });
```

### Header Convention

Every API request must follow the actual contract implemented by the Express backend.

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

> [!WARNING]
> Do not blindly add custom headers like `X-Organization-ID`. The frontend must follow the precise API contract enforced by the existing backend. Inspect the backend routes/models before assuming a contract.

---

## 13. Component Design System

### Interaction States (all components)

Every interactive component must define these states using only the five approved colors:

| State | Visual Treatment |
|---|---|
| **default** | Base styling |
| **hover** | `opacity: 0.85` or subtle border/background shift within palette |
| **focus** | `outline: 2px solid var(--color-primary)` with `2px` offset |
| **active/pressed** | `opacity: 0.75` |
| **selected** | `var(--color-primary)` accent border or background |
| **disabled** | `opacity: 0.4`, `cursor: not-allowed` |
| **loading** | Content replaced with spinner/skeleton |

> [!CAUTION]
> No independent border color. Borders, focus rings, icons, backgrounds, text, buttons and status styling must ALL use the five approved colors. Shadows are allowed because they do not introduce new hues.

### Explicitly Supported Screen States

Every API-backed screen must explicitly support the following states using reusable components (`LoadingState`, `EmptyState`, `ErrorState`, `PermissionDeniedState`):

- Loading
- Success
- Empty
- Error
- 401 (Unauthorized)
- 403 (Forbidden)
- 404 (Not Found)
- 409 (Conflict)
- 422 (Unprocessable Entity)

### Status Communication (no color coding)

| Status | Visual |
|---|---|
| **Approved** | ✓ check icon + "Approved" label + `var(--color-primary)` accent |
| **Pending** | ◌ clock icon + "Pending" label + `var(--color-secondary)` accent |
| **Rejected** | ✕ x icon + "Rejected" label + `var(--color-dark)` accent |
| **Draft** | ◇ draft icon + "Draft" label + `var(--color-secondary)` at `0.6` opacity |
| **At Risk** | ⚠ warning icon + "At Risk" label + `var(--color-dark)` accent |

> [!IMPORTANT]
> Never rely only on color to communicate meaning. Always use icon + label.

---

## 14. Customer Portal Security Boundary

### Fields the Customer Portal NEVER receives or displays

```
unit_cost
cost_total
line_margin
margin_total
margin_percentage
internal_notes
internal_approval_comments
rejection_reasons
credit_risk_information
blended_risk_score
discount_governance_details
```

The backend provides a customer-safe DTO. The frontend does **not** hide fields from a full DTO — it simply never receives them.

### Customer Quote View shows ONLY

```
Product name
Description
Quantity
Selling price
Discount (customer-visible)
Subtotal
Tax
Grand total
Quote status
Customer notes
Line-level comments
```

---

## 15. Mock Data Strategy

Do not hardcode fake business data directly into production components.

If mock data is required during UI development before the API is ready, isolate it in a clearly marked `src/mock/` or `src/fixtures/` layer so it can later be seamlessly replaced by real API calls.

---

## 16. Responsive Strategy

| Breakpoint | Layout |
|---|---|
| **≥ 1024px** | Full sidebar + content (desktop) |
| **768–1023px** | Collapsible sidebar / overlay (tablet) |
| **< 768px** | Bottom navigation or hamburger menu, stacked cards, responsive tables (mobile) |

### Mobile Patterns

- DataTable → stacked card list on mobile.
- Sidebar → off-canvas drawer with hamburger toggle.
- Actions → bottom-fixed action bar.
- Quotation Builder → vertical stacked sections.
- Customer Portal → fully mobile-optimized, no desktop-only assumptions.

---

## 17. Dependency Summary

| Package | Purpose | Status |
|---|---|---|
| `react` | UI library | ✅ Installed (v19) |
| `react-dom` | DOM rendering | ✅ Installed (v19) |
| `tailwindcss` | Utility-first CSS framework | ✅ Installed (v4) |
| `@tailwindcss/vite` | Vite integration for Tailwind v4 | ✅ Installed |
| `react-router-dom` | Client-side routing | **To install** |
| `vite` | Build tool | ✅ Installed (v8) |
| `@vitejs/plugin-react` | React fast refresh | ✅ Installed |

> No additional dependencies beyond `react-router-dom`. No state management library, no UI kit, no HTTP client library.

---

## 18. Phased Implementation Order

| Phase | Deliverable | Dependencies |
|---|---|---|
| **1** | `index.css` with `@import "tailwindcss"` + `@theme` tokens (5-color system, fonts) | None |
| **2** | Reusable UI components (Button, Input, Card, DataTable, Modal, LoadingState, EmptyState, etc.) | Phase 1 |
| **3** | `AuthProvider`, `useAuth`, `authApi.js`, `api.js` base client | Phase 1 |
| **4** | `WorkspaceProvider`, `useWorkspace`, `workspaceApi.js` | Phase 3 |
| **5** | `PermissionProvider`, guards (`ProtectedRoute`, `PermissionGuard`, etc.) | Phase 4 |
| **6** | `ProviderLayout` (Sidebar, Topbar, WorkspaceSwitcher) | Phase 2, 5 |
| **7** | `CustomerPortalLayout` | Phase 2, 5 |
| **8** | `AuthLayout`, Login, Signup, WorkspaceSelector pages | Phase 2, 3 |
| **9** | Provider Dashboard | Phase 6 |
| **10** | Quotation module (list, builder workspace) | Phase 6, 9 |
| **11** | Approval module (list, detail) | Phase 10 |
| **12** | Upsell / cross-sell panel | Phase 10 |
| **13** | Fulfillment module (list, detail) | Phase 6 |
| **14** | Subscriptions module (list, detail) | Phase 6 |
| **15** | Invoices module (list, detail) | Phase 6 |
| **16** | Customer negotiation module | Phase 7 |
| **17** | Deal Health dashboard | Phase 6 |
| **18** | Admin configuration pages | Phase 6 |
| **19** | Reports module | Phase 6 |
| **20** | Responsive / mobile polish & Security audit | All phases |

---

## 19. Architectural Dependency Direction

```
index.css (@theme tokens)
    ↓
UI Components (Button, Card, DataTable, Modal ... — Tailwind utility classes)
    ↓
Layouts (ProviderLayout, CustomerPortalLayout, AuthLayout)
    ↓
Auth / Workspace / Permission Providers + Guards
    ↓
Feature Modules (quotations, approvals, subscriptions, invoices ...)
    ↓
Pages (thin shells that compose features + layouts)
    ↓
API Services (api.js → feature APIs)
    ↓
Express Backend
```

No circular dependencies. No page redefines tokens. No component imports a page. No component introduces colors outside the five-color `@theme`.

---

## 20. Key Files to Create First

When implementation begins, create in this exact order:

1. `src/index.css` — `@import "tailwindcss"` + `@theme` design tokens (already started)
2. `src/main.jsx` — updated entry point
3. `src/App.jsx` — root with providers + router shell
4. `src/services/api.js` — base fetch client
5. `src/auth/AuthProvider.jsx` — auth context
6. `src/auth/useAuth.js` — auth hook
7. `src/workspace/WorkspaceProvider.jsx` — workspace context
8. `src/permissions/permissionConfig.js` — permission map
9. `src/permissions/PermissionProvider.jsx` — permission context
10. `src/permissions/ProtectedRoute.jsx` — auth guard
11. `src/router/AppRouter.jsx` — route definitions
12. `src/components/Button.jsx` — first UI primitive (Tailwind classes)
13. `src/components/Card.jsx` — second UI primitive
14. `src/layouts/ProviderLayout.jsx` — provider shell with Sidebar + Topbar

---

## 21. Success Criteria Checklist

- [ ] One React app serves all roles (Provider Admin, Sales Manager, Sales Rep, Customer Admin, Customer User)
- [ ] Global user identity + contextual workspace/membership/relationship model
- [ ] Workspace selector for multi-membership users
- [ ] Permission-driven navigation and route guards (RBAC + ABAC respected)
- [ ] Provider and Customer Portal are visually distinct layouts
- [ ] Customer UI never receives internal/sensitive fields
- [ ] All UI uses exactly five colors: `#724B66`, `#2E3141`, `#F3F2F2`, `#FFFFFF`, `#111826` (no independent border hues)
- [ ] Status communicated via icon + label, never color alone. No emojis.
- [ ] Components explicitly support Loading/Success/Empty/Error states
- [ ] List → Detail pattern consistent across Quotations, Approvals, Fulfillment, Subscriptions, Invoices
- [ ] Fake business data isolated in mock layer, never hardcoded in production components
- [ ] API layer is centralized, headers match actual backend contract, automatic error handling
- [ ] Routing structure reflects organization/relationship context
- [ ] Responsive across desktop, tablet, and mobile
- [ ] Backend remains the authoritative security boundary
