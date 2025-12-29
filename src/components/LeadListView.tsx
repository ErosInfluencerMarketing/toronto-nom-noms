import { Lead } from '@/types/lead';
import { StatusBadge } from './StatusBadge';
import { PlatformBadge } from './PlatformBadge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit2, Trash2, Calendar, Mail, Instagram } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';

interface LeadListViewProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
}

export function LeadListView({ leads, onEdit, onDelete }: LeadListViewProps) {
  const getOutreachDateStyle = (dateString: string | null) => {
    if (!dateString) return '';
    const date = parseISO(dateString);
    if (isPast(date) && !isToday(date)) return 'text-destructive';
    if (isToday(date)) return 'text-status-contacted font-medium';
    return 'text-muted-foreground';
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-muted-foreground font-medium">Business</TableHead>
              <TableHead className="text-muted-foreground font-medium">Owner</TableHead>
              <TableHead className="text-muted-foreground font-medium">Contact</TableHead>
              <TableHead className="text-muted-foreground font-medium">Platform</TableHead>
              <TableHead className="text-muted-foreground font-medium">Status</TableHead>
              <TableHead className="text-muted-foreground font-medium">Next Outreach</TableHead>
              <TableHead className="text-muted-foreground font-medium">Last Outreach</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow
                key={lead.id}
                className="hover:bg-secondary/30 transition-colors"
              >
                <TableCell className="font-medium text-foreground">
                  {lead.business_name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {lead.owner_name || '-'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {lead.email && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{lead.email}</span>
                      </span>
                    )}
                    {lead.instagram_handle && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Instagram className="h-3 w-3" />
                        @{lead.instagram_handle}
                      </span>
                    )}
                    {!lead.email && !lead.instagram_handle && (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <PlatformBadge platform={lead.platform} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={lead.status} />
                </TableCell>
                <TableCell>
                  {lead.next_outreach_date ? (
                    <span className={`flex items-center gap-1.5 text-sm ${getOutreachDateStyle(lead.next_outreach_date)}`}>
                      <Calendar className="h-3.5 w-3.5" />
                      {format(parseISO(lead.next_outreach_date), 'MMM d, yyyy')}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {lead.last_outreach_date ? (
                    <span className="text-sm text-muted-foreground">
                      {format(parseISO(lead.last_outreach_date), 'MMM d, yyyy')}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
