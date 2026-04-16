import { useState, useMemo } from 'react';
import { useInfluencers, Influencer } from '@/hooks/useInfluencers';
import { Lead } from '@/types/lead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ViewToggle, ViewMode } from '@/components/ViewToggle';
import { InfluencerFilters, InfluencerContactFilter, InfluencerDateRange } from '@/components/InfluencerFilters';
import { InfluencerImport } from '@/components/InfluencerImport';
import { BulkMessage } from '@/components/BulkMessage';
import {
  Plus,
  Users,
  TrendingUp,
  Instagram,
  Trash2,
  ExternalLink,
  Mail,
  Globe,
  MessageCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Send,
  Repeat,
} from 'lucide-react';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function contentTypeLabel(ct: string): string {
  const map: Record<string, string> = {
    food_reviews: '🍽️ Reviews',
    recipes: '👨‍🍳 Recipes',
    restaurant_tours: '🗺️ Tours',
    food_photography: '📸 Photography',
    mukbang: '🍜 Mukbang',
    mixed: '🎨 Mixed',
  };
  return map[ct] || ct;
}

/** Map an Influencer to a Lead-compatible shape for BulkMessage / QuickMessage */
function influencerToLead(inf: Influencer): Lead {
  return {
    id: inf.id,
    user_id: inf.user_id,
    business_name: inf.full_name || `@${inf.username}`,
    owner_name: inf.full_name || null,
    email: inf.email || null,
    instagram_handle: inf.username,
    website: inf.website || null,
    address: null,
    category: inf.niche || null,
    city: inf.city || null,
    phone: null,
    platform: 'eros',
    status: 'new',
    email_engagement: 'none',
    notes: inf.notes || null,
    created_at: inf.created_at,
    updated_at: inf.updated_at,
    last_outreach_date: null,
    next_outreach_date: null,
    assigned_user_id: null,
    group_id: null,
  };
}

function InfluencerCard({
  influencer,
  onDelete,
  selected,
  onToggleSelect,
}: {
  influencer: Influencer;
  onDelete: (id: string) => void;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  return (
    <Card className={`group hover:shadow-lg transition-shadow ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Checkbox checked={selected} onCheckedChange={onToggleSelect} />
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {influencer.full_name?.[0] || influencer.username[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{influencer.full_name || `@${influencer.username}`}</h3>
                <Instagram className="h-4 w-4" />
              </div>
              <p className="text-sm text-muted-foreground">@{influencer.username}</p>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {influencer.profile_url && (
              <Button variant="ghost" size="icon" asChild>
                <a href={influencer.profile_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => onDelete(influencer.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        {influencer.bio && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{influencer.bio}</p>
        )}

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center p-2 rounded-md bg-muted/50">
            <p className="text-lg font-bold text-foreground">{formatNumber(influencer.followers_count)}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="text-center p-2 rounded-md bg-muted/50">
            <p className="text-lg font-bold text-foreground">{influencer.engagement_rate}%</p>
            <p className="text-xs text-muted-foreground">Engagement</p>
          </div>
          <div className="text-center p-2 rounded-md bg-muted/50">
            <p className="text-lg font-bold text-foreground">{formatNumber(influencer.posts_count)}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge variant="secondary">{contentTypeLabel(influencer.content_type)}</Badge>
          <Badge variant="outline">{influencer.niche}</Badge>
          {influencer.city && <Badge variant="outline">{influencer.city}</Badge>}
          <Badge variant="outline" className="capitalize">{influencer.status}</Badge>
        </div>

        <div className="flex gap-2 text-xs text-muted-foreground">
          {influencer.email && (
            <a href={`mailto:${influencer.email}`} className="flex items-center gap-1 hover:text-primary transition-colors">
              <Mail className="h-3 w-3" /> Email
            </a>
          )}
          {influencer.website && (
            <a href={influencer.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
              <Globe className="h-3 w-3" /> Website
            </a>
          )}
          {influencer.contact_method && (
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> {influencer.contact_method}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface InfluencerLeadTabProps {
  onSequenceRequest?: (leadIds: string[]) => void;
}

export function InfluencerLeadTab({ onSequenceRequest }: InfluencerLeadTabProps) {
  const { influencers, isLoading, discoverInfluencers, addInfluencer, deleteInfluencer } = useInfluencers();
  const [search, setSearch] = useState('');
  const [discoverQuery, setDiscoverQuery] = useState('Toronto food influencers');
  const [discoverCity, setDiscoverCity] = useState('Toronto');
  const [manualUsername, setManualUsername] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMessageOpen, setBulkMessageOpen] = useState(false);

  // Filter state
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [nicheFilters, setNicheFilters] = useState<string[]>([]);
  const [cityFilters, setCityFilters] = useState<string[]>([]);
  const [contentTypeFilters, setContentTypeFilters] = useState<string[]>([]);
  const [contactFilters, setContactFilters] = useState<InfluencerContactFilter[]>([]);
  const [dateRange, setDateRange] = useState<InfluencerDateRange>({});

  const isDiscovering = discoverInfluencers.isPending;
  const isAdding = addInfluencer.isPending;

  const niches = useMemo(() => [...new Set(influencers.map(i => i.niche).filter(Boolean))].sort(), [influencers]);
  const cities = useMemo(() => [...new Set(influencers.map(i => i.city).filter(Boolean) as string[])].sort(), [influencers]);

  const filtered = useMemo(() => {
    return influencers.filter((i) => {
      if (search.trim()) {
        const s = search.toLowerCase();
        const matchesSearch =
          i.username.toLowerCase().includes(s) ||
          (i.full_name && i.full_name.toLowerCase().includes(s)) ||
          (i.city && i.city.toLowerCase().includes(s)) ||
          (i.niche && i.niche.toLowerCase().includes(s)) ||
          (i.email && i.email.toLowerCase().includes(s));
        if (!matchesSearch) return false;
      }
      if (statusFilters.length > 0 && !statusFilters.includes(i.status)) return false;
      if (nicheFilters.length > 0 && (!i.niche || !nicheFilters.includes(i.niche))) return false;
      if (cityFilters.length > 0 && (!i.city || !cityFilters.includes(i.city))) return false;
      if (contentTypeFilters.length > 0 && !contentTypeFilters.includes(i.content_type)) return false;
      if (contactFilters.length > 0) {
        const match = contactFilters.some((f) => {
          if (f === 'has_email') return !!i.email;
          if (f === 'no_email') return !i.email;
          if (f === 'has_website') return !!i.website;
          if (f === 'no_website') return !i.website;
          return false;
        });
        if (!match) return false;
      }
      if (dateRange.from || dateRange.to) {
        const created = new Date(i.created_at);
        if (dateRange.from && created < dateRange.from) return false;
        if (dateRange.to) {
          const endOfDay = new Date(dateRange.to);
          endOfDay.setHours(23, 59, 59, 999);
          if (created > endOfDay) return false;
        }
      }
      return true;
    });
  }, [influencers, search, statusFilters, nicheFilters, cityFilters, contentTypeFilters, contactFilters, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = {
    total: influencers.length,
    avgEngagement: influencers.length
      ? (influencers.reduce((s, i) => s + Number(i.engagement_rate), 0) / influencers.length).toFixed(1)
      : '0',
    totalReach: influencers.reduce((s, i) => s + i.followers_count, 0),
    withEmail: influencers.filter((i) => i.email).length,
  };

  const handleDiscover = () => {
    discoverInfluencers.mutate({ query: discoverQuery, platform: 'instagram', city: discoverCity });
  };

  const handleAdd = () => {
    if (!manualUsername.trim()) return;
    addInfluencer.mutate(
      { username: manualUsername.trim(), platform: 'instagram' },
      { onSuccess: () => { setManualUsername(''); setAddDialogOpen(false); } }
    );
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilters([]);
    setNicheFilters([]);
    setCityFilters([]);
    setContentTypeFilters([]);
    setContactFilters([]);
    setDateRange({});
    setCurrentPage(1);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filtered.map((i) => i.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const isAllSelected = filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id));

  const selectedInfluencersAsLeads = useMemo(
    () => influencers.filter((i) => selectedIds.has(i.id)).map(influencerToLead),
    [influencers, selectedIds]
  );

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total Influencers</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold text-foreground">{stats.avgEngagement}%</p>
          <p className="text-xs text-muted-foreground">Avg Engagement</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold text-foreground">{formatNumber(stats.totalReach)}</p>
          <p className="text-xs text-muted-foreground">Total Reach</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Mail className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold text-foreground">{stats.withEmail}</p>
          <p className="text-xs text-muted-foreground">Have Email</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <InfluencerFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
        statusFilters={statusFilters}
        onStatusFiltersChange={(v) => { setStatusFilters(v); setCurrentPage(1); }}
        nicheFilters={nicheFilters}
        onNicheFiltersChange={(v) => { setNicheFilters(v); setCurrentPage(1); }}
        niches={niches}
        cityFilters={cityFilters}
        onCityFiltersChange={(v) => { setCityFilters(v); setCurrentPage(1); }}
        cities={cities}
        contentTypeFilters={contentTypeFilters}
        onContentTypeFiltersChange={(v) => { setContentTypeFilters(v); setCurrentPage(1); }}
        contactFilters={contactFilters}
        onContactFiltersChange={(v) => { setContactFilters(v); setCurrentPage(1); }}
        dateRange={dateRange}
        onDateRangeChange={(v) => { setDateRange(v); setCurrentPage(1); }}
        onReset={resetFilters}
      />

      {/* Discovery + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <Input
            placeholder="Discover query..."
            value={discoverQuery}
            onChange={(e) => setDiscoverQuery(e.target.value)}
            className="w-full sm:w-52"
          />
          <Input
            placeholder="City"
            value={discoverCity}
            onChange={(e) => setDiscoverCity(e.target.value)}
            className="w-28"
          />
          <Button onClick={handleDiscover} disabled={isDiscovering} variant="outline">
            {isDiscovering ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Searching...</> : 'Discover'}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <InfluencerImport />
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Influencer by Handle</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <Input
                  placeholder="@username"
                  value={manualUsername}
                  onChange={(e) => setManualUsername(e.target.value)}
                />
                <Button onClick={handleAdd} disabled={isAdding} className="w-full">
                  {isAdding ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enriching...</> : 'Add & Enrich'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bulk Selection Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 flex-wrap">
          <span className="text-sm text-foreground font-medium">
            {selectedIds.size} influencer{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={selectAllFiltered}
          >
            Select All {filtered.length} Filtered
          </Button>
          <Button
            size="sm"
            onClick={() => setBulkMessageOpen(true)}
          >
            <Send className="h-4 w-4 mr-2" />
            Send Email
          </Button>
          {onSequenceRequest && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onSequenceRequest(Array.from(selectedIds));
                clearSelection();
              }}
            >
              <Repeat className="h-4 w-4 mr-2" />
              Create Sequence
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={clearSelection}
            className="text-muted-foreground"
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">No influencers found</h3>
          <p className="text-sm text-muted-foreground">
            {search || statusFilters.length > 0 ? 'Try adjusting your filters' : 'Use Discover, Import, or Add to get started'}
          </p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paginated.map((inf) => (
            <InfluencerCard
              key={inf.id}
              influencer={inf}
              onDelete={(id) => deleteInfluencer.mutate(id)}
              selected={selectedIds.has(inf.id)}
              onToggleSelect={() => toggleSelect(inf.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={(checked) => {
                      if (checked) selectAllFiltered();
                      else clearSelection();
                    }}
                  />
                </TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Followers</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Content Type</TableHead>
                <TableHead>Niche</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((inf) => (
                <TableRow key={inf.id} className={selectedIds.has(inf.id) ? 'bg-primary/5' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(inf.id)}
                      onCheckedChange={() => toggleSelect(inf.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>@{inf.username}</span>
                      {inf.profile_url && (
                        <a href={inf.profile_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                    {inf.full_name && <p className="text-xs text-muted-foreground">{inf.full_name}</p>}
                  </TableCell>
                  <TableCell>{formatNumber(inf.followers_count)}</TableCell>
                  <TableCell>{inf.engagement_rate}%</TableCell>
                  <TableCell><Badge variant="secondary">{contentTypeLabel(inf.content_type)}</Badge></TableCell>
                  <TableCell>{inf.niche}</TableCell>
                  <TableCell>{inf.city}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{inf.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {inf.email && <a href={`mailto:${inf.email}`}><Mail className="h-4 w-4 text-muted-foreground hover:text-primary" /></a>}
                      {inf.website && <a href={inf.website} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4 text-muted-foreground hover:text-primary" /></a>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteInfluencer.mutate(inf.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {filtered.length > pageSize && (
        <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
          <span className="text-sm text-muted-foreground">
            {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
          </span>
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

      {/* Bulk Message Dialog */}
      <BulkMessage
        open={bulkMessageOpen}
        onOpenChange={setBulkMessageOpen}
        leads={selectedInfluencersAsLeads}
        onComplete={clearSelection}
      />
    </div>
  );
}
