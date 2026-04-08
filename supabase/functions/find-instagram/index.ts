import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// ── Helpers ──

function extractIgFromUrl(url: string): string {
  const match = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
  if (match && !['p', 'explore', 'accounts', 'stories', 'reel', 'reels', 'tv'].includes(match[1])) {
    return match[1];
  }
  return '';
}

function normalize(handle: string): string {
  let h = handle.trim();
  const urlMatch = h.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)\/?/);
  if (urlMatch) h = urlMatch[1];
  h = h.replace(/^@/, '').split(/[?/#]/)[0];
  return h;
}

async function searchWeb(apiKey: string, query: string, limit = 5): Promise<{ snippets: string; urls: string[] }> {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit }),
    });
    if (!res.ok) return { snippets: '', urls: [] };
    const data = await res.json();
    const results = data.data || [];
    return {
      urls: results.map((r: any) => r.url).filter(Boolean),
      snippets: results.map((r: any) => [r.title || '', r.url || '', r.description || ''].join(' | ')).join('\n\n'),
    };
  } catch { return { snippets: '', urls: [] }; }
}

async function scrapeUrl(apiKey: string, url: string): Promise<string> {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: false }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.data?.markdown || data.markdown || '';
  } catch { return ''; }
}

async function extractInstagram(lovableApiKey: string, content: string, businessName: string, location: string): Promise<string> {
  try {
    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${lovableApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Extract the Instagram handle/username for the business "${businessName}" in ${location}.
Look for @username patterns, instagram.com/username links, "Follow us on Instagram" text, "IG: username" patterns, social media links.
Return ONLY JSON: {"instagram_handle": "username_without_at"} or {"instagram_handle": ""} if not found.
Do NOT guess or fabricate.

Content:
${content.slice(0, 5000)}`
        }],
        temperature: 0,
      }),
    });
    if (!aiResponse.ok) return '';
    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '{}';
    const cleaned = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned).instagram_handle || '';
  } catch { return ''; }
}

// ── Core search for a single lead ──

async function findInstagramForLead(
  apiKey: string,
  lovableApiKey: string,
  businessName: string,
  city: string,
  website: string,
): Promise<string> {
  const location = city || 'Toronto';
  let foundHandle = '';

  // STRATEGY 1: Scrape website for IG links (fast regex check first)
  if (website && !website.includes('yelp.com') && !website.includes('facebook.com')) {
    const content = await scrapeUrl(apiKey, website);
    if (content) {
      // Quick regex before AI
      const igMatch = content.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
      if (igMatch) {
        const h = extractIgFromUrl(`instagram.com/${igMatch[1]}`);
        if (h) return normalize(h);
      }
      foundHandle = await extractInstagram(lovableApiKey, content, businessName, location);
      if (foundHandle) return normalize(foundHandle);
    }
  }

  // STRATEGY 2: Direct Instagram search (parallel queries)
  const queries = [
    `"${businessName}" site:instagram.com`,
    `"${businessName}" ${location} instagram`,
  ];
  const searchResults = await Promise.all(queries.map(q => searchWeb(apiKey, q, 5)));
  for (const { urls, snippets } of searchResults) {
    for (const url of urls) {
      const h = extractIgFromUrl(url);
      if (h) return normalize(h);
    }
    if (snippets) {
      foundHandle = await extractInstagram(lovableApiKey, snippets, businessName, location);
      if (foundHandle) return normalize(foundHandle);
    }
  }

  // STRATEGY 3: Directory + Facebook (parallel)
  const [dirResult, fbResult] = await Promise.all([
    searchWeb(apiKey, `"${businessName}" ${location} site:yelp.com OR site:tripadvisor.com`, 3),
    searchWeb(apiKey, `"${businessName}" ${location} site:facebook.com`, 2),
  ]);

  if (dirResult.snippets) {
    foundHandle = await extractInstagram(lovableApiKey, dirResult.snippets, businessName, location);
    if (foundHandle) return normalize(foundHandle);
  }

  if (fbResult.urls.length > 0) {
    const fbContent = await scrapeUrl(apiKey, fbResult.urls[0]);
    if (fbContent) {
      const igMatch = fbContent.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
      if (igMatch) {
        const h = extractIgFromUrl(`instagram.com/${igMatch[1]}`);
        if (h) return normalize(h);
      }
      foundHandle = await extractInstagram(lovableApiKey, fbContent, businessName, location);
      if (foundHandle) return normalize(foundHandle);
    }
  }

  // STRATEGY 4: Broad search
  const { snippets, urls } = await searchWeb(apiKey, `"${businessName}" ${location} contact instagram social media`, 5);
  for (const url of urls) {
    const h = extractIgFromUrl(url);
    if (h) return normalize(h);
  }
  if (snippets) {
    foundHandle = await extractInstagram(lovableApiKey, snippets, businessName, location);
    if (foundHandle) return normalize(foundHandle);
  }

  return '';
}

// ── Main handler ──

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

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey || !lovableApiKey) {
      return new Response(JSON.stringify({ error: 'API keys not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();

    // ── Batch mode ──
    if (body.batch && Array.isArray(body.leads)) {
      const leads: { leadId: string; businessName: string; city?: string; website?: string }[] = body.leads;
      const CONCURRENCY = 2; // Process 2 leads in parallel
      const results: { leadId: string; instagram_handle: string; updated: boolean }[] = [];

      for (let i = 0; i < leads.length; i += CONCURRENCY) {
        const chunk = leads.slice(i, i + CONCURRENCY);
        const chunkResults = await Promise.all(
          chunk.map(async (lead) => {
            const handle = await findInstagramForLead(apiKey, lovableApiKey, lead.businessName, lead.city || 'Toronto', lead.website || '');
            if (handle && lead.leadId) {
              await supabase.from('leads').update({ instagram_handle: handle }).eq('id', lead.leadId);
            }
            return { leadId: lead.leadId, instagram_handle: handle, updated: !!handle };
          })
        );
        results.push(...chunkResults);
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Single mode ──
    const { businessName, city, website, leadId } = body;
    if (!businessName) {
      return new Response(JSON.stringify({ error: 'businessName is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const handle = await findInstagramForLead(apiKey, lovableApiKey, businessName, city || 'Toronto', website || '');

    if (handle && leadId) {
      await supabase.from('leads').update({ instagram_handle: handle }).eq('id', leadId);
    }

    return new Response(
      JSON.stringify({ success: true, instagram_handle: handle, updated: !!(handle && leadId) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Find Instagram error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
