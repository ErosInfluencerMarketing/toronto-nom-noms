import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LeadFormData, Platform } from '@/types/lead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Search, MapPin, Loader2, Globe, Star } from 'lucide-react';

interface ScrapedBusiness {
  business_name: string;
  address?: string;
  phone_number?: string;
  website?: string;
  rating?: string;
  category?: string;
  price_range?: string;
}

interface LeadScraperProps {
  onImport: (leads: LeadFormData[]) => Promise<void>;
  isLoading: boolean;
}

export function LeadScraper({ onImport, isLoading }: LeadScraperProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('Toronto');
  const [platform, setPlatform] = useState<Platform>('noms');
  const [scraping, setScraping] = useState(false);
  const [businesses, setBusinesses] = useState<ScrapedBusiness[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);

  const handleScrape = async () => {
    if (!query.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setScraping(true);
    setBusinesses([]);
    setSelected(new Set());
    setHasSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-google-maps', {
        body: { query: query.trim(), location: location.trim() },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Scraping failed');
      }

      const found: ScrapedBusiness[] = data.businesses || [];
      
      if (found.length === 0) {
        toast.info('No businesses found. Try a different search query.');
      } else {
        setBusinesses(found);
        setSelected(new Set(found.map((_, i) => i)));
        toast.success(`Found ${found.length} businesses`);
      }
    } catch (error) {
      console.error('Scrape error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to scrape. Try again.');
    } finally {
      setScraping(false);
    }
  };

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === businesses.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(businesses.map((_, i) => i)));
    }
  };

  const handleImport = async () => {
    const selectedBusinesses = businesses.filter((_, i) => selected.has(i));
    if (selectedBusinesses.length === 0) {
      toast.error('Select at least one business to import');
      return;
    }

    const leads: LeadFormData[] = selectedBusinesses.map((biz) => ({
      business_name: biz.business_name,
      owner_name: undefined,
      email: undefined,
      instagram_handle: undefined,
      platform,
      status: 'new' as const,
      notes: [
        biz.address && `Address: ${biz.address}`,
        biz.phone_number && `Phone: ${biz.phone_number}`,
        biz.website && `Website: ${biz.website}`,
        biz.rating && `Rating: ${biz.rating}`,
        biz.price_range && `Price: ${biz.price_range}`,
        biz.category && `Category: ${biz.category}`,
      ]
        .filter(Boolean)
        .join('\n'),
    }));

    try {
      await onImport(leads);
      toast.success(`Imported ${leads.length} leads`);
      setOpen(false);
      setBusinesses([]);
      setSelected(new Set());
      setQuery('');
      setHasSearched(false);
    } catch {
      toast.error('Failed to import leads');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="shrink-0">
          <MapPin className="h-4 w-4 mr-2" />
          Scrape Maps
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Scrape Restaurants & Cafes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          {/* Search controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Label htmlFor="scrape-query">Search Query</Label>
              <Input
                id="scrape-query"
                placeholder="e.g. Italian restaurants, coffee shops, sushi bars"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
              />
            </div>
            <div>
              <Label htmlFor="scrape-location">Location</Label>
              <Input
                id="scrape-location"
                placeholder="Toronto"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-40">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="noms">Noms</SelectItem>
                  <SelectItem value="eros">Eros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleScrape} disabled={scraping} className="mt-5">
              {scraping ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {scraping ? 'Scraping...' : 'Search'}
            </Button>
          </div>

          {/* Results */}
          {businesses.length > 0 && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {businesses.length} businesses found · {selected.size} selected
                </span>
                <Button variant="ghost" size="sm" onClick={toggleAll}>
                  {selected.size === businesses.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <ScrollArea className="flex-1 border border-border rounded-lg max-h-[300px]">
                <div className="divide-y divide-border">
                  {businesses.map((biz, i) => (
                    <label
                      key={i}
                      className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selected.has(i)}
                        onCheckedChange={() => toggleSelect(i)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {biz.business_name}
                        </p>
                        {biz.address && (
                          <p className="text-xs text-muted-foreground truncate">{biz.address}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {biz.rating && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Star className="h-3 w-3 text-amber-500" />
                              {biz.rating}
                            </span>
                          )}
                          {biz.category && (
                            <span className="text-xs text-muted-foreground">{biz.category}</span>
                          )}
                          {biz.price_range && (
                            <span className="text-xs text-muted-foreground">{biz.price_range}</span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {hasSearched && businesses.length === 0 && !scraping && (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No results found. Try a different search query.</p>
            </div>
          )}

          {/* Import button */}
          {businesses.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={selected.size === 0 || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Import {selected.size} Lead{selected.size !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
