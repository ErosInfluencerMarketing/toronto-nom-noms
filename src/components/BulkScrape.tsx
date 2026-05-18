import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LeadFormData, Platform } from '@/types/lead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Zap } from 'lucide-react';

interface BulkScrapeProps {
  onImport: (leads: LeadFormData[]) => Promise<void>;
  activeTab?: 'restaurants' | 'fitness';
}

const PRESETS: Record<string, string[]> = {
  restaurants: [
    'restaurants', 'cafes', 'bars', 'brunch spots', 'fine dining',
    'Italian restaurants', 'Asian restaurants', 'Japanese restaurants',
    'Thai restaurants', 'Mexican restaurants', 'pizza', 'burger joints',
    'bakeries', 'dessert shops', 'wine bars', 'cocktail bars',
  ],
  fitness: [
    'gyms', 'CrossFit boxes', 'yoga studios', 'pilates studios',
    'boxing gyms', 'martial arts studios', 'spin studios',
    'personal training studios', 'supplement stores',
  ],
};

export function BulkScrape({ onImport, activeTab = 'restaurants' }: BulkScrapeProps) {
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState('Sydney');
  const [platform, setPlatform] = useState<Platform>(activeTab === 'fitness' ? 'fitness' : 'noms');
  const [queriesText, setQueriesText] = useState(PRESETS[activeTab].join('\n'));
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, found: 0, imported: 0, currentQuery: '' });

  const platforms = activeTab === 'fitness'
    ? [{ value: 'fitness', label: 'Fitness' }]
    : [{ value: 'noms', label: 'Noms' }, { value: 'eros', label: 'Eros' }];

  const handleRun = async () => {
    const queries = queriesText.split('\n').map((q) => q.trim()).filter(Boolean);
    if (queries.length === 0) {
      toast.error('Add at least one search query');
      return;
    }
    if (!location.trim()) {
      toast.error('Enter a location');
      return;
    }

    setRunning(true);
    setProgress({ current: 0, total: queries.length, found: 0, imported: 0, currentQuery: '' });

    let totalFound = 0;
    let totalImported = 0;
    const seenKeys = new Set<string>();

    for (let i = 0; i < queries.length; i++) {
      const q = queries[i];
      setProgress((p) => ({ ...p, current: i, currentQuery: q }));

      try {
        const { data, error } = await supabase.functions.invoke('scrape-google-maps', {
          body: { query: q, location: location.trim(), mode: activeTab },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Scrape failed');

        const businesses = (data.businesses || []) as Array<Record<string, string>>;
        totalFound += businesses.length;

        const leads: LeadFormData[] = businesses
          .filter((biz) => {
            const key = `${(biz.business_name || '').toLowerCase().trim()}|${(biz.address || '').toLowerCase().trim()}`;
            if (!biz.business_name || seenKeys.has(key)) return false;
            seenKeys.add(key);
            return true;
          })
          .map((biz) => ({
            business_name: biz.business_name,
            owner_name: undefined,
            email: biz.email || undefined,
            instagram_handle: biz.instagram_handle || undefined,
            website: biz.website || undefined,
            address: biz.address || undefined,
            category: biz.category || undefined,
            city: location.trim() || undefined,
            platform,
            status: 'new' as const,
            notes: [
              biz.phone_number && `Phone: ${biz.phone_number}`,
              biz.rating && `Rating: ${biz.rating}`,
              biz.price_range && `Price: ${biz.price_range}`,
            ].filter(Boolean).join('\n'),
          }));

        if (leads.length > 0) {
          try {
            await onImport(leads);
            totalImported += leads.length;
          } catch (e) {
            console.error('Import batch failed:', e);
          }
        }

        setProgress((p) => ({ ...p, found: totalFound, imported: totalImported }));
      } catch (e) {
        console.error(`Query "${q}" failed:`, e);
        toast.error(`"${q}" failed — continuing`);
      }
    }

    setProgress((p) => ({ ...p, current: queries.length, currentQuery: '' }));
    setRunning(false);
    toast.success(`Bulk scrape done — imported ${totalImported} unique leads from ${queries.length} queries`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !running && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="outline" className="shrink-0">
          <Zap className="h-4 w-4 mr-2" />
          Bulk Scrape
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Bulk Scrape Queries
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bulk-location">Location</Label>
              <Input
                id="bulk-location"
                placeholder="Sydney"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={running}
              />
            </div>
            {platforms.length > 1 && (
              <div>
                <Label>Platform</Label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)} disabled={running}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {platforms.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="bulk-queries">Search Queries (one per line)</Label>
            <Textarea
              id="bulk-queries"
              value={queriesText}
              onChange={(e) => setQueriesText(e.target.value)}
              rows={10}
              disabled={running}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Each line is appended to the location. Duplicates across queries are auto-filtered.
            </p>
          </div>

          {running && (
            <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress.current} / {progress.total} queries</span>
                <span>{progress.imported} imported · {progress.found} found</span>
              </div>
              <Progress value={(progress.current / Math.max(progress.total, 1)) * 100} />
              {progress.currentQuery && (
                <p className="text-xs text-foreground truncate">
                  Scraping: <span className="font-medium">{progress.currentQuery}</span> in {location}
                </p>
              )}
            </div>
          )}

          <Button onClick={handleRun} disabled={running} className="w-full">
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            {running ? 'Running...' : `Run ${queriesText.split('\n').filter((q) => q.trim()).length} Queries`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
