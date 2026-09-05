import React from 'react';
import { CatalogAdminPage } from './CatalogAdminPage.jsx';

/**
 * SubscriptionPlansPage — Backwards compatibility wrapper.
 * Subscription plans are unified into Catalog & Products under the 'plans' tab.
 */
export const SubscriptionPlansPage = () => {
  return <CatalogAdminPage initialTab="plans" />;
};

export default SubscriptionPlansPage;

