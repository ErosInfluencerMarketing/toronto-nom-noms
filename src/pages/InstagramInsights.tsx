import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, Users, UserCheck, Image, Heart, MessageCircle,
  ExternalLink, RefreshCw, TrendingUp, BarChart3, Award, Share2,
  Bookmark, Eye,
} from 'lucide-react';
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

  const analytics = useMemo(() => {
    if (!media.length || !account) return null;

    const totalLikes = media.reduce((s, m) => s + (m.like_count || 0), 0);
    const totalComments = media.reduce((s, m) => s + (m.comments_count || 0), 0);
    const totalEngagements = totalLikes + totalComments;
    const avgLikes = totalLikes / media.length;
    const avgComments = totalComments / media.length;
    const engagementRate = account.followers_count
      ? ((totalEngagements / media.length) / account.followers_count) * 100
      : 0;

    const bestPost = [...media].sort(
      (a, b) => ((b.like_count || 0) + (b.comments_count || 0)) - ((a.like_count || 0) + (a.comments_count || 0))
    )[0];

    const likesToCommentsRatio = totalComments > 0 ? totalLikes / totalComments : 0;

    // Post frequency (posts per week based on date range)
    const timestamps = media.map(m => new Date(m.timestamp).getTime()).sort((a, b) => a - b);
    const daySpan = timestamps.length > 1
      ? (timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60 * 24)
      : 7;
    const postsPerWeek = daySpan > 0 ? (media.length / daySpan) * 7 : media.length;

    // Media type breakdown
    const typeBreakdown: Record<string, number> = {};
    media.forEach(m => {
      const t = m.media_type || 'UNKNOWN';
      typeBreakdown[t] = (typeBreakdown[t] || 0) + 1;
    });

    return {
      totalLikes, totalComments, totalEngagements,
      avgLikes, avgComments, engagementRate,
      bestPost, likesToCommentsRatio, postsPerWeek,
      typeBreakdown,
    };
  }, [media, account]);

  const formatNumber = (n?: number) => {
    if (n == null) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toFixed(n % 1 === 0 ? 0 : 1);
  };

  const mediaTypeLabel = (t: string) => {
    switch (t) {
      case 'IMAGE': return 'Photos';
      case 'VIDEO': return 'Videos';
      case 'CAROUSEL_ALBUM': return 'Carousels';
      default: return t;
    }
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
                  <img src={account.profile_picture_url} alt={account.username} className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/20" />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-foreground">{account.name || account.username}</h2>
                  {account.username && <p className="text-sm text-muted-foreground">@{account.username}</p>}
                  {account.biography && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{account.biography}</p>}
                </div>
                {account.website && (
                  <a href={account.website} target="_blank" rel="noopener noreferrer" className="hidden md:flex items-center gap-1 text-xs text-primary hover:underline">
                    <ExternalLink className="h-3 w-3" /> Website
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Account Stats */}
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

        {/* Engagement Analytics */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
          </div>
        ) : analytics ? (
          <>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> Engagement Analytics
                <span className="text-xs font-normal text-muted-foreground">(based on last {media.length} posts)</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-primary/20">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
                    <p className="text-2xl font-bold text-foreground">{analytics.engagementRate.toFixed(2)}%</p>
                    <p className="text-xs text-muted-foreground">Engagement Rate</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Heart className="h-5 w-5 mx-auto mb-1 text-rose-500" />
                    <p className="text-2xl font-bold text-foreground">{formatNumber(analytics.avgLikes)}</p>
                    <p className="text-xs text-muted-foreground">Avg Likes / Post</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <MessageCircle className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                    <p className="text-2xl font-bold text-foreground">{formatNumber(analytics.avgComments)}</p>
                    <p className="text-xs text-muted-foreground">Avg Comments / Post</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <BarChart3 className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                    <p className="text-2xl font-bold text-foreground">{analytics.postsPerWeek.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Posts / Week</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Totals & Ratios Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Heart className="h-5 w-5 mx-auto mb-1 text-rose-500" />
                  <p className="text-2xl font-bold text-foreground">{formatNumber(analytics.totalLikes)}</p>
                  <p className="text-xs text-muted-foreground">Total Likes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <MessageCircle className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                  <p className="text-2xl font-bold text-foreground">{formatNumber(analytics.totalComments)}</p>
                  <p className="text-xs text-muted-foreground">Total Comments</p>
                </CardContent>
              </Card>
              <Card className="col-span-2 md:col-span-1">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold text-foreground">{analytics.likesToCommentsRatio.toFixed(1)}:1</p>
                  <p className="text-xs text-muted-foreground">Likes to Comments Ratio</p>
                </CardContent>
              </Card>
            </div>

            {/* Content Mix */}
            {Object.keys(analytics.typeBreakdown).length > 1 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Content Mix</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-6 flex-wrap pb-4">
                  {Object.entries(analytics.typeBreakdown).map(([type, count]) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${
                        type === 'IMAGE' ? 'bg-blue-500' :
                        type === 'VIDEO' ? 'bg-rose-500' :
                        type === 'CAROUSEL_ALBUM' ? 'bg-amber-500' : 'bg-muted-foreground'
                      }`} />
                      <span className="text-sm text-foreground font-medium">{mediaTypeLabel(type)}</span>
                      <span className="text-xs text-muted-foreground">
                        {count} ({((count / media.length) * 100).toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Best Performing Post */}
            {analytics.bestPost && (
              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" /> Top Performing Post
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4 items-start pb-4">
                  {(analytics.bestPost.media_url || analytics.bestPost.thumbnail_url) && (
                    <img
                      src={analytics.bestPost.thumbnail_url || analytics.bestPost.media_url}
                      alt="Top post"
                      className="h-20 w-20 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm text-foreground line-clamp-2">{analytics.bestPost.caption || 'No caption'}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-rose-500" /> {formatNumber(analytics.bestPost.like_count)}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5 text-blue-500" /> {formatNumber(analytics.bestPost.comments_count)}</span>
                      <span className="text-xs">{new Date(analytics.bestPost.timestamp).toLocaleDateString()}</span>
                    </div>
                    {analytics.bestPost.permalink && (
                      <a href={analytics.bestPost.permalink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> View on Instagram
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
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
