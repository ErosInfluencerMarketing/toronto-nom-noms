import { useState } from 'react';
import { useInfluencers, Influencer } from '@/hooks/useInfluencers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
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
} from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

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

function platformIcon(platform: string) {
  if (platform === 'tiktok') return <span className="text-base">📱</span>;
  return <Instagram className="h-4 w-4" />;
}

function InfluencerCard({ influencer, onDelete }: { influencer: Influencer; onDelete: (id: string) => void }) {
  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {influencer.full_name?.[0] || influencer.username[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{influencer.full_name || `@${influencer.username}`}</h3>
                {platformIcon(influencer.platform)}
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

export default function Influencers() {
  const { influencers, isLoading, discoverInfluencers, addInfluencer, deleteInfluencer } = useInfluencers();
  const [searchQuery, setSearchQuery] = useState('Toronto food influencers');
  const [platform, setPlatform] = useState('instagram');
  const [city, setCity] = useState('Toronto');
  const [manualUsername, setManualUsername] = useState('');
  const [manualPlatform, setManualPlatform] = useState('instagram');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [view, setView] = useState<'cards' | 'table'>('cards');

  const isDiscovering = discoverInfluencers.isPending;
  const isAdding = addInfluencer.isPending;

  const handleDiscover = () => {
    discoverInfluencers.mutate({ query: searchQuery, platform, city });
  };

  const handleAdd = () => {
    if (!manualUsername.trim()) return;
    addInfluencer.mutate(
      { username: manualUsername.trim(), platform: manualPlatform },
      { onSuccess: () => { setManualUsername(''); setAddDialogOpen(false); } }
    );
  };

  const handleDelete = (id: string) => {
    deleteInfluencer.mutate(id);
  };

  const stats = {
    total: influencers.length,
    avgEngagement: influencers.length
      ? (influencers.reduce((s, i) => s + Number(i.engagement_rate), 0) / influencers.length).toFixed(1)
      : '0',
    totalReach: influencers.reduce((s, i) => s + i.followers_count, 0),
    withEmail: influencers.filter(i => i.email).length,
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Influencers</h1>
                <p className="text-muted-foreground">Discover and manage food influencers</p>
              </div>
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" /> Add Influencer</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Influencer by Handle</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <Input
                      placeholder="@username"
                      value={manualUsername}
                      onChange={e => setManualUsername(e.target.value)}
                    />
                    <Select value={manualPlatform} onValueChange={setManualPlatform}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAdd} disabled={isAdding} className="w-full">
                      {isAdding ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enriching...</> : 'Add & Enrich'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats */}
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

            {/* Discovery */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Discover Influencers</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="e.g. Toronto food bloggers"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="City" value={city} onChange={e => setCity(e.target.value)} className="w-[140px]" />
                  <Button onClick={handleDiscover} disabled={isDiscovering}>
                    {isDiscovering ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Searching...</> : <><Search className="h-4 w-4 mr-2" /> Discover</>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="cards">Cards</TabsTrigger>
                  <TabsTrigger value="table">Table</TabsTrigger>
                </TabsList>
                <p className="text-sm text-muted-foreground">{influencers.length} influencers</p>
              </div>

              <TabsContent value="cards">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : influencers.length === 0 ? (
                  <Card><CardContent className="py-12 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">No influencers yet</p>
                    <p className="text-sm">Use the discovery tool above or add influencers manually</p>
                  </CardContent></Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {influencers.map(inf => (
                      <InfluencerCard key={inf.id} influencer={inf} onDelete={handleDelete} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="table">
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Followers</TableHead>
                        <TableHead>Engagement</TableHead>
                        <TableHead>Content Type</TableHead>
                        <TableHead>Niche</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {influencers.map(inf => (
                        <TableRow key={inf.id}>
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
                          <TableCell>{inf.platform}</TableCell>
                          <TableCell>{formatNumber(inf.followers_count)}</TableCell>
                          <TableCell>{inf.engagement_rate}%</TableCell>
                          <TableCell><Badge variant="secondary">{contentTypeLabel(inf.content_type)}</Badge></TableCell>
                          <TableCell>{inf.niche}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {inf.email && <a href={`mailto:${inf.email}`}><Mail className="h-4 w-4 text-muted-foreground hover:text-primary" /></a>}
                              {inf.website && <a href={inf.website} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4 text-muted-foreground hover:text-primary" /></a>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(inf.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
