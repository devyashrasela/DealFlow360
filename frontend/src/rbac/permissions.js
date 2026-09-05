/**
 * RBAC Permission Map — single source of truth.
 *
 * Roles: admin, sales_manager, sales_rep, finance_ops, customer_portal
 *
 * Each role maps to the route prefixes it can access.
 * If a route is not listed for a role, the user gets a 403 screen.
 */

export const ROLE_PERMISSIONS = {
  sales_rep: {
    routes: ['/', '/dashboard', '/quotations', '/deal-health'],
    sidebarSections: ['main'],
    description: 'Sales Representative',
  },
  sales_manager: {
    routes: ['/', '/dashboard', '/quotations', '/approvals', '/deal-health', '/reports'],
    sidebarSections: ['main'],
    description: 'Sales Manager',
  },
  finance_ops: {
    routes: ['/', '/dashboard', '/approvals', '/fulfillment', '/subscriptions', '/invoices'],
    sidebarSections: ['main'],
    description: 'Finance / Operations',
  },
  admin: {
    routes: ['/', '/dashboard', '/quotations', '/approvals', '/fulfillment', '/subscriptions', '/invoices', '/deal-health', '/reports', '/admin', '/products', '/price-lists', '/discount-rules', '/approval-chains', '/warehouses', '/subscription-plans', '/settings'],
    sidebarSections: ['main', 'config'],
    description: 'Administrator',
  },
  customer_portal: {
    routes: ['/portal'],
    sidebarSections: ['portal'],
    description: 'Customer Portal',
  },
};

/**
 * Check if a role can access a given pathname.
 */
export function canAccess(role, pathname) {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;

  // Admin can access everything
  if (role === 'admin') return true;

  // For dynamic provider/customer routes like /acme/subscriptions
  // we need to normalize the path to check against permissions
  const normalizedPath = normalizePath(pathname);

  return perms.routes.some((allowed) => {
    if (allowed === '/') return normalizedPath === '/';
    return normalizedPath.startsWith(allowed);
  });
}

/**
 * Normalize dynamic paths:
 *   /acme/subscriptions → /subscriptions
 *   /acme/invoices/123  → /invoices
 *   /acme/techstart/messages → /portal (customer routes)
 */
function normalizePath(pathname) {
  // Static paths pass through
  const staticPrefixes = ['/', '/dashboard', '/landing', '/quotations', '/approvals', '/fulfillment', '/deal-health', '/reports', '/admin', '/login', '/register', '/portal', '/select-workspace', '/invite', '/settings', '/products', '/price-lists', '/discount-rules', '/approval-chains', '/warehouses', '/subscription-plans'];
  for (const prefix of staticPrefixes) {
    if (prefix === '/' && pathname === '/') return '/';
    if (prefix !== '/' && pathname.startsWith(prefix)) return pathname;
  }

  // Dynamic paths: /:providerSlug/subscriptions → /subscriptions
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 2) {
    const second = segments[1];
    if (second === 'subscriptions') return '/subscriptions';
    if (second === 'invoices') return '/invoices';
    // /:providerSlug/:customerSlug/* → portal routes
    if (segments.length >= 3) return '/portal';
  }

  return pathname;
}

/**
 * Check if a sidebar nav item should be visible for the current role.
 */
export function isNavVisible(role, path) {
  if (!role) return false;
  if (role === 'admin') return true;

  const normalizedPath = normalizePath(path);
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;

  return perms.routes.some((allowed) => {
    if (allowed === '/') return normalizedPath === '/';
    return normalizedPath.startsWith(allowed);
  });
}
