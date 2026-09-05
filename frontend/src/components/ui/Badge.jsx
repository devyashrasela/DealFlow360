import React from 'react';

const STATUS_VARIANTS = {
  // Allocated / Active / Shipped
  allocated: 'bg-[#724B66]/10 text-[#724B66] border-[#724B66]/30',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  assigned: 'bg-[#2E3141]/10 text-[#2E3141] border-[#2E3141]/30',
  pickpack: 'bg-amber-50 text-amber-700 border-amber-200',
  shipped: 'bg-blue-50 text-blue-700 border-blue-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  // Backorders
  open: 'bg-rose-50 text-rose-700 border-rose-200',
  stock_received_pending_consolidation: 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse',
  consolidated: 'bg-[#724B66]/10 text-[#724B66] border-[#724B66]/30',
  cancelled: 'bg-neutral-100 text-neutral-600 border-neutral-300',
  // Invoices
  posted: 'bg-blue-50 text-blue-700 border-blue-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  partially_paid: 'bg-amber-50 text-amber-700 border-amber-200',
  credited: 'bg-[#724B66]/10 text-[#724B66] border-[#724B66]/30',
  // Aliases for common variant names
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  neutral: 'bg-neutral-100 text-neutral-600 border-neutral-300',
  // Default
  default: 'bg-[#F3F2F2] text-[#2E3141] border-[#2E3141]/20',
};

export const Badge = ({ children, status, variant, className = '' }) => {
  const key = (status || variant || 'default').toLowerCase();
  const style = STATUS_VARIANTS[key] || STATUS_VARIANTS.default;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} ${className}`}
    >
      {children}
    </span>
  );
};
