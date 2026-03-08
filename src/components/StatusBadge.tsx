import React from 'react';
import { cn } from '../lib/utils';

type StatusType = 'pending' | 'approved' | 'rejected' | 'present' | 'absent' | 'late';

const STATUS_CONFIG: Record<StatusType, { label: string; dot: string; text: string; bg: string }> = {
  pending:  { label: 'PENDING',  dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-100' },
  approved: { label: 'APPROVED', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-100' },
  rejected: { label: 'REJECTED', dot: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-100' },
  present:  { label: 'PRESENT',  dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-100' },
  absent:   { label: 'ABSENT',   dot: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-100' },
  late:     { label: 'LATE',     dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-100' },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide',
      config.bg, config.text, className
    )}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
