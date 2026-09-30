import React from 'react';
import { AttendanceStatus } from '../../types';

interface BadgeProps {
  status: AttendanceStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';

  switch (status) {
    case 'Present':
      colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold';
      break;
    case 'Absent':
      colorClass = 'bg-rose-50 text-rose-700 border-rose-300 font-semibold';
      break;
    case 'Half Day':
      colorClass = 'bg-amber-50 text-amber-700 border-amber-300 font-semibold';
      break;
    case 'Holiday':
      colorClass = 'bg-purple-50 text-purple-700 border-purple-300 font-medium';
      break;
    case 'Weekly Off':
      colorClass = 'bg-blue-50 text-blue-700 border-blue-200 font-medium';
      break;
    case 'OUT Missing':
      colorClass = 'bg-orange-50 text-orange-700 border-orange-300 font-semibold';
      break;
    case 'Active':
      colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-300 font-medium';
      break;
    case 'Inactive':
      colorClass = 'bg-slate-100 text-slate-500 border-slate-300 font-medium';
      break;
    default:
      colorClass = 'bg-slate-100 text-slate-700 border-slate-200';
  }

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border tracking-wide whitespace-nowrap ${sizeClasses[size]} ${colorClass}`}
    >
      {status}
    </span>
  );
};

export const LateBadge: React.FC<{ isLate: boolean }> = ({ isLate }) => {
  if (!isLate) return null;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-sm bg-orange-100 text-orange-800 border border-orange-300 uppercase tracking-wider">
      Late
    </span>
  );
};

export const EarlyOutBadge: React.FC<{ isEarly: boolean }> = ({ isEarly }) => {
  if (!isEarly) return null;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-sm bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wider">
      Early Out
    </span>
  );
};
