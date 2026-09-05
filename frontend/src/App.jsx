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
import { QuotationBuilderPage } from './pages/quotations/QuotationBuilderPage.jsx';
import { ApprovalListPage } from './pages/approvals/ApprovalListPage.jsx';
import { ApprovalDetailPage } from './pages/approvals/ApprovalDetailPage.jsx';
import { CatalogAdminPage } from './pages/admin/CatalogAdminPage.jsx';
import { GovernanceDashboard } from './pages/admin/GovernanceDashboard.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { WorkspaceSelectorPage } from './pages/WorkspaceSelectorPage.jsx';
import { AcceptInvitePage } from './pages/AcceptInvitePage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
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
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/portal" element={<CustomerPortalPage />} />
          <Route path="/select-workspace" element={<WorkspaceSelectorPage />} />
          <Route path="/invite/accept" element={<AcceptInvitePage />} />

          {/* Protected internal workspace */}
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
            <Route index element={<DashboardPage />} />

            {/* Fulfillment Routes */}
            <Route path="fulfillment" element={<FulfillmentCockpitPage />} />
            <Route path="fulfillment/orders/:id" element={<WarehouseSplitDetailPage />} />
            <Route path="deal-health" element={<DealHealthDashboard />} />
            <Route path="reports" element={<ReportingDashboard />} />
            <Route path="quotations" element={<QuotationListPage />} />
            <Route path="quotations/:id" element={<QuotationBuilderPage />} />
            <Route path="approvals" element={<ApprovalListPage />} />
            <Route path="approvals/:id" element={<ApprovalDetailPage />} />
            <Route path="admin/catalog" element={<CatalogAdminPage />} />
            <Route path="admin/governance" element={<GovernanceDashboard />} />

            {/* Provider Routes */}
            <Route path=":providerSlug/subscriptions" element={<SubscriptionListPage />} />
            <Route path=":providerSlug/subscriptions/:subscriptionId" element={<SubscriptionDetailPage />} />

            <Route path=":providerSlug/invoices" element={<InvoiceListPage />} />
            <Route path=":providerSlug/invoices/:invoiceId" element={<InvoiceDetailPage />} />

            {/* Customer Portal Routes */}
            <Route path=":providerSlug/:customerSlug/messages" element={<CustomerMessagesPage />} />
            <Route path=":providerSlug/:customerSlug/profile" element={<CustomerProfilePage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
