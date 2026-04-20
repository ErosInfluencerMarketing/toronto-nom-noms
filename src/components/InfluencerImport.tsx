import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface ParsedInfluencer {
  username: string;
  platform: string;
  full_name?: string;
  bio?: string;
  email?: string;
  website?: string;
  city?: string;
  niche?: string;
  content_type?: string;
  status?: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  engagement_rate?: number;
  avg_likes?: number;
  avg_comments?: number;
  contact_method?: string;
  notes?: string;
  profile_url?: string;
}

const normalizeHeader = (header: string): string => {
  return header.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
};

export function InfluencerImport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedInfluencer[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const results: ParsedInfluencer[] = [];
    const parseErrors: string[] = [];

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { raw: true });

      rawData.forEach((row, index) => {
        const n: Record<string, unknown> = {};
        Object.entries(row).forEach(([key, value]) => {
          n[normalizeHeader(key)] = value;
        });

        const username = String(
          n.username || n.instagram_handle || n.instagram || n.handle || ''
        ).trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').split('/')[0].split('?')[0];

        if (!username) {
          parseErrors.push(`Row ${index + 2}: Missing username`);
          return;
        }

        results.push({
          username,
          platform: String(n.platform || 'instagram').toLowerCase().trim(),
          full_name: n.full_name || n.name || n.fullname ? String(n.full_name || n.name || n.fullname).trim() : undefined,
          bio: n.bio ? String(n.bio).trim() : undefined,
          email: n.email ? String(n.email).trim() : undefined,
          website: n.website || n.url ? String(n.website || n.url).trim() : undefined,
          city: n.city || n.location ? String(n.city || n.location).trim() : undefined,
          niche: n.niche || n.category ? String(n.niche || n.category).trim() : undefined,
          content_type: n.content_type || n.contenttype || n.type ? String(n.content_type || n.contenttype || n.type).trim() : undefined,
          status: n.status ? String(n.status).trim() : 'discovered',
          followers_count: n.followers_count || n.followers ? Number(n.followers_count || n.followers) || 0 : undefined,
          following_count: n.following_count || n.following ? Number(n.following_count || n.following) || 0 : undefined,
          posts_count: n.posts_count || n.posts ? Number(n.posts_count || n.posts) || 0 : undefined,
          engagement_rate: n.engagement_rate || n.engagement ? Number(n.engagement_rate || n.engagement) || 0 : undefined,
          avg_likes: n.avg_likes || n.likes ? Number(n.avg_likes || n.likes) || 0 : undefined,
          avg_comments: n.avg_comments || n.comments ? Number(n.avg_comments || n.comments) || 0 : undefined,
          contact_method: n.contact_method ? String(n.contact_method).trim() : undefined,
          notes: n.notes ? String(n.notes).trim() : undefined,
          profile_url: n.profile_url ? String(n.profile_url).trim() : `https://instagram.com/${username}`,
        });
      });

      setParsed(results);
      setErrors(parseErrors);
      setIsDialogOpen(true);
    } catch (error) {
      toast.error('Failed to parse file. Please check the format.');
      console.error('Parse error:', error);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    if (!user) return;
    setIsImporting(true);
    try {
      const rows = parsed.map((p) => ({
        user_id: user.id,
        username: p.username,
        platform: p.platform,
        full_name: p.full_name || null,
        bio: p.bio || null,
        email: p.email || null,
        website: p.website || null,
        city: p.city || null,
        niche: p.niche || null,
        content_type: p.content_type || null,
        status: p.status || 'discovered',
        followers_count: p.followers_count || 0,
        following_count: p.following_count || 0,
        posts_count: p.posts_count || 0,
        engagement_rate: p.engagement_rate || 0,
        avg_likes: p.avg_likes || 0,
        avg_comments: p.avg_comments || 0,
        contact_method: p.contact_method || null,
        notes: p.notes || null,
        profile_url: p.profile_url || null,
      }));

      const { error } = await supabase
        .from('influencers' as any)
        .upsert(rows as any, { onConflict: 'user_id,username,platform' });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['influencers'] });
      setIsDialogOpen(false);
      setParsed([]);
      setErrors([]);
      toast.success(`Successfully imported ${parsed.length} influencers`);
    } catch (error: any) {
      toast.error('Failed to import: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className="shrink-0"
      >
        <Upload className="h-4 w-4 mr-2" />
        Import
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Import Influencers
            </DialogTitle>
            <DialogDescription>
              Review parsed data from <span className="font-medium">{fileName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {parsed.length} influencers ready to import
                </p>
                <p className="text-xs text-muted-foreground">
                  {parsed.filter(p => p.email).length} with email, {parsed.filter(p => p.followers_count && p.followers_count > 0).length} with follower data
                </p>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">
                      {errors.length} rows skipped
                    </p>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 max-h-24 overflow-y-auto">
                      {errors.slice(0, 5).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {errors.length > 5 && <li>...and {errors.length - 5} more</li>}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Expected columns:</p>
              <p>username (required), full_name, email, website, city, niche, content_type, status, followers_count, engagement_rate, avg_likes, avg_comments, notes</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={parsed.length === 0 || isImporting}>
              {isImporting ? 'Importing...' : `Import ${parsed.length} Influencers`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
