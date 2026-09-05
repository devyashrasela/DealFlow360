import React from 'react';

export const Card = ({ children, className = '', title, subtitle, action }) => {
  return (
    <div className={`bg-[#FFFFFF] rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden ${className}`}>
      {(title || subtitle || action) && (
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            {title && <h3 className="text-base font-semibold text-[#111826]">{title}</h3>}
            {subtitle && <p className="text-xs text-[#2E3141]/70 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};
