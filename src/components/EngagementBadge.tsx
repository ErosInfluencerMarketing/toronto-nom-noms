import { EmailEngagement } from '@/types/lead';
import { Badge } from '@/components/ui/badge';
import { Mail, MailOpen, MousePointerClick, Reply } from 'lucide-react';
import { cn } from '@/lib/utils';

const config: Record<EmailEngagement, { label: string; icon: React.ElementType; className: string }> = {
  none: { label: 'No Email', icon: Mail, className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Sent', icon: Mail, className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  opened: { label: 'Opened', icon: MailOpen, className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  clicked: { label: 'Clicked', icon: MousePointerClick, className: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  replied: { label: 'Replied', icon: Reply, className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
};

export function EngagementBadge({ engagement }: { engagement: EmailEngagement }) {
  const c = config[engagement] || config.none;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={cn('gap-1 text-[11px] font-medium', c.className)}>
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
}
