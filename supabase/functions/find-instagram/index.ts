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

    const { businessName, city, website, leadId } = await req.json();
    if (!businessName) {
      return new Response(JSON.stringify({ error: 'businessName is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!apiKey || !lovableApiKey) {
      return new Response(JSON.stringify({ error: 'API keys not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const location = city || 'Toronto';
    let foundHandle = '';

    // Helper: Firecrawl search
    async function searchWeb(query: string, limit = 5): Promise<{ snippets: string; urls: string[] }> {
      try {
        const res = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, limit }),
        });
        if (!res.ok) return { snippets: '', urls: [] };
        const data = await res.json();
        const results = data.data || [];
        const urls = results.map((r: any) => r.url).filter(Boolean);
        const snippets = results.map((r: any) =>
          [r.title || '', r.url || '', r.description || ''].join(' | ')
        ).join('\n\n');
        return { snippets, urls };
      } catch (e) {
        console.error('Search error:', e);
        return { snippets: '', urls: [] };
      }
    }

    // Helper: scrape URL
    async function scrapeUrl(url: string): Promise<string> {
      try {
        const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: false }),
        });
        if (!res.ok) return '';
        const data = await res.json();
        return data.data?.markdown || data.markdown || '';
      } catch {
        return '';
      }
    }

    // Helper: AI extract Instagram
    async function extractInstagram(content: string): Promise<string> {
      try {
        const aiResponse = await fetch(AI_GATEWAY_URL, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${lovableApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{
              role: 'user',
              content: `Extract the Instagram handle/username for the business "${businessName}" in ${location}.

Look for:
- @username patterns
- instagram.com/username links
- "Follow us on Instagram" text
- "IG: username" patterns
- Social media links sections

Return ONLY a JSON object: {"instagram_handle": "username_without_at"} or {"instagram_handle": ""} if not found.
Do NOT guess or fabricate. Only return what you find in the content.

Content:
${content}`
            }],
            temperature: 0,
          }),
        });
        if (!aiResponse.ok) return '';
        const aiData = await aiResponse.json();
        const aiContent = aiData.choices?.[0]?.message?.content || '{}';
        const cleaned = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return parsed.instagram_handle || '';
      } catch {
        return '';
      }
    }

    // Helper: check URL for IG profile
    function extractIgFromUrl(url: string): string {
      const match = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
      if (match && !['p', 'explore', 'accounts', 'stories', 'reel', 'reels', 'tv'].includes(match[1])) {
        return match[1];
      }
      return '';
    }

    // Normalize handle
    function normalize(handle: string): string {
      let h = handle.trim();
      const urlMatch = h.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)\/?/);
      if (urlMatch) h = urlMatch[1];
      h = h.replace(/^@/, '').split(/[?/#]/)[0];
      return h;
    }

    // STRATEGY 1: Scrape their website for Instagram links
    if (website && !website.includes('yelp.com') && !website.includes('facebook.com')) {
      console.log(`Strategy 1: Scraping website ${website}`);
      const content = await scrapeUrl(website);
      if (content.length > 0) {
        foundHandle = await extractInstagram(content.slice(0, 6000));
      }
      // Also try /contact and /about
      if (!foundHandle) {
        const baseUrl = website.replace(/\/$/, '');
        for (const page of ['/contact', '/about', '/contact-us']) {
          if (foundHandle) break;
          const subContent = await scrapeUrl(baseUrl + page);
          if (subContent.length > 200) {
            foundHandle = await extractInstagram(subContent.slice(0, 4000));
          }
        }
      }
    }

    // STRATEGY 2: Direct Instagram search
    if (!foundHandle) {
      console.log('Strategy 2: Direct Instagram search');
      const queries = [
        `"${businessName}" site:instagram.com`,
        `"${businessName}" ${location} instagram`,
        `"${businessName}" ${location} "@" instagram OR ig`,
      ];
      for (const q of queries) {
        if (foundHandle) break;
        const { snippets, urls } = await searchWeb(q, 5);
        // Check URLs first for direct IG profile links
        for (const url of urls) {
          const handle = extractIgFromUrl(url);
          if (handle) { foundHandle = handle; break; }
        }
        // Fall back to AI extraction from snippets
        if (!foundHandle && snippets.length > 0) {
          foundHandle = await extractInstagram(snippets.slice(0, 6000));
        }
      }
    }

    // STRATEGY 3: Search directories (Yelp, TripAdvisor, Google)
    if (!foundHandle) {
      console.log('Strategy 3: Directory search');
      const { snippets } = await searchWeb(
        `"${businessName}" ${location} site:yelp.com OR site:tripadvisor.com OR site:google.com/maps`,
        true
      );
      if (snippets.length > 0) {
        foundHandle = await extractInstagram(snippets.slice(0, 6000));
      }
    }

    // STRATEGY 4: Facebook cross-link
    if (!foundHandle) {
      console.log('Strategy 4: Facebook cross-link');
      const { urls } = await searchWeb(`"${businessName}" ${location} site:facebook.com`, 3);
      if (urls.length > 0) {
        const fbContent = await scrapeUrl(urls[0]);
        if (fbContent.length > 0) {
          foundHandle = await extractInstagram(fbContent.slice(0, 4000));
          if (!foundHandle) {
            const match = fbContent.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
            if (match) foundHandle = extractIgFromUrl(`instagram.com/${match[1]}`);
          }
        }
      }
    }

    // STRATEGY 5: Broad search
    if (!foundHandle) {
      console.log('Strategy 5: Broad search');
      const { snippets, urls } = await searchWeb(`"${businessName}" ${location} contact instagram social media`, 5);
      for (const url of urls) {
        const handle = extractIgFromUrl(url);
        if (handle) { foundHandle = handle; break; }
      }
      if (!foundHandle && snippets.length > 0) {
        foundHandle = await extractInstagram(snippets.slice(0, 6000));
      }
    }

    // Normalize the result
    const normalizedHandle = foundHandle ? normalize(foundHandle) : '';

    // If we have a leadId, update the lead directly
    if (normalizedHandle && leadId) {
      await supabase.from('leads').update({ instagram_handle: normalizedHandle }).eq('id', leadId);
      console.log(`Updated lead ${leadId} with Instagram: ${normalizedHandle}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        instagram_handle: normalizedHandle,
        updated: !!(normalizedHandle && leadId),
      }),
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
