import React from 'react';
import { cn } from '../lib/utils';

type StatusType = 'pending' | 'approved' | 'rejected' | 'present' | 'absent' | 'late';

const STATUS_CONFIG: Record<StatusType, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'status-pending border' },
  approved: { label: 'Approved', className: 'status-approved border' },
  rejected: { label: 'Rejected', className: 'status-rejected border' },
  present: { label: 'Present', className: 'status-approved border' },
  absent: { label: 'Absent', className: 'status-rejected border' },
  late: { label: 'Late', className: 'status-pending border' },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', config.className, className)}>
      <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />
      {config.label}
    </span>
  );
};

export default StatusBadge;
