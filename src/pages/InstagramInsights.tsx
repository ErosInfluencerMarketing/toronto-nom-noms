import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Users, UserCheck, Image, Heart, MessageCircle, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface AccountData {
  id: string;
  name?: string;
  username?: string;
  biography?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  profile_picture_url?: string;
  website?: string;
}

interface MediaItem {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
}

export default function InstagramInsights() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showToast = false) => {
    try {
      const [accountRes, mediaRes] = await Promise.all([
        supabase.functions.invoke('instagram-insights', { body: { action: 'account' } }),
        supabase.functions.invoke('instagram-insights', { body: { action: 'media' } }),
      ]);

      if (accountRes.error) throw accountRes.error;
      if (mediaRes.error) throw mediaRes.error;

      if (accountRes.data?.success) setAccount(accountRes.data.data);
      else toast.error(accountRes.data?.error || 'Failed to fetch account');

      if (mediaRes.data?.success) setMedia(mediaRes.data.data || []);

      if (showToast) toast.success('Refreshed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch Instagram data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const formatNumber = (n?: number) => {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Instagram Insights</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Account Info */}
        {loading ? (
          <Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
        ) : account ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {account.profile_picture_url && (
                  <img src={account.profile_picture_url} alt={account.username} className="h-16 w-16 rounded-full object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-foreground">{account.name || account.username}</h2>
                  {account.username && <p className="text-sm text-muted-foreground">@{account.username}</p>}
                  {account.biography && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{account.biography}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
          </div>
        ) : account ? (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold text-foreground">{formatNumber(account.followers_count)}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <UserCheck className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold text-foreground">{formatNumber(account.follows_count)}</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Image className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold text-foreground">{formatNumber(account.media_count)}</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Recent Media */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Recent Posts</h3>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="aspect-square rounded-lg" />)}
            </div>
          ) : media.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent posts found.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {media.map((item) => (
                <Card key={item.id} className="overflow-hidden group">
                  <div className="relative aspect-square bg-muted">
                    {(item.media_url || item.thumbnail_url) ? (
                      <img
                        src={item.thumbnail_url || item.media_url}
                        alt={item.caption?.slice(0, 50) || 'Post'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Image className="h-8 w-8" />
                      </div>
                    )}
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                      <span className="flex items-center gap-1 text-sm font-medium">
                        <Heart className="h-4 w-4" /> {formatNumber(item.like_count)}
                      </span>
                      <span className="flex items-center gap-1 text-sm font-medium">
                        <MessageCircle className="h-4 w-4" /> {formatNumber(item.comments_count)}
                      </span>
                    </div>
                  </div>
                  {item.permalink && (
                    <CardContent className="p-2">
                      <a href={item.permalink} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> View on Instagram
                      </a>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
