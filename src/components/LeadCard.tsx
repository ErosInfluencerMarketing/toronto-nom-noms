import { Lead } from '@/types/lead';
import { StatusBadge } from './StatusBadge';
import { PlatformBadge } from './PlatformBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Instagram, Calendar, Edit2, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface LeadCardProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
}

export function LeadCard({ lead, onEdit, onDelete }: LeadCardProps) {
  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-all duration-200 animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-foreground truncate">{lead.business_name}</h3>
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
                <span className="flex items-center gap-1.5">
                  <Instagram className="h-3.5 w-3.5" />
                  @{lead.instagram_handle}
                </span>
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
  );
}
