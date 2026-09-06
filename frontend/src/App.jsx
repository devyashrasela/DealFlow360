import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { FulfillmentCockpitPage } from './pages/fulfillment/FulfillmentCockpitPage.jsx';
import { WarehouseSplitDetailPage } from './pages/fulfillment/WarehouseSplitDetailPage.jsx';
import { CustomerPortalPage } from './pages/CustomerPortalPage.jsx';
import { DealHealthDashboard } from './pages/DealHealthDashboard.jsx';
import { ReportingDashboard } from './pages/ReportingDashboard.jsx';
import { SubscriptionListPage } from './pages/features/subscriptions/SubscriptionListPage.jsx';
import { SubscriptionDetailPage } from './pages/features/subscriptions/SubscriptionDetailPage.jsx';
import { InvoiceListPage } from './pages/features/invoices/InvoiceListPage.jsx';
import { InvoiceDetailPage } from './pages/features/invoices/InvoiceDetailPage.jsx';
import { CustomerMessagesPage } from './pages/customer/CustomerMessagesPage.jsx';
import { CustomerProfilePage } from './pages/customer/CustomerProfilePage.jsx';
import { QuotationListPage } from './pages/quotations/QuotationListPage.jsx';
import NotificationCenterPage from './pages/NotificationCenterPage.jsx';
import { QuotationBuilderPage } from './pages/quotations/QuotationBuilderPage.jsx';
import { ApprovalListPage } from './pages/approvals/ApprovalListPage.jsx';
import { ApprovalDetailPage } from './pages/approvals/ApprovalDetailPage.jsx';
import { CatalogAdminPage } from './pages/admin/CatalogAdminPage.jsx';
import { AuditLogsPage } from './pages/admin/AuditLogsPage.jsx';
import { GovernanceDashboard } from './pages/admin/GovernanceDashboard.jsx';
import { WarehouseAdminPage } from './pages/admin/WarehouseAdminPage.jsx';
import { ExchangeRatesPage } from './pages/admin/ExchangeRatesPage.jsx';
import { TeamRolesPage } from './pages/admin/TeamRolesPage.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { WorkspaceSelectorPage } from './pages/WorkspaceSelectorPage.jsx';
import { AcceptInvitePage } from './pages/AcceptInvitePage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { RoleGate } from './rbac/RoleGate.jsx';
import { CustomersListPage } from './pages/customer/CustomersListPage.jsx';

/**
 * RequireAuth — simple auth gate, no role logic.
 */
function RequireAuth({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

/**
 * ProtectedRoute — requires auth + an active org context.
 * If no activeOrgId is set the user hasn't picked a workspace yet → bounce them
 * to /select-workspace so they see the org selection card (PRD FR-1.3).
 * Customer portal users are routed to /portal.
 */
function ProtectedRoute({ children }) {
  const { token, activeRole, activeOrgId } = useAuth();
  if (!token) return <Navigate to="/login" replace />;

  // Must pick a workspace first
  if (!activeOrgId) return <Navigate to="/select-workspace" replace />;

  // Customer portal users always go to /portal — they never see the internal layout
  if (activeRole === 'customer_portal') {
    return <Navigate to="/portal" replace />;
  }

  return children;
}

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleGlobalRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes — no auth required */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/select-workspace" element={<RequireAuth><WorkspaceSelectorPage /></RequireAuth>} />
          <Route path="/invite/accept" element={<AcceptInvitePage />} />

          {/* Customer Portal — isolated layout, no internal sidebar */}
          <Route path="/portal" element={<CustomerPortalPage />} />

          {/* Protected internal workspace — role-gated */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout
                  key={refreshKey}
                  onRefresh={handleGlobalRefresh}
                  isRefreshing={isRefreshing}
                />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path=":providerSlug/dashboard" element={<DashboardPage />} />
            <Route path="notifications" element={<NotificationCenterPage />} />

            {/* Quotations — sales_rep, sales_manager, admin */}
            <Route path="quotations" element={<RoleGate><QuotationListPage /></RoleGate>} />
            <Route path="quotations/:id" element={<RoleGate><QuotationBuilderPage /></RoleGate>} />

            {/* Approvals — sales_manager, finance_ops, admin */}
            <Route path="approvals" element={<RoleGate><ApprovalListPage /></RoleGate>} />
            <Route path="approvals/:id" element={<RoleGate><ApprovalDetailPage /></RoleGate>} />

            {/* Fulfillment — finance_ops, admin */}
            <Route path="fulfillment" element={<RoleGate><FulfillmentCockpitPage /></RoleGate>} />
            <Route path="fulfillment/orders/:id" element={<RoleGate><WarehouseSplitDetailPage /></RoleGate>} />

            {/* Deal Health — sales_rep, sales_manager, admin */}
            <Route path="deal-health" element={<RoleGate><DealHealthDashboard /></RoleGate>} />

            {/* Customers — sales_rep, sales_manager, admin */}
            <Route path="customers" element={<RoleGate><CustomersListPage /></RoleGate>} />

            {/* Reports — sales_manager, admin */}
            <Route path="reports" element={<RoleGate><ReportingDashboard /></RoleGate>} />

            {/* Admin — admin only */}
            <Route path="admin/catalog" element={<RoleGate><CatalogAdminPage /></RoleGate>} />
            <Route path="admin/governance" element={<RoleGate><GovernanceDashboard /></RoleGate>} />
            <Route path="admin/warehouses" element={<RoleGate><WarehouseAdminPage /></RoleGate>} />
            <Route path="admin/exchange-rates" element={<RoleGate><ExchangeRatesPage /></RoleGate>} />
            <Route path="admin/audit-logs" element={<RoleGate><AuditLogsPage /></RoleGate>} />
            <Route path="audit-logs" element={<RoleGate><AuditLogsPage /></RoleGate>} />

            {/* Direct Configuration Routes (Matching Sidebar) */}
            <Route path="catalog" element={<RoleGate><CatalogAdminPage /></RoleGate>} />
            <Route path="products" element={<RoleGate><CatalogAdminPage initialTab="products" /></RoleGate>} />
            <Route path="price-lists" element={<RoleGate><CatalogAdminPage initialTab="pricelists" /></RoleGate>} />
            <Route path="subscription-plans" element={<RoleGate><CatalogAdminPage initialTab="plans" /></RoleGate>} />
            <Route path="discount-governance" element={<RoleGate><GovernanceDashboard /></RoleGate>} />
            <Route path="warehouses" element={<RoleGate><WarehouseAdminPage /></RoleGate>} />
            <Route path="exchange-rates" element={<RoleGate><ExchangeRatesPage /></RoleGate>} />
            <Route path="team-roles" element={<RoleGate><TeamRolesPage /></RoleGate>} />
            <Route path="admin/team-roles" element={<RoleGate><TeamRolesPage /></RoleGate>} />

            {/* Subscriptions — finance_ops, admin */}
            <Route path="subscriptions" element={<RoleGate><SubscriptionListPage /></RoleGate>} />
            <Route path="subscriptions/:subscriptionId" element={<RoleGate><SubscriptionDetailPage /></RoleGate>} />
            <Route path=":providerSlug/subscriptions" element={<RoleGate><SubscriptionListPage /></RoleGate>} />
            <Route path=":providerSlug/subscriptions/:subscriptionId" element={<RoleGate><SubscriptionDetailPage /></RoleGate>} />

            {/* Invoices — finance_ops, admin */}
            <Route path="invoices" element={<RoleGate><InvoiceListPage /></RoleGate>} />
            <Route path="invoices/:invoiceId" element={<RoleGate><InvoiceDetailPage /></RoleGate>} />
            <Route path=":providerSlug/invoices" element={<RoleGate><InvoiceListPage /></RoleGate>} />
            <Route path=":providerSlug/invoices/:invoiceId" element={<RoleGate><InvoiceDetailPage /></RoleGate>} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

