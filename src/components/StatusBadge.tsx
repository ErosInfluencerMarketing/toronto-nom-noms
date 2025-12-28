import { LeadStatus } from '@/types/lead';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new: {
    label: 'New',
    className: 'bg-status-new/20 text-status-new border-status-new/30',
  },
  contacted: {
    label: 'Contacted',
    className: 'bg-status-contacted/20 text-status-contacted border-status-contacted/30',
  },
  demo_booked: {
    label: 'Demo Booked',
    className: 'bg-status-demo/20 text-status-demo border-status-demo/30',
  },
  onboarded: {
    label: 'Onboarded',
    className: 'bg-status-onboarded/20 text-status-onboarded border-status-onboarded/30',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
