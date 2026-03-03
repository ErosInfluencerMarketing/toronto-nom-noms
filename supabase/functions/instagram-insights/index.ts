const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('META_ACCESS_TOKEN');
    const igAccountId = Deno.env.get('INSTAGRAM_BUSINESS_ACCOUNT_ID');
    console.log('Token prefix:', accessToken?.substring(0, 10), '| Length:', accessToken?.length);
    console.log('IG Account ID:', igAccountId);

    if (!accessToken || !igAccountId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Instagram credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action } = await req.json();

    if (action === 'account') {
      // Get basic account info
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}?fields=id,name,username,biography,followers_count,follows_count,media_count,profile_picture_url,website&access_token=${accessToken}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'insights') {
      // Get account-level insights (last 30 days)
      const metrics = 'impressions,reach,accounts_engaged,likes,comments,shares,saves,replies,follows_and_unfollows';
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}/insights?metric=${metrics}&period=day&metric_type=total_value&timeframe=last_30_days&access_token=${accessToken}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'media') {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=25&access_token=${accessToken}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      return new Response(
        JSON.stringify({ success: true, data: data.data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'tagged') {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${igAccountId}/tags?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink,username&limit=25&access_token=${accessToken}`
        );
        const data = await res.json();
        if (data.error) {
          console.warn('Tagged media permission error:', data.error.message);
          return new Response(
            JSON.stringify({ success: true, data: [], permission_error: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ success: true, data: data.data || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (e) {
        console.warn('Tagged media fetch failed:', e);
        return new Response(
          JSON.stringify({ success: true, data: [], permission_error: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action. Use: account, insights, or media' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Instagram insights error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
