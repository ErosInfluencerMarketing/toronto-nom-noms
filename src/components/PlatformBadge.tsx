import { Platform } from '@/types/lead';
import { cn } from '@/lib/utils';

interface PlatformBadgeProps {
  platform: Platform;
  className?: string;
}

const platformConfig: Record<Platform, { label: string; className: string }> = {
  eros: {
    label: 'Eros',
    className: 'bg-platform-eros/20 text-platform-eros border-platform-eros/30',
  },
  noms: {
    label: 'Noms',
    className: 'bg-platform-noms/20 text-platform-noms border-platform-noms/30',
  },
  fitness: {
    label: 'Fitness',
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
};

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  const config = platformConfig[platform];
  
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
