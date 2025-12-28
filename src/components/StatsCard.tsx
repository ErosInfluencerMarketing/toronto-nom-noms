import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  className?: string;
  iconClassName?: string;
}

export function StatsCard({ title, value, icon: Icon, className, iconClassName }: StatsCardProps) {
  return (
    <div className={cn(
      'p-4 rounded-lg bg-card border border-border animate-slide-up',
      className
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className={cn(
          'h-10 w-10 rounded-lg flex items-center justify-center',
          iconClassName
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
