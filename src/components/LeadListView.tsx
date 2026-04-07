import { useState } from 'react';
import { normalizeInstagramHandle } from '@/lib/utils';
import { Lead, LeadStatus, Platform, EmailEngagement } from '@/types/lead';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { StatusBadge } from './StatusBadge';
import { PlatformBadge } from './PlatformBadge';
import { EngagementBadge } from './EngagementBadge';
import { QuickMessage } from './QuickMessage';
import { InlineEditCell } from './InlineEditCell';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash2, Calendar, Mail, Instagram, Send, ArrowUp, ArrowDown, ArrowUpDown, UserCircle, Search, Loader2 } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

type SortField = 'business_name' | 'owner_name' | 'email' | 'platform' | 'status' | 'category' | 'city' | 'next_outreach_date' | 'last_outreach_date' | 'created_at' | 'assigned_user_id' | 'email_engagement';
type SortDir = 'asc' | 'desc';

interface LeadListViewProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onUpdate?: (lead: Partial<Lead> & { id: string }) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onViewDetails?: (lead: Lead) => void;
}

const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'demo_booked', label: 'Demo Booked' },
  { value: 'onboarded', label: 'Onboarded' },
];

const platformOptions = [
  { value: 'eros', label: 'Eros' },
  { value: 'noms', label: 'Noms' },
];

export function LeadListView({ leads, onEdit, onDelete, onUpdate, selectedIds, onSelectionChange, onViewDetails }: LeadListViewProps) {
  const [messageLead, setMessageLead] = useState<Lead | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [findingIgId, setFindingIgId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { members } = useTeamMembers();
  const selectable = !!onSelectionChange && !!selectedIds;

  const memberMap = new Map(members.map((m) => [m.id, m]));

  const allSelected = selectable && leads.length > 0 && leads.every((l) => selectedIds.has(l.id));
  const someSelected = selectable && leads.some((l) => selectedIds.has(l.id)) && !allSelected;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(leads.map((l) => l.id)));
    }
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedLeads = [...leads].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const aVal = a[sortField] ?? '';
    const bVal = b[sortField] ?? '';
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.localeCompare(bVal) * dir;
    }
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const SortableHead = ({ field, children, className: headClass }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead
      className={cn("text-muted-foreground font-medium cursor-pointer select-none hover:text-foreground transition-colors", headClass)}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        {children}
        <SortIcon field={field} />
      </div>
    </TableHead>
  );

  const handleFieldUpdate = (lead: Lead, field: string, value: string) => {
    if (onUpdate) {
      onUpdate({ id: lead.id, [field]: value || null });
    }
  };

  const handleFindInstagram = async (lead: Lead) => {
    setFindingIgId(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke('find-instagram', {
        body: {
          businessName: lead.business_name,
          city: lead.city || 'Toronto',
          website: lead.website || '',
          leadId: lead.id,
        },
      });
      if (error) throw error;
      if (data?.instagram_handle) {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        toast.success(`Found: @${data.instagram_handle}`);
      } else {
        toast.info(`No Instagram found for ${lead.business_name}`);
      }
    } catch {
      toast.error('Failed to search for Instagram');
    } finally {
      setFindingIgId(null);
    }
  };

  const getOutreachDateStyle = (dateString: string | null) => {
    if (!dateString) return '';
    const date = parseISO(dateString);
    if (isPast(date) && !isToday(date)) return 'text-destructive';
    if (isToday(date)) return 'text-status-contacted font-medium';
    return 'text-muted-foreground';
  };

  return (
    <>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                {selectable && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                )}
                <SortableHead field="business_name" className="w-[12%]">Business</SortableHead>
                <SortableHead field="owner_name" className="w-[8%]">Owner</SortableHead>
                <SortableHead field="email" className="w-[14%]">Contact</SortableHead>
                <SortableHead field="category" className="w-[8%]">Category</SortableHead>
                <SortableHead field="city" className="w-[7%]">City</SortableHead>
                <SortableHead field="platform" className="w-[6%]">Platform</SortableHead>
                <SortableHead field="status" className="w-[7%]">Status</SortableHead>
                <SortableHead field="email_engagement" className="w-[7%]">Engagement</SortableHead>
                <SortableHead field="assigned_user_id" className="w-[8%]">Assigned</SortableHead>
                <SortableHead field="next_outreach_date" className="w-[7%]">Next</SortableHead>
                <SortableHead field="last_outreach_date" className="w-[7%]">Last</SortableHead>
                <SortableHead field="created_at" className="w-[7%]">Created</SortableHead>
                <TableHead className="text-muted-foreground font-medium text-right w-[5%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLeads.map((lead) => {
                const canMessage = !!lead.email || !!lead.instagram_handle;
                const isSelected = selectable && selectedIds.has(lead.id);
                return (
                  <TableRow
                    key={lead.id}
                    className={cn('hover:bg-secondary/30 transition-colors', isSelected && 'bg-primary/5')}
                  >
                    {selectable && (
                      <TableCell>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleOne(lead.id)} />
                      </TableCell>
                    )}
                    <TableCell className="font-medium text-foreground truncate">
                      <InlineEditCell
                        value={lead.business_name}
                        onSave={(v) => handleFieldUpdate(lead, 'business_name', v)}
                        onDisplayClick={() => onViewDetails?.(lead)}
                      />
                    </TableCell>
                    <TableCell>
                      <InlineEditCell
                        value={lead.owner_name || ''}
                        onSave={(v) => handleFieldUpdate(lead, 'owner_name', v)}
                        className="text-muted-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                          <InlineEditCell
                            value={lead.email || ''}
                            onSave={(v) => handleFieldUpdate(lead, 'email', v)}
                            placeholder="Add email"
                            className="text-muted-foreground truncate"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Instagram className="h-3 w-3 text-muted-foreground shrink-0" />
                          {lead.instagram_handle ? (
                            <a
                              href={`https://instagram.com/${normalizeInstagramHandle(lead.instagram_handle)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors underline decoration-dotted underline-offset-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              @{normalizeInstagramHandle(lead.instagram_handle)}
                            </a>
                          ) : (
                            <InlineEditCell
                              value=""
                              onSave={(v) => handleFieldUpdate(lead, 'instagram_handle', v)}
                              placeholder="Add handle"
                              className="text-muted-foreground"
                            />
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <InlineEditCell
                        value={lead.category || ''}
                        onSave={(v) => handleFieldUpdate(lead, 'category', v)}
                        placeholder="Add category"
                        className="text-muted-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <InlineEditCell
                        value={lead.city || ''}
                        onSave={(v) => handleFieldUpdate(lead, 'city', v)}
                        placeholder="Add city"
                        className="text-muted-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <InlineEditCell
                        value={lead.platform}
                        onSave={(v) => handleFieldUpdate(lead, 'platform', v)}
                        type="select"
                        options={platformOptions}
                        displayRender={(v) => <PlatformBadge platform={v as Platform} />}
                      />
                    </TableCell>
                    <TableCell>
                      <InlineEditCell
                        value={lead.status}
                        onSave={(v) => handleFieldUpdate(lead, 'status', v)}
                        type="select"
                        options={statusOptions}
                        displayRender={(v) => <StatusBadge status={v as LeadStatus} />}
                      />
                    </TableCell>
                    <TableCell>
                      <EngagementBadge engagement={(lead.email_engagement || 'none') as EmailEngagement} />
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const member = lead.assigned_user_id ? memberMap.get(lead.assigned_user_id) : null;
                        if (!member) {
                          return (
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground/50">
                              <UserCircle className="h-4 w-4" />
                              Unassigned
                            </span>
                          );
                        }
                        const initials = (member.full_name || member.email || '?')
                          .split(' ')
                          .map((w) => w[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2);
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center gap-2 text-sm text-foreground">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                      {initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="truncate max-w-[100px]">
                                    {member.full_name || member.email || 'Unknown'}
                                  </span>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{member.full_name || 'No name'}</p>
                                {member.email && <p className="text-muted-foreground text-xs">{member.email}</p>}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <InlineEditCell
                        value={lead.next_outreach_date || ''}
                        onSave={(v) => handleFieldUpdate(lead, 'next_outreach_date', v)}
                        type="date"
                        placeholder="Set date"
                        className={getOutreachDateStyle(lead.next_outreach_date)}
                        displayRender={(v) =>
                          v ? (
                            <span className="flex items-center gap-1.5 text-sm">
                              <Calendar className="h-3.5 w-3.5" />
                              {format(parseISO(v), 'MMM d, yyyy')}
                            </span>
                          ) : null
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <InlineEditCell
                        value={lead.last_outreach_date || ''}
                        onSave={(v) => handleFieldUpdate(lead, 'last_outreach_date', v)}
                        type="date"
                        placeholder="Set date"
                        className="text-muted-foreground"
                        displayRender={(v) =>
                          v ? (
                            <span className="text-sm">
                              {format(parseISO(v), 'MMM d, yyyy')}
                            </span>
                          ) : null
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(parseISO(lead.created_at), 'MMM d, yyyy')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!lead.instagram_handle && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-pink-500"
                            onClick={() => handleFindInstagram(lead)}
                            disabled={findingIgId === lead.id}
                            title="Find Instagram"
                          >
                            {findingIgId === lead.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Instagram className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {canMessage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary/80"
                            onClick={() => setMessageLead(lead)}
                            title="Send message"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
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
                );
              })}
            </TableBody>
          </Table>
      </div>

      {messageLead && (
        <QuickMessage
          open={!!messageLead}
          onOpenChange={(open) => !open && setMessageLead(null)}
          lead={messageLead}
        />
      )}
    </>
  );
}
