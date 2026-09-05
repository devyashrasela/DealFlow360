import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { FulfillmentCockpitPage } from './pages/fulfillment/FulfillmentCockpitPage.jsx';
import { WarehouseSplitDetailPage } from './pages/fulfillment/WarehouseSplitDetailPage.jsx';

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
          <Route path="fulfillment" element={<FulfillmentCockpitPage />} />
          <Route path="fulfillment/orders/:id" element={<WarehouseSplitDetailPage />} />

          {/* Placeholders for upcoming features */}
          <Route
            path="subscriptions"
            element={
              <div className="p-8 max-w-xl mx-auto text-center space-y-4">
                <h2 className="text-xl font-bold text-[#111826]">Customer Subscriptions Register</h2>
                <p className="text-sm text-[#2E3141]/70">
                  Feature 2 in progress: Contract provisioner & 12-month billing schedules.
                </p>
              </div>
            }
          />
          <Route
            path="invoices"
            element={
              <div className="p-8 max-w-xl mx-auto text-center space-y-4">
                <h2 className="text-xl font-bold text-[#111826]">Unified Financial Ledger</h2>
                <p className="text-sm text-[#2E3141]/70">
                  Feature 3 in progress: Invoice registers, payment captures & credit offsets.
                </p>
              </div>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
