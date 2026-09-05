import React from 'react';

/**
 * Linear-inspired Design System Badge & Status Component
 * 
 * - Statuses (Active, Operational, Pending, Suspended, etc.):
 *   Render as soft-tinted micro-capsules (rounded-md) with a crisp 6px colored dot (●)
 *   and contextual tooltips.
 * 
 * - Classification Tags (Roles, Categories, Tiers, Cadence):
 *   Render as clean neutral or brand-accented chips without status dots.
 */

const STATUS_CONFIGS = {
  // --- OPERATIONAL & HEALTHY ---
  active: {
    badge: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/80',
    dot: 'bg-emerald-500',
    defaultTitle: 'Active • Ready and operational',
  },
  operational: {
    badge: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/80',
    dot: 'bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.2)]',
    defaultTitle: 'Operational • In service & routing dispatches',
  },
  healthy: {
    badge: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/80',
    dot: 'bg-emerald-500',
    defaultTitle: 'Healthy • Optimum stock and allocation levels',
  },
  paid: {
    badge: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/80',
    dot: 'bg-emerald-500',
    defaultTitle: 'Paid • Full settlement posted',
  },
  delivered: {
    badge: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/80',
    dot: 'bg-emerald-500',
    defaultTitle: 'Delivered • Confirmed received at destination',
  },
  success: {
    badge: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/80',
    dot: 'bg-emerald-500',
    defaultTitle: 'Success • Successfully completed',
  },
  approved: {
    badge: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/80',
    dot: 'bg-emerald-500',
    defaultTitle: 'Approved • Sign-off granted',
  },

  // --- ATTENTION & IN-PROGRESS ---
  pickpack: {
    badge: 'bg-amber-50/80 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-500',
    defaultTitle: 'Pick & Pack • Order being prepared at warehouse depot',
  },
  warning: {
    badge: 'bg-amber-50/80 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-500',
    defaultTitle: 'Warning • Requires review',
  },
  pending: {
    badge: 'bg-amber-50/80 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-500',
    defaultTitle: 'Pending • Awaiting action or confirmation',
  },
  pending_cancellation: {
    badge: 'bg-amber-50/80 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-500',
    defaultTitle: 'Pending Cancellation • Scheduled to terminate at period end',
  },
  pending_proration: {
    badge: 'bg-amber-50/80 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-500',
    defaultTitle: 'Pending Proration • Calculating interval delta',
  },
  partially_paid: {
    badge: 'bg-amber-50/80 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-500',
    defaultTitle: 'Partially Paid • Partial balance remaining',
  },
  stock_received_pending_consolidation: {
    badge: 'bg-amber-50/80 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-500 animate-pulse',
    defaultTitle: 'Stock Received • Consolidation into shipment pending',
  },
  low_stock: {
    badge: 'bg-amber-50/80 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-500',
    defaultTitle: 'Low Stock • Reorder threshold reached',
  },
  returned: {
    badge: 'bg-amber-50/80 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-500',
    defaultTitle: 'Returned • Revisions requested by reviewer',
  },

  // --- CRITICAL, INACTIVE & DANGER ---
  inactive: {
    badge: 'bg-neutral-100/90 text-neutral-600 border-neutral-200/90',
    dot: 'bg-neutral-400',
    defaultTitle: 'Inactive • Currently paused or disabled',
  },
  offline: {
    badge: 'bg-rose-50/80 text-rose-800 border-rose-200/80',
    dot: 'bg-rose-500',
    defaultTitle: 'Offline • Decommissioned or unreachable',
  },
  suspended: {
    badge: 'bg-rose-50/80 text-rose-800 border-rose-200/80',
    dot: 'bg-rose-500',
    defaultTitle: 'Suspended • User access disabled by administrator',
  },
  cancelled: {
    badge: 'bg-neutral-100/90 text-neutral-600 border-neutral-200/90',
    dot: 'bg-neutral-400',
    defaultTitle: 'Cancelled • Workflow terminated',
  },
  void: {
    badge: 'bg-rose-50/80 text-rose-800 border-rose-200/80',
    dot: 'bg-rose-500',
    defaultTitle: 'Void • Invalidated statement',
  },
  danger: {
    badge: 'bg-rose-50/80 text-rose-800 border-rose-200/80',
    dot: 'bg-rose-500',
    defaultTitle: 'Critical • Immediate attention required',
  },
  rejected: {
    badge: 'bg-rose-50/80 text-rose-800 border-rose-200/80',
    dot: 'bg-rose-500',
    defaultTitle: 'Rejected • Approval request declined',
  },
  stockout: {
    badge: 'bg-rose-50/80 text-rose-800 border-rose-200/80',
    dot: 'bg-rose-500',
    defaultTitle: 'Stockout • Zero quantity available in warehouse',
  },
  overdue: {
    badge: 'bg-rose-50/80 text-rose-800 border-rose-200/80',
    dot: 'bg-rose-500',
    defaultTitle: 'Overdue • Past payment terms date',
  },
  open: {
    badge: 'bg-rose-50/80 text-rose-800 border-rose-200/80',
    dot: 'bg-rose-500',
    defaultTitle: 'Open • Pending depot replenishment',
  },

  // --- LOGISTICS, INFO & PROCESSING ---
  shipped: {
    badge: 'bg-sky-50/80 text-sky-800 border-sky-200/80',
    dot: 'bg-sky-500',
    defaultTitle: 'Shipped • In transit with carrier',
  },
  posted: {
    badge: 'bg-sky-50/80 text-sky-800 border-sky-200/80',
    dot: 'bg-sky-500',
    defaultTitle: 'Posted • Formally recognized in ledger',
  },
  issued: {
    badge: 'bg-sky-50/80 text-sky-800 border-sky-200/80',
    dot: 'bg-sky-500',
    defaultTitle: 'Issued • Transmitted to customer',
  },
  info: {
    badge: 'bg-sky-50/80 text-sky-800 border-sky-200/80',
    dot: 'bg-sky-500',
    defaultTitle: 'Informational status',
  },
  allocated: {
    badge: 'bg-[#724B66]/10 text-[#724B66] border-[#724B66]/25',
    dot: 'bg-[#724B66]',
    defaultTitle: 'Allocated • Reserved against specific inventory stock',
  },
  assigned: {
    badge: 'bg-neutral-100/90 text-neutral-700 border-neutral-200/80',
    dot: 'bg-neutral-500',
    defaultTitle: 'Assigned • Ownership configured',
  },
  consolidated: {
    badge: 'bg-[#724B66]/10 text-[#724B66] border-[#724B66]/25',
    dot: 'bg-[#724B66]',
    defaultTitle: 'Consolidated • Consolidated with secondary order',
  },
  credited: {
    badge: 'bg-[#724B66]/10 text-[#724B66] border-[#724B66]/25',
    dot: 'bg-[#724B66]',
    defaultTitle: 'Credited • Offset by credit note balance',
  },
  draft: {
    badge: 'bg-neutral-100/90 text-neutral-600 border-neutral-200/80',
    dot: 'bg-neutral-400',
    defaultTitle: 'Draft • Work in progress',
  },
  archived: {
    badge: 'bg-neutral-100/90 text-neutral-600 border-neutral-200/80',
    dot: 'bg-neutral-400',
    defaultTitle: 'Archived • Historical record',
  },

  // --- CLASSIFICATION CHIPS (Roles, Tiers, Categories, Scopes - NO DOT) ---
  role_admin: {
    badge: 'bg-[#724B66]/10 text-[#724B66] border-[#724B66]/25 font-semibold',
    isTag: true,
    defaultTitle: 'Role: Administrator',
  },
  role_sales_manager: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200/80 font-semibold',
    isTag: true,
    defaultTitle: 'Role: Sales Manager',
  },
  role_finance_ops: {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 font-semibold',
    isTag: true,
    defaultTitle: 'Role: Finance & Operations',
  },
  role_sales_rep: {
    badge: 'bg-blue-50 text-blue-800 border-blue-200/80 font-semibold',
    isTag: true,
    defaultTitle: 'Role: Sales Representative',
  },
  role_customer_portal: {
    badge: 'bg-neutral-100 text-neutral-700 border-neutral-200 font-semibold',
    isTag: true,
    defaultTitle: 'Role: External Customer Portal',
  },
  // Role aliases
  admin: {
    badge: 'bg-[#724B66]/10 text-[#724B66] border-[#724B66]/25 font-semibold',
    isTag: true,
    defaultTitle: 'Role: Administrator',
  },
  sales_manager: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200/80 font-semibold',
    isTag: true,
    defaultTitle: 'Role: Sales Manager',
  },
  finance_ops: {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 font-semibold',
    isTag: true,
    defaultTitle: 'Role: Finance & Operations',
  },
  sales_rep: {
    badge: 'bg-blue-50 text-blue-800 border-blue-200/80 font-semibold',
    isTag: true,
    defaultTitle: 'Role: Sales Representative',
  },
  customer_portal: {
    badge: 'bg-neutral-100 text-neutral-700 border-neutral-200 font-semibold',
    isTag: true,
    defaultTitle: 'Role: Customer Portal',
  },
  primary: {
    badge: 'bg-[#724B66]/10 text-[#724B66] border-[#724B66]/25 font-semibold',
    isTag: true,
  },
  scope: {
    badge: 'bg-neutral-100/90 text-neutral-700 border-neutral-200/80 font-medium',
    isTag: true,
  },
  tag: {
    badge: 'bg-neutral-100/90 text-neutral-700 border-neutral-200/80 font-medium',
    isTag: true,
  },
  category: {
    badge: 'bg-neutral-100/90 text-neutral-700 border-neutral-200/80 font-medium',
    isTag: true,
  },
  cadence: {
    badge: 'bg-neutral-100/90 text-neutral-700 border-neutral-200/80 font-medium',
    isTag: true,
  },
  neutral: {
    badge: 'bg-neutral-100/90 text-neutral-700 border-neutral-200/80',
    isTag: true,
  },
  outline: {
    badge: 'bg-transparent text-neutral-700 border-neutral-200/90 font-medium',
    isTag: true,
  },
  default: {
    badge: 'bg-neutral-100/90 text-neutral-700 border-neutral-200/80 font-medium',
    dot: 'bg-neutral-400',
    defaultTitle: 'Status indicator',
  },
};

export const Badge = ({
  children,
  status,
  variant,
  dot, // explicit boolean override
  title, // tooltip override
  size = 'sm', // 'sm' (11px) or 'md' (12px)
  className = '',
  onClick,
}) => {
  const rawKey = (status || variant || 'default').toString().toLowerCase().replace(/\s+/g, '_');
  const config = STATUS_CONFIGS[rawKey] || STATUS_CONFIGS.default;

  // Determine whether to display the colored status dot:
  // Explicit `dot` prop always takes precedence.
  // Otherwise, if config has isTag: true, do not show dot; if config has dot, show it.
  const showDot = dot !== undefined ? Boolean(dot) : (!config.isTag && Boolean(config.dot));

  const resolvedTitle = title !== undefined ? title : config.defaultTitle;

  const sizeClasses = size === 'md'
    ? 'px-2.5 py-1 text-xs'
    : 'px-2 py-0.5 text-[11px]';

  return (
    <span
      title={resolvedTitle}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md font-medium tracking-tight border select-none transition-colors ${sizeClasses} ${config.badge} ${
        onClick ? 'cursor-pointer hover:opacity-85' : ''
      } ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`}
          aria-hidden="true"
        />
      )}
      <span className="truncate">{children}</span>
    </span>
  );
};
