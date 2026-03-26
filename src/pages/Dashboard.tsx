import { useState, useMemo, useEffect, useRef } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLeads } from '@/hooks/useLeads';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useSequences } from '@/hooks/useSequences';
import { Lead, LeadFormData, LeadStatus, Platform } from '@/types/lead';
import { LeadCard } from '@/components/LeadCard';
import { LeadForm } from '@/components/LeadForm';
import { LeadFilters, DateRange, SequenceFilter, EngagementFilter } from '@/components/LeadFilters';
import { LeadListView } from '@/components/LeadListView';
import { UpcomingOutreach } from '@/components/UpcomingOutreach';
import { AnalyticsPanel } from '@/components/AnalyticsPanel';
import { ViewToggle, ViewMode } from '@/components/ViewToggle';
import { TemplatesSection } from '@/components/TemplatesSection';
import { SequencesSection } from '@/components/SequencesSection';
import { LeadImport } from '@/components/LeadImport';
import { LeadScraper } from '@/components/LeadScraper';
import { BulkMessage } from '@/components/BulkMessage';
import { AssignLeadsDialog } from '@/components/AssignLeadsDialog';
import { LeadDetailsPanel } from '@/components/LeadDetailsPanel';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Plus, LogOut, MapPin, Users, Download, RefreshCw, Send, UserCheck, ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const exportLeadsToCSV = (leads: Lead[]) => {
  const headers = [
    'Business Name',
    'Owner Name',
    'Email',
    'Instagram Handle',
    'Website',
    'Address',
    'Category',
    'Platform',
    'Status',
    'Next Outreach Date',
    'Last Outreach Date',
    'Notes',
    'Created At',
  ];

  const rows = leads.map((lead) => [
    lead.business_name,
    lead.owner_name || '',
    lead.email || '',
    lead.instagram_handle || '',
    lead.website || '',
    lead.address || '',
    lead.category || '',
    lead.platform,
    lead.status,
    lead.next_outreach_date || '',
    lead.last_outreach_date || '',
    (lead.notes || '').replace(/"/g, '""'),
    format(new Date(lead.created_at), 'yyyy-MM-dd'),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `leads-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success('Leads exported successfully');
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const { leads, isLoading, createLead, updateLead, deleteLead, bulkCreateLeads } = useLeads();
  const { members } = useTeamMembers();
  const { sequences, statusCounts } = useSequences();
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem('dashboard_viewMode') as ViewMode) || 'card');
  
  const [search, setSearch] = useState('');
  const [statusFilters, setStatusFilters] = useState<LeadStatus[]>(() => {
    try { const v = localStorage.getItem('dashboard_statusFilters'); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const [platformFilters, setPlatformFilters] = useState<Platform[]>(() => {
    try { const v = localStorage.getItem('dashboard_platformFilters'); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const [categoryFilters, setCategoryFilters] = useState<string[]>(() => {
    try { const v = localStorage.getItem('dashboard_categoryFilters'); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const [cityFilters, setCityFilters] = useState<string[]>(() => {
    try { const v = localStorage.getItem('dashboard_cityFilters'); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const [contactFilters, setContactFilters] = useState<import('@/components/LeadFilters').ContactFilter[]>(() => {
    try { const v = localStorage.getItem('dashboard_contactFilters'); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [assignedFilters, setAssignedFilters] = useState<string[]>(() => {
    try { const v = localStorage.getItem('dashboard_assignedFilters'); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const [sequenceFilters, setSequenceFilters] = useState<SequenceFilter[]>(() => {
    try { const v = localStorage.getItem('dashboard_sequenceFilters'); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const [engagementFilters, setEngagementFilters] = useState<EngagementFilter[]>(() => {
    try { const v = localStorage.getItem('dashboard_engagementFilters'); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [bulkMessageOpen, setBulkMessageOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [detailsLead, setDetailsLead] = useState<Lead | null>(null);
  const [sequencePreSelectedLeadIds, setSequencePreSelectedLeadIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(() => Number(localStorage.getItem('dashboard_page')) || 1);
  const [pageSize, setPageSize] = useState(() => Number(localStorage.getItem('dashboard_pageSize')) || 100);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    leads.forEach((lead) => {
      if (lead.category) cats.add(lead.category);
    });
    return Array.from(cats).sort();
  }, [leads]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((lead) => {
      if (lead.city) set.add(lead.city);
    });
    return Array.from(set).sort();
  }, [leads]);

  const assignedOptions = useMemo(() => {
    return members.map((m) => ({
      value: m.id,
      label: m.full_name || m.email || m.id.slice(0, 8),
    }));
  }, [members]);

  const leadIdsInSequence = useMemo(() => {
    const ids = new Set<string>();
    sequences.forEach((seq) => ids.add(seq.lead_id));
    return ids;
  }, [sequences]);

  const filteredLeads = useMemo(() => {
    const s = search.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesSearch =
        s === '' ||
        (lead.business_name && lead.business_name.toLowerCase().includes(s)) ||
        (lead.owner_name && lead.owner_name.toLowerCase().includes(s)) ||
        (lead.instagram_handle && lead.instagram_handle.toLowerCase().includes(s)) ||
        (lead.email && lead.email.toLowerCase().includes(s)) ||
        (lead.category && lead.category.toLowerCase().includes(s)) ||
        (lead.city && lead.city.toLowerCase().includes(s));
      
      const matchesStatus = statusFilters.length === 0 || statusFilters.includes(lead.status);
      const matchesPlatform = platformFilters.length === 0 || platformFilters.includes(lead.platform);
      const matchesCategory = categoryFilters.length === 0 || (lead.category && categoryFilters.includes(lead.category));
      const matchesCity = cityFilters.length === 0 || (lead.city && cityFilters.includes(lead.city));
      const matchesAssigned = assignedFilters.length === 0 || (lead.assigned_user_id && assignedFilters.includes(lead.assigned_user_id));

      let matchesContact = true;
      if (contactFilters.length > 0) {
        const hasEmail = !!lead.email;
        const hasIg = !!lead.instagram_handle;
        matchesContact = contactFilters.some((f) => {
          if (f === 'both') return hasEmail && hasIg;
          if (f === 'email_only') return hasEmail && !hasIg;
          if (f === 'instagram_only') return !hasEmail && hasIg;
          if (f === 'neither') return !hasEmail && !hasIg;
          return false;
        });
      }

      let matchesDate = true;
      if (dateRange.from || dateRange.to) {
        const createdAt = new Date(lead.created_at);
        if (dateRange.from) {
          const fromStart = new Date(dateRange.from);
          fromStart.setHours(0, 0, 0, 0);
          if (createdAt < fromStart) matchesDate = false;
        }
        if (dateRange.to) {
          const toEnd = new Date(dateRange.to);
          toEnd.setHours(23, 59, 59, 999);
          if (createdAt > toEnd) matchesDate = false;
        }
      }
      
      let matchesSequence = true;
      if (sequenceFilters.length > 0) {
        const inSeq = leadIdsInSequence.has(lead.id);
        matchesSequence = sequenceFilters.some((f) => {
          if (f === 'in_sequence') return inSeq;
          if (f === 'not_in_sequence') return !inSeq;
          return false;
        });
      }
      
      let matchesEngagement = true;
      if (engagementFilters.length > 0) {
        matchesEngagement = engagementFilters.includes((lead as any).email_engagement || 'none');
      }
      
      return matchesSearch && matchesStatus && matchesPlatform && matchesCategory && matchesCity && matchesContact && matchesAssigned && matchesDate && matchesSequence && matchesEngagement;
    });
  }, [leads, search, statusFilters, platformFilters, categoryFilters, cityFilters, contactFilters, assignedFilters, sequenceFilters, engagementFilters, leadIdsInSequence, dateRange]);

  // Persist filter state to localStorage
  useEffect(() => { localStorage.setItem('dashboard_viewMode', viewMode); }, [viewMode]);
  // Search is intentionally not persisted to localStorage to avoid stale filter state
  useEffect(() => { localStorage.setItem('dashboard_statusFilters', JSON.stringify(statusFilters)); }, [statusFilters]);
  useEffect(() => { localStorage.setItem('dashboard_platformFilters', JSON.stringify(platformFilters)); }, [platformFilters]);
  useEffect(() => { localStorage.setItem('dashboard_categoryFilters', JSON.stringify(categoryFilters)); }, [categoryFilters]);
  useEffect(() => { localStorage.setItem('dashboard_cityFilters', JSON.stringify(cityFilters)); }, [cityFilters]);
  useEffect(() => { localStorage.setItem('dashboard_contactFilters', JSON.stringify(contactFilters)); }, [contactFilters]);
  useEffect(() => { localStorage.setItem('dashboard_assignedFilters', JSON.stringify(assignedFilters)); }, [assignedFilters]);
  useEffect(() => { localStorage.setItem('dashboard_sequenceFilters', JSON.stringify(sequenceFilters)); }, [sequenceFilters]);
  useEffect(() => { localStorage.setItem('dashboard_engagementFilters', JSON.stringify(engagementFilters)); }, [engagementFilters]);
  useEffect(() => { localStorage.setItem('dashboard_page', String(currentPage)); }, [currentPage]);
  useEffect(() => { localStorage.setItem('dashboard_pageSize', String(pageSize)); }, [pageSize]);

  const filterKey = JSON.stringify([search, statusFilters, platformFilters, categoryFilters, cityFilters, contactFilters, assignedFilters, sequenceFilters, dateRange.from?.getTime(), dateRange.to?.getTime()]);
  const prevFilterKey = useRef(filterKey);
  useEffect(() => {
    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey;
      setCurrentPage(1);
      localStorage.setItem('dashboard_page', '1');
    }
  }, [filterKey]);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilters([]);
    setPlatformFilters([]);
    setCategoryFilters([]);
    setCityFilters([]);
    setContactFilters([]);
    setAssignedFilters([]);
    setSequenceFilters([]);
    setDateRange({});
  };

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  const selectedLeads = useMemo(
    () => filteredLeads.filter((l) => selectedLeadIds.has(l.id)),
    [filteredLeads, selectedLeadIds]
  );

  const handleCreateLead = (data: LeadFormData) => {
    createLead.mutate(data, {
      onSuccess: () => setIsFormOpen(false),
    });
  };

  const handleUpdateLead = (data: LeadFormData) => {
    if (!editingLead) return;
    
    updateLead.mutate({
      id: editingLead.id,
      ...data,
      last_outreach_date: format(new Date(), 'yyyy-MM-dd'),
    }, {
      onSuccess: () => {
        setEditingLead(null);
        setIsFormOpen(false);
      },
    });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      deleteLead.mutate(deleteConfirmId, {
        onSuccess: () => setDeleteConfirmId(null),
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setIsFormOpen(true);
  };

  const handleImportLeads = async (leadsData: LeadFormData[]) => {
    setIsImporting(true);
    try {
      await bulkCreateLeads.mutateAsync(leadsData);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    let totalEnriched = 0;
    const skipIds: string[] = [];
    try {
      for (let i = 0; i < 30; i++) {
        const { data, error } = await supabase.functions.invoke('enrich-leads', {
          body: { skipIds },
        });
        if (error) throw error;
        if (!data?.success) {
          toast.error(data?.error || 'Sync failed');
          break;
        }
        totalEnriched += data.enriched;
        // Track processed lead to avoid re-processing
        if (data.processedId) skipIds.push(data.processedId);
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        
        if (data.total <= 1) break;
        
        toast.info(`Syncing... ${totalEnriched} enriched, ~${data.total - 1} remaining`);
      }
      toast.success(`Sync complete! Found emails for ${totalEnriched} leads`);
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync leads');
    } finally {
      setIsSyncing(false);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <div className="min-h-screen bg-background flex-1 w-full">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="-ml-1" />
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Toronto Leads</h1>
                  <p className="text-xs text-muted-foreground">Restaurant & Coffee Shop CRM</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {user?.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          {/* Analytics and Upcoming Outreach */}
          <div id="analytics" className="scroll-mt-20 grid lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <AnalyticsPanel leads={leads} sequences={sequences} sequenceStatusCounts={statusCounts as any} />
            </div>
            <div className="lg:col-span-1">
              <UpcomingOutreach leads={leads} onEdit={handleEdit} />
            </div>
          </div>

          {/* Filters and Actions */}
          <div id="leads" className="scroll-mt-20 flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 w-full">
          <LeadFilters
            search={search}
            onSearchChange={setSearch}
            statusFilters={statusFilters}
            onStatusFiltersChange={setStatusFilters}
            platformFilters={platformFilters}
            onPlatformFiltersChange={setPlatformFilters}
            categoryFilters={categoryFilters}
            onCategoryFiltersChange={setCategoryFilters}
            categories={categories}
            cityFilters={cityFilters}
            onCityFiltersChange={setCityFilters}
            cities={cities}
            contactFilters={contactFilters}
            onContactFiltersChange={setContactFilters}
            assignedFilters={assignedFilters}
            onAssignedFiltersChange={setAssignedFilters}
            assignedOptions={assignedOptions}
            sequenceFilters={sequenceFilters}
            onSequenceFiltersChange={setSequenceFilters}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onReset={handleResetFilters}
          />
          
          <div className="flex items-center gap-3 flex-wrap">
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            <LeadScraper onImport={handleImportLeads} isLoading={isImporting} />
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={isSyncing || leads.length === 0}
              className="shrink-0"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync'}
            </Button>
            <LeadImport onImport={handleImportLeads} isLoading={isImporting} />
            <Button
              variant="outline"
              onClick={() => exportLeadsToCSV(filteredLeads)}
              disabled={filteredLeads.length === 0}
              className="shrink-0"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={() => {
                setEditingLead(null);
                setIsFormOpen(true);
              }}
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </div>
        </div>

        {/* Bulk selection bar */}
        {selectedLeadIds.size > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20 flex-wrap">
            <span className="text-sm text-foreground font-medium">
              {selectedLeadIds.size} lead{selectedLeadIds.size !== 1 ? 's' : ''} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedLeadIds(new Set(filteredLeads.map((l) => l.id)))}
            >
              Select All {filteredLeads.length} Filtered
            </Button>
            <Button
              size="sm"
              onClick={() => setBulkMessageOpen(true)}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Email
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAssignDialogOpen(true)}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Assign to Member
              </Button>
             )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSequencePreSelectedLeadIds(Array.from(selectedLeadIds));
                setSelectedLeadIds(new Set());
                document.getElementById('sequences')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Repeat className="h-4 w-4 mr-2" />
              Create Sequence
            </Button>
            <Button
              size="sm"
              onClick={() => setSelectedLeadIds(new Set())}
              className="text-muted-foreground"
            >
              Clear selection
            </Button>
          </div>
        )}

        {/* Leads View */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading leads...</div>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No leads found</h3>
            <p className="text-sm text-muted-foreground mb-4">
               {search || statusFilters.length > 0 || platformFilters.length > 0
                ? 'Try adjusting your filters'
                : 'Get started by adding your first lead'}
            </p>
            {!search && statusFilters.length === 0 && platformFilters.length === 0 && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Lead
              </Button>
            )}
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteConfirmId(id)}
                onViewDetails={setDetailsLead}
              />
            ))}
          </div>
        ) : (
          <LeadListView
            leads={paginatedLeads}
            onEdit={handleEdit}
            onDelete={(id) => setDeleteConfirmId(id)}
            onUpdate={(data) => updateLead.mutate(data)}
            selectedIds={selectedLeadIds}
            onSelectionChange={setSelectedLeadIds}
            onViewDetails={setDetailsLead}
          />
        )}

        {/* Pagination Controls */}
        {filteredLeads.length > 0 && (
          <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredLeads.length)} of {filteredLeads.length}
              </span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[80px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="250">250</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
              <span>per page</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <span className="text-sm text-muted-foreground">Page {currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

          {/* Templates Section */}
          <Separator className="my-8" />
          <div id="templates" className="scroll-mt-20">
            <TemplatesSection leads={leads} />
          </div>

          {/* Sequences Section */}
          <Separator className="my-8" />
          <div id="sequences" className="scroll-mt-20">
            <SequencesSection
              leads={leads}
              preSelectedLeadIds={sequencePreSelectedLeadIds}
              onPreSelectedConsumed={() => setSequencePreSelectedLeadIds([])}
            />
          </div>
      </main>

      {/* Lead Form Dialog */}
      <LeadForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingLead(null);
        }}
        onSubmit={editingLead ? handleUpdateLead : handleCreateLead}
        lead={editingLead}
        isLoading={createLead.isPending || updateLead.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Message Dialog */}
      <BulkMessage
        open={bulkMessageOpen}
        onOpenChange={setBulkMessageOpen}
        leads={selectedLeads}
        onComplete={() => setSelectedLeadIds(new Set())}
      />

      {/* Assign Leads Dialog */}
      <AssignLeadsDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        leadIds={Array.from(selectedLeadIds)}
        onAssigned={() => setSelectedLeadIds(new Set())}
      />

      {/* Lead Details Panel */}
      <LeadDetailsPanel
        lead={detailsLead}
        open={!!detailsLead}
        onOpenChange={(open) => !open && setDetailsLead(null)}
      />
      </div>
    </SidebarProvider>
  );
}
