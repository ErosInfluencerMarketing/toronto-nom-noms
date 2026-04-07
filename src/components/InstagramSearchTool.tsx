import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Instagram, Search, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export function InstagramSearchTool() {
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('Toronto');
  const [website, setWebsite] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) return;
    setSearching(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('find-instagram', {
        body: { businessName: businessName.trim(), city: city.trim() || 'Toronto', website: website.trim() || '' },
      });
      if (error) throw error;
      if (data?.instagram_handle) {
        setResult(data.instagram_handle);
        toast.success(`Found: @${data.instagram_handle}`);
      } else {
        setResult('');
        toast.info('No Instagram handle found');
      }
    } catch (e) {
      toast.error('Search failed');
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Instagram className="h-4 w-4" />
          Instagram Finder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="space-y-3">
          <Input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Business name"
            required
          />
          <div className="flex gap-2">
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="flex-1"
            />
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="Website (optional)"
              className="flex-1"
            />
          </div>
          <Button type="submit" disabled={searching} className="w-full">
            {searching ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Searching...</>
            ) : (
              <><Search className="h-4 w-4 mr-2" /> Find Instagram</>
            )}
          </Button>
        </form>

        {result !== null && (
          <div className="mt-4 p-3 rounded-lg border border-border bg-secondary/30">
            {result ? (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-500" />
                  @{result}
                </span>
                <a
                  href={`https://instagram.com/${result}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No Instagram handle found for this business.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
