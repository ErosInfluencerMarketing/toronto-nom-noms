import { useState } from 'react';
import { normalizeInstagramHandle } from '@/lib/utils';
import { Lead } from '@/types/lead';
import { StatusBadge } from './StatusBadge';
import { PlatformBadge } from './PlatformBadge';
import { QuickMessage } from './QuickMessage';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Instagram, Calendar, Edit2, Trash2, Send } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';

interface LeadCardProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onViewDetails?: (lead: Lead) => void;
}

export function LeadCard({ lead, onEdit, onDelete, onViewDetails }: LeadCardProps) {
  const [messageOpen, setMessageOpen] = useState(false);
  const canMessage = !!lead.email || !!lead.instagram_handle;

  return (
    <>
      <Card className="bg-card border-border hover:border-primary/30 transition-all duration-200 animate-fade-in">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3
                  className="font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                  onClick={() => onViewDetails?.(lead)}
                >
                  {lead.business_name}
                </h3>
                {lead.category && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                    {lead.category}
                  </Badge>
                )}
                <PlatformBadge platform={lead.platform} />
              </div>
              
              {lead.owner_name && (
                <p className="text-sm text-muted-foreground mb-2">{lead.owner_name}</p>
              )}
              
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                {lead.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[180px]">{lead.email}</span>
                  </span>
                )}
                {lead.instagram_handle && (
                  <a
                    href={`https://instagram.com/${normalizeInstagramHandle(lead.instagram_handle)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-primary transition-colors underline decoration-dotted underline-offset-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Instagram className="h-3.5 w-3.5" />
                    @{normalizeInstagramHandle(lead.instagram_handle)}
                  </a>
                )}
              </div>
              
              <div className="flex items-center gap-3 mb-3">
                <StatusBadge status={lead.status} />
                {lead.next_outreach_date && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Next: {format(parseISO(lead.next_outreach_date), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
              
              {lead.last_outreach_date && (
                <p className="text-xs text-muted-foreground">
                  Last outreach: {format(parseISO(lead.last_outreach_date), 'MMM d, yyyy')}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {canMessage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary hover:text-primary/80"
                  onClick={() => setMessageOpen(true)}
                  title="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(lead)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(lead.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {messageOpen && (
        <QuickMessage open={messageOpen} onOpenChange={setMessageOpen} lead={lead} />
      )}
    </>
  );
}
