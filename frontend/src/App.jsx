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

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleGlobalRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* External Customer Portal (No AppLayout) */}
        <Route path="/portal" element={<CustomerPortalPage />} />

        {/* Internal Workspace */}
        <Route
          element={
            <AppLayout
              key={refreshKey}
              onRefresh={handleGlobalRefresh}
              isRefreshing={isRefreshing}
            />
          }
        >
          <Route index element={<DashboardPage />} />
          
          {/* Fulfillment Routes */}
          <Route path="fulfillment" element={<FulfillmentCockpitPage />} />
          <Route path="fulfillment/orders/:id" element={<WarehouseSplitDetailPage />} />
          <Route path="deal-health" element={<DealHealthDashboard />} />
          <Route path="reports" element={<ReportingDashboard />} />

          {/* Provider Routes (assuming 'acme' as default provider slug for now) */}
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
  );
}
