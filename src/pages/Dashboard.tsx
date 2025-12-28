import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLeads } from '@/hooks/useLeads';
import { Lead, LeadFormData, LeadStatus, Platform } from '@/types/lead';
import { LeadCard } from '@/components/LeadCard';
import { LeadForm } from '@/components/LeadForm';
import { LeadFilters } from '@/components/LeadFilters';
import { StatsCard } from '@/components/StatsCard';
import { Button } from '@/components/ui/button';
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
import { Plus, LogOut, MapPin, Users, Phone, Calendar, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { leads, isLoading, createLead, updateLead, deleteLead } = useLeads();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        search === '' ||
        lead.business_name.toLowerCase().includes(search.toLowerCase()) ||
        (lead.instagram_handle && lead.instagram_handle.toLowerCase().includes(search.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchesPlatform = platformFilter === 'all' || lead.platform === platformFilter;
      
      return matchesSearch && matchesStatus && matchesPlatform;
    });
  }, [leads, search, statusFilter, platformFilter]);

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    demoBooked: leads.filter((l) => l.status === 'demo_booked').length,
    onboarded: leads.filter((l) => l.status === 'onboarded').length,
  }), [leads]);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatsCard
            title="Total Leads"
            value={stats.total}
            icon={Users}
            iconClassName="bg-primary/10 text-primary"
          />
          <StatsCard
            title="New"
            value={stats.new}
            icon={Plus}
            iconClassName="bg-status-new/10 text-status-new"
          />
          <StatsCard
            title="Contacted"
            value={stats.contacted}
            icon={Phone}
            iconClassName="bg-status-contacted/10 text-status-contacted"
          />
          <StatsCard
            title="Demo Booked"
            value={stats.demoBooked}
            icon={Calendar}
            iconClassName="bg-status-demo/10 text-status-demo"
          />
          <StatsCard
            title="Onboarded"
            value={stats.onboarded}
            icon={CheckCircle}
            iconClassName="bg-status-onboarded/10 text-status-onboarded"
          />
        </div>

        {/* Filters and Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <LeadFilters
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            platformFilter={platformFilter}
            onPlatformFilterChange={setPlatformFilter}
          />
          
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

        {/* Leads Grid */}
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
              {search || statusFilter !== 'all' || platformFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first lead'}
            </p>
            {!search && statusFilter === 'all' && platformFilter === 'all' && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Lead
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteConfirmId(id)}
              />
            ))}
          </div>
        )}
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
    </div>
  );
}
