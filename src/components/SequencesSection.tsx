import { useState, useEffect } from 'react';
import { useSequences } from '@/hooks/useSequences';
import { useTemplates } from '@/hooks/useTemplates';
import { Lead, Platform } from '@/types/lead';
import { SequenceFormData, SequenceStatus } from '@/types/sequence';
import { SequenceStepForm } from '@/components/SequenceStepForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Repeat, Pause, Play, CheckCircle, MessageCircle, Trash2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { format } from 'date-fns';

interface SequencesSectionProps {
  leads: Lead[];
}

const STATUS_TABS: { value: SequenceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'replied', label: 'Replied' },
];

export function SequencesSection({ leads }: SequencesSectionProps) {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<SequenceStatus | 'all'>('all');
  const [leadSearch, setLeadSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { sequences, totalCount, statusCounts, pageSize, isLoading, createSequence, updateSequenceStatus, deleteSequence } = useSequences(page, statusFilter, debouncedSearch);
  const { templates } = useTemplates();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState<SequenceFormData>({
    name: '',
    lead_ids: [],
    steps: [{ template_id: '', delay_days: 0 }],
  });

  const [leadPlatformFilter, setLeadPlatformFilter] = useState<Platform | 'all'>('all');
  const [leadCityFilter, setLeadCityFilter] = useState('');
  const [leadEmailSearch, setLeadEmailSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all');
  const [leadCategoryFilter, setLeadCategoryFilter] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(leadSearch);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [leadSearch]);

  const emailTemplates = templates.filter((t) => t.channel === 'email');
  const leadsWithEmail = leads.filter((l) => !!l.email);

  const uniqueCities = Array.from(new Set(leadsWithEmail.map((l) => l.city).filter(Boolean))).sort() as string[];
  const uniqueCategories = Array.from(new Set(leadsWithEmail.map((l) => l.category).filter(Boolean))).sort() as string[];

  const filteredLeads = leadsWithEmail.filter((l) => {
    if (leadPlatformFilter !== 'all' && l.platform !== leadPlatformFilter) return false;
    if (leadCityFilter && l.city !== leadCityFilter) return false;
    if (leadEmailSearch && !l.email?.toLowerCase().includes(leadEmailSearch.toLowerCase())) return false;
    if (leadStatusFilter !== 'all' && l.status !== leadStatusFilter) return false;
    if (leadCategoryFilter && l.category !== leadCategoryFilter) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleCreate = () => {
    if (formData.lead_ids.length === 0 || formData.steps.some((s) => !s.template_id) || !formData.name.trim()) return;
    createSequence.mutate(formData, {
      onSuccess: () => {
        setIsFormOpen(false);
        setFormData({ name: '', lead_ids: [], steps: [{ template_id: '', delay_days: 0 }] });
      },
    });
  };

  const handleStepChange = (index: number, data: { template_id: string; delay_days: number }) => {
    const newSteps = [...formData.steps];
    newSteps[index] = data;
    setFormData({ ...formData, steps: newSteps });
  };

  const handleAddStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { template_id: '', delay_days: 2 }],
    });
  };

  const handleRemoveStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index),
    });
  };

  const getLeadName = (leadId: string) => leads.find((l) => l.id === leadId)?.business_name || 'Unknown';

  const getTemplateName = (templateId: string) => templates.find((t) => t.id === templateId)?.name || 'Unknown';

  const statusColor: Record<string, string> = {
    active: 'bg-green-500/10 text-green-400 border-green-500/30',
    paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    completed: 'bg-muted text-muted-foreground border-border',
    replied: 'bg-primary/10 text-primary border-primary/30',
  };

  const statusIcon: Record<string, React.ReactNode> = {
    active: <Play className="h-3 w-3" />,
    paused: <Pause className="h-3 w-3" />,
    completed: <CheckCircle className="h-3 w-3" />,
    replied: <MessageCircle className="h-3 w-3" />,
  };

  const handleStatusFilter = (status: SequenceStatus | 'all') => {
    setStatusFilter(status);
    setPage(0);
  };

  const getCountForStatus = (status: SequenceStatus | 'all') => {
    if (status === 'all') return statusCounts.total;
    return (statusCounts as any)[status] || 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Email Sequences</h2>
          <span className="text-sm text-muted-foreground">({totalCount})</span>
        </div>
        <Button
          size="sm"
          onClick={() => setIsFormOpen(true)}
          disabled={emailTemplates.length === 0 || leadsWithEmail.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Sequence
        </Button>
      </div>

      {/* Search + Status filter tabs */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by lead..."
            value={leadSearch}
            onChange={(e) => setLeadSearch(e.target.value)}
            className="h-8 w-48 pl-8 text-xs bg-secondary border-border"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant="ghost"
            size="sm"
            onClick={() => handleStatusFilter(tab.value)}
            className={cn(
              'text-xs gap-1.5',
              statusFilter === tab.value
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full',
              statusFilter === tab.value ? 'bg-primary-foreground/20' : 'bg-muted'
            )}>
              {getCountForStatus(tab.value)}
            </span>
          </Button>
          ))}
        </div>
      </div>

      {emailTemplates.length === 0 && (
        <p className="text-sm text-muted-foreground">Create an email template first to start a sequence.</p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading sequences...</div>
        </div>
      ) : sequences.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center border border-dashed border-border rounded-lg">
          <Repeat className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            {leadSearch.trim() ? 'No sequences match your search' : statusFilter !== 'all' ? `No ${statusFilter} sequences` : 'No sequences yet'}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Send</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sequences.map((seq) => (
                  <TableRow key={seq.id}>
                    <TableCell className="font-medium text-foreground max-w-[180px] truncate">{seq.name || '—'}</TableCell>
                    <TableCell className="text-foreground max-w-[180px] truncate">{getLeadName(seq.lead_id)}</TableCell>
                    <TableCell className="text-muted-foreground">{seq.current_step}/{seq.steps?.length || seq.max_followups}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor[seq.status]}>
                        {statusIcon[seq.status]}
                        <span className="ml-1 capitalize">{seq.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {seq.next_send_at && seq.status === 'active'
                        ? format(new Date(seq.next_send_at), 'MMM d, h:mm a')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {seq.status === 'active' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateSequenceStatus.mutate({ id: seq.id, status: 'paused' })}>
                              <Pause className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateSequenceStatus.mutate({ id: seq.id, status: 'replied' })}>
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {seq.status === 'paused' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateSequenceStatus.mutate({ id: seq.id, status: 'active' })}>
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirmId(seq.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-xs">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create Sequence Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Start Email Sequence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sequence Name</Label>
              <Input
                placeholder="e.g. Q1 Follow-up Campaign"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label>Leads ({formData.lead_ids.length} selected)</Label>
              <div className="flex gap-1 mb-2 flex-wrap">
                {(['all', 'eros', 'noms'] as const).map((p) => (
                  <Button
                    key={p}
                    variant="ghost"
                    size="sm"
                    onClick={() => setLeadPlatformFilter(p)}
                    className={cn(
                      'text-xs',
                      leadPlatformFilter === p
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2 mb-2">
                <select
                  value={leadCityFilter}
                  onChange={(e) => setLeadCityFilter(e.target.value)}
                  className="h-8 text-xs rounded-md border border-border bg-secondary px-2 text-foreground flex-1"
                >
                  <option value="">All Cities</option>
                  {uniqueCities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <Input
                  placeholder="Filter by email..."
                  value={leadEmailSearch}
                  onChange={(e) => setLeadEmailSearch(e.target.value)}
                  className="h-8 text-xs bg-secondary border-border flex-1"
                />
              </div>
              <div className="border border-border rounded-lg bg-secondary">
                <label className="flex items-center gap-2 p-2 border-b border-border cursor-pointer hover:bg-background/50 text-sm font-medium">
                  <Checkbox
                    checked={filteredLeads.length > 0 && filteredLeads.every((l) => formData.lead_ids.includes(l.id))}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const newIds = new Set([...formData.lead_ids, ...filteredLeads.map((l) => l.id)]);
                        setFormData({ ...formData, lead_ids: Array.from(newIds) });
                      } else {
                        const removeIds = new Set(filteredLeads.map((l) => l.id));
                        setFormData({ ...formData, lead_ids: formData.lead_ids.filter((id) => !removeIds.has(id)) });
                      }
                    }}
                  />
                  <span className="text-foreground">Select All ({filteredLeads.length})</span>
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1 p-2">
                  {filteredLeads.map((l) => {
                    const isSelected = formData.lead_ids.includes(l.id);
                    return (
                      <label
                        key={l.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-background/50 text-sm ${
                          isSelected ? 'bg-background' : ''
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            setFormData({
                              ...formData,
                              lead_ids: checked
                                ? [...formData.lead_ids, l.id]
                                : formData.lead_ids.filter((id) => id !== l.id),
                            });
                          }}
                        />
                        <span className="text-foreground">{l.business_name}</span>
                        <span className="text-muted-foreground text-xs ml-auto">{l.email}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Steps</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddStep}>
                  <Plus className="h-3 w-3 mr-1" /> Add Step
                </Button>
              </div>
              {formData.steps.map((step, idx) => (
                <SequenceStepForm
                  key={idx}
                  step={step}
                  stepIndex={idx}
                  templates={emailTemplates}
                  onChange={handleStepChange}
                  onRemove={handleRemoveStep}
                  canRemove={formData.steps.length > 1}
                />
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button
                onClick={handleCreate}
                disabled={formData.lead_ids.length === 0 || !formData.name.trim() || formData.steps.some((s) => !s.template_id) || createSequence.isPending}
              >
                {createSequence.isPending ? 'Starting...' : `Start Sequence (${formData.lead_ids.length} lead${formData.lead_ids.length !== 1 ? 's' : ''})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sequence</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this sequence? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  deleteSequence.mutate(deleteConfirmId, {
                    onSuccess: () => setDeleteConfirmId(null),
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
