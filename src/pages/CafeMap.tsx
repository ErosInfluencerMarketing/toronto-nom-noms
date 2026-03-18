import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import CafeMapInner from '@/components/CafeMapInner';

export default function CafeMap() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(true);

  useEffect(() => {
    const fetchKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('google-maps-key');
        if (error) throw error;
        setApiKey(data.apiKey);
      } catch (e) {
        console.error('Failed to fetch Maps API key:', e);
        toast.error('Failed to load Google Maps configuration');
      } finally {
        setLoadingKey(false);
      }
    };
    fetchKey();
  }, []);

  if (loadingKey) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-foreground">
        <p>Google Maps API key is not configured.</p>
      </div>
    );
  }

  return <CafeMapInner apiKey={apiKey} />;
}
