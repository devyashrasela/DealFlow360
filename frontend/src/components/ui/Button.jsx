import React from 'react';

const VARIANTS = {
  primary: 'bg-[#724B66] text-[#FFFFFF] hover:bg-[#5e3d54] active:bg-[#4d3245] shadow-sm',
  secondary: 'bg-[#2E3141] text-[#FFFFFF] hover:bg-[#232532] active:bg-[#1a1c26] shadow-sm',
  outline: 'bg-transparent border border-[#2E3141]/30 text-[#2E3141] hover:bg-[#F3F2F2] active:bg-neutral-200',
  destructive: 'bg-rose-600 text-[#FFFFFF] hover:bg-rose-700 active:bg-rose-800 shadow-sm',
  ghost: 'bg-transparent text-[#2E3141] hover:bg-[#F3F2F2] active:bg-neutral-200',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  icon: Icon,
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#724B66]/40 disabled:opacity-50 disabled:cursor-not-allowed gap-2 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};
