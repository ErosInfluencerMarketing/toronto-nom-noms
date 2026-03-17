import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');

    if (!firecrawlKey || !lovableKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { query, platform = 'instagram', city = 'Toronto', manual_username } = body;

    // Manual entry mode: search for a specific username
    if (manual_username) {
      return await enrichSingleInfluencer(supabase, user.id, manual_username, platform, firecrawlKey, lovableKey);
    }

    // Discovery mode: search for influencers by niche
    const searchQuery = query || `${city} food influencers ${platform}`;
    console.log(`Discovering influencers: "${searchQuery}"`);

    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 10,
      }),
    });

    if (!searchResponse.ok) {
      const errText = await searchResponse.text();
      console.error('Firecrawl search error:', errText);
      return new Response(
        JSON.stringify({ success: false, error: `Search failed: ${searchResponse.status}` }),
        { status: searchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchData = await searchResponse.json();
    const results = searchData.data || [];
    console.log(`Search returned ${results.length} results`);

    if (results.length === 0) {
      return new Response(
        JSON.stringify({ success: true, discovered: 0, message: 'No results found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = results.map((r: any) =>
      `URL: ${r.url || ''}\nTitle: ${r.title || ''}\nDescription: ${r.description || ''}\nContent: ${(r.markdown || '').slice(0, 500)}`
    ).join('\n---\n');

    // Use AI to extract influencer profiles from search results
    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Extract food/restaurant influencer profiles from these search results for ${city}. Return ONLY a JSON array of objects with these fields:
- username (their ${platform} handle without @)
- platform ("${platform}")
- full_name (if found)
- bio (short description of their content)
- followers_count (number, estimate if mentioned, 0 if unknown)
- engagement_rate (number 0-100, estimate if mentioned, 0 if unknown)
- content_type (one of: "food_reviews", "recipes", "restaurant_tours", "food_photography", "mukbang", "mixed")
- niche (e.g. "food", "restaurants", "street_food", "fine_dining", "vegan")
- email (if found)
- website (if found)
- profile_url (their profile URL)
- contact_method (e.g. "email", "DM", "website contact form")

Only include actual influencer/creator accounts, not businesses or brands. Return [] if none found.

Search results:
${content.slice(0, 6000)}`
        }],
        temperature: 0,
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI error:', aiResponse.status);
      return new Response(
        JSON.stringify({ success: false, error: 'AI extraction failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '[]';
    const cleaned = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let influencers: any[] = [];
    try {
      influencers = JSON.parse(cleaned);
      if (!Array.isArray(influencers)) influencers = [];
    } catch {
      console.error('Failed to parse AI response:', cleaned.slice(0, 200));
      influencers = [];
    }

    console.log(`AI extracted ${influencers.length} influencer profiles`);

    // Upsert influencers into the database
    let inserted = 0;
    for (const inf of influencers) {
      if (!inf.username) continue;
      const { error } = await supabase.from('influencers').upsert({
        user_id: user.id,
        username: inf.username.replace(/^@/, ''),
        platform: inf.platform || platform,
        full_name: inf.full_name || null,
        bio: inf.bio || null,
        profile_url: inf.profile_url || null,
        followers_count: parseInt(inf.followers_count) || 0,
        engagement_rate: parseFloat(inf.engagement_rate) || 0,
        content_type: inf.content_type || 'mixed',
        niche: inf.niche || 'food',
        city: city,
        email: inf.email || null,
        website: inf.website || null,
        contact_method: inf.contact_method || null,
        status: 'discovered',
      }, { onConflict: 'user_id,username,platform' });

      if (error) {
        console.error('Insert error:', error.message);
      } else {
        inserted++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, discovered: inserted, total: influencers.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Discover error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function enrichSingleInfluencer(
  supabase: any,
  userId: string,
  username: string,
  platform: string,
  firecrawlKey: string,
  lovableKey: string,
) {
  const cleanUsername = username.replace(/^@/, '');
  console.log(`Enriching single influencer: @${cleanUsername} on ${platform}`);

  const profileUrl = platform === 'tiktok'
    ? `https://www.tiktok.com/@${cleanUsername}`
    : `https://www.instagram.com/${cleanUsername}/`;

  // Search for their info
  const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firecrawlKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `"${cleanUsername}" ${platform} food influencer followers email`,
      limit: 5,
    }),
  });

  let content = '';
  if (searchResponse.ok) {
    const searchData = await searchResponse.json();
    const results = searchData.data || [];
    content = results.map((r: any) =>
      `${r.title || ''} | ${r.url || ''} | ${r.description || ''}`
    ).join('\n');
  }

  const aiResponse = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{
        role: 'user',
        content: `Extract info about ${platform} influencer "@${cleanUsername}" from this content. Return ONLY a JSON object: {"full_name":"","bio":"","followers_count":0,"following_count":0,"posts_count":0,"engagement_rate":0,"content_type":"mixed","niche":"food","email":"","website":"","contact_method":""}. Use empty string/0 if not found.\n\n${content.slice(0, 4000)}`
      }],
      temperature: 0,
    }),
  });

  let enrichedData: any = {};
  if (aiResponse.ok) {
    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '{}';
    const cleaned = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    try { enrichedData = JSON.parse(cleaned); } catch { enrichedData = {}; }
  }

  const { error } = await supabase.from('influencers').upsert({
    user_id: userId,
    username: cleanUsername,
    platform,
    full_name: enrichedData.full_name || null,
    bio: enrichedData.bio || null,
    profile_url: profileUrl,
    followers_count: parseInt(enrichedData.followers_count) || 0,
    following_count: parseInt(enrichedData.following_count) || 0,
    posts_count: parseInt(enrichedData.posts_count) || 0,
    engagement_rate: parseFloat(enrichedData.engagement_rate) || 0,
    content_type: enrichedData.content_type || 'mixed',
    niche: enrichedData.niche || 'food',
    email: enrichedData.email || null,
    website: enrichedData.website || null,
    contact_method: enrichedData.contact_method || null,
    status: 'discovered',
  }, { onConflict: 'user_id,username,platform' });

  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, discovered: 1, data: enrichedData }),
    { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } }
  );
}
