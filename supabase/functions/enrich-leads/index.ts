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

    const userId = user.id;
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!apiKey || !lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let skipIds: string[] = [];
    try {
      const body = await req.json();
      skipIds = body?.skipIds || [];
    } catch { /* no body is fine */ }

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId);

    if (leadsError) throw leadsError;

    const leadsToEnrich = leads?.filter((l: any) =>
      (!l.email || !l.instagram_handle) && !skipIds.includes(l.id)
    ) || [];

    console.log(`Found ${leadsToEnrich.length} leads needing enrichment (skipping ${skipIds.length})`);

    if (leadsToEnrich.length === 0) {
      return new Response(
        JSON.stringify({ success: true, enriched: 0, total: 0, message: 'No more leads to enrich' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lead = leadsToEnrich[0];
    const city = lead.city || 'Toronto';
    let foundEmail = lead.email || '';
    let foundInstagram = lead.instagram_handle || '';
    let foundWebsite = lead.website || '';
    let foundAddress = lead.address || '';
    let foundCategory = lead.category || '';
    let foundPhone = lead.phone || '';
    let foundOwnerName = lead.owner_name || '';

    // ── Helper: Firecrawl scrape ──
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
      } catch (e) {
        console.error(`Scrape error for ${url}:`, e);
        return '';
      }
    }

    // ── Helper: Firecrawl search with optional scraping ──
    async function searchWeb(query: string, scrapeResults = false, limit = 5): Promise<{ snippets: string; urls: string[] }> {
      try {
        const body: any = { query, limit };
        if (scrapeResults) {
          body.scrapeOptions = { formats: ['markdown'] };
        }
        const res = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) return { snippets: '', urls: [] };
        const data = await res.json();
        const results = data.data || [];
        const urls = results.map((r: any) => r.url).filter(Boolean);
        const snippets = results.map((r: any) => {
          const parts = [r.title || '', r.url || '', r.description || ''];
          if (r.markdown) parts.push(r.markdown.slice(0, 2000));
          return parts.join(' | ');
        }).join('\n\n');
        return { snippets, urls };
      } catch (e) {
        console.error('Search error:', e);
        return { snippets: '', urls: [] };
      }
    }

    // ── Helper: AI extraction ──
    async function extractWithAI(businessName: string, content: string, focusFields: string[]): Promise<Record<string, string>> {
      try {
        const focusHint = focusFields.length > 0
          ? `Focus especially on finding: ${focusFields.join(', ')}.`
          : '';

        const aiResponse = await fetch(AI_GATEWAY_URL, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${lovableApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{
              role: 'user',
              content: `You are extracting contact information for the business "${businessName}" located in ${city}.

${focusHint}

RULES:
- For email: Look for patterns like name@domain.com, "mailto:" links, "contact us" sections, "email us at", footer contact sections. Generic emails like info@, hello@, contact@ are valid.
- For instagram_handle: Look for Instagram usernames. They may appear as @username, instagram.com/username, "follow us on Instagram", "IG: username", or linked icons. Return just the username without @ prefix.
- For owner_name: Look for owner/founder/proprietor names.
- For phone: Look for phone numbers in any format.
- For website: Only return if it's the business's own website (not social media or directory links).
- For address: Full street address.
- For category: Cuisine type or business category (e.g. "Cafe", "Italian Restaurant").
- Use empty string "" for any field not found. Do NOT guess or fabricate data.

Return ONLY a valid JSON object with these keys: {"email":"","instagram_handle":"","website":"","address":"","category":"","phone":"","owner_name":""}

Content to analyze:
${content}`
            }],
            temperature: 0,
          }),
        });

        if (!aiResponse.ok) {
          console.error('AI error:', aiResponse.status);
          return {};
        }

        const aiData = await aiResponse.json();
        const aiContent = aiData.choices?.[0]?.message?.content || '{}';
        const cleaned = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const extracted = JSON.parse(cleaned);
        console.log(`AI extracted:`, JSON.stringify(extracted));
        return extracted;
      } catch (e) {
        console.error('AI extraction error:', e);
        return {};
      }
    }

    // ── Helper: Merge extracted data (only fill missing fields) ──
    function mergeExtracted(data: Record<string, string>) {
      if (!foundEmail && data.email) foundEmail = data.email;
      if (!foundInstagram && data.instagram_handle) foundInstagram = data.instagram_handle;
      if (!foundWebsite && data.website) foundWebsite = data.website;
      if (!foundAddress && data.address) foundAddress = data.address;
      if (!foundCategory && data.category) foundCategory = data.category;
      if (!foundPhone && data.phone) foundPhone = data.phone;
      if (!foundOwnerName && data.owner_name) foundOwnerName = data.owner_name;
    }

    function missingFields(): string[] {
      const missing: string[] = [];
      if (!foundEmail) missing.push('email');
      if (!foundInstagram) missing.push('instagram_handle');
      return missing;
    }

    // ═══════════════════════════════════════════════
    // STRATEGY 1: Scrape the lead's existing website
    // ═══════════════════════════════════════════════
    if (lead.website && !lead.website.includes('yelp.com') && !lead.website.includes('facebook.com')) {
      console.log(`Strategy 1: Scraping website ${lead.website}`);
      const content = await scrapeUrl(lead.website);
      if (content.length > 0) {
        mergeExtracted(await extractWithAI(lead.business_name, content.slice(0, 6000), missingFields()));
      }

      // 1b: Also try /contact, /about, /about-us pages
      if (missingFields().length > 0) {
        const baseUrl = lead.website.replace(/\/$/, '');
        const subpages = ['/contact', '/contact-us', '/about', '/about-us'];
        for (const page of subpages) {
          if (missingFields().length === 0) break;
          const subContent = await scrapeUrl(baseUrl + page);
          if (subContent.length > 200) {
            console.log(`Strategy 1b: Found content on ${page}`);
            mergeExtracted(await extractWithAI(lead.business_name, subContent.slice(0, 4000), missingFields()));
          }
        }
      }
    }

    // ═══════════════════════════════════════════════
    // STRATEGY 2: Search for email specifically
    // ═══════════════════════════════════════════════
    if (!foundEmail) {
      console.log('Strategy 2: Searching for email');
      // Try multiple search queries for email
      const emailQueries = [
        `"${lead.business_name}" ${city} email contact`,
        `"${lead.business_name}" ${city} site:yelp.com OR site:yellowpages.com OR site:tripadvisor.com`,
      ];
      for (const q of emailQueries) {
        if (foundEmail) break;
        const { snippets, urls } = await searchWeb(q, true, 3);
        if (snippets.length > 0) {
          mergeExtracted(await extractWithAI(lead.business_name, snippets.slice(0, 6000), ['email']));
        }
      }
    }

    // ═══════════════════════════════════════════════
    // STRATEGY 3: Search for Instagram handle specifically
    // ═══════════════════════════════════════════════
    if (!foundInstagram) {
      console.log('Strategy 3: Searching for Instagram handle');
      const igQueries = [
        `"${lead.business_name}" ${city} instagram`,
        `"${lead.business_name}" site:instagram.com`,
        `"${lead.business_name}" ${city} "@" instagram OR ig`,
      ];
      for (const q of igQueries) {
        if (foundInstagram) break;
        const { snippets, urls } = await searchWeb(q, false, 5);
        if (snippets.length > 0) {
          mergeExtracted(await extractWithAI(lead.business_name, snippets.slice(0, 6000), ['instagram_handle']));
        }
        // Also check if any result URL is an instagram profile
        if (!foundInstagram) {
          for (const url of urls) {
            const igMatch = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
            if (igMatch && !['p', 'explore', 'accounts', 'stories', 'reel', 'reels', 'tv'].includes(igMatch[1])) {
              foundInstagram = igMatch[1];
              console.log(`Found Instagram from URL: ${foundInstagram}`);
              break;
            }
          }
        }
      }
    }

    // ═══════════════════════════════════════════════
    // STRATEGY 4: Scrape discovered website for remaining data
    // ═══════════════════════════════════════════════
    if (missingFields().length > 0 && foundWebsite && !lead.website) {
      console.log(`Strategy 4: Scraping discovered website ${foundWebsite}`);
      const content = await scrapeUrl(foundWebsite);
      if (content.length > 0) {
        mergeExtracted(await extractWithAI(lead.business_name, content.slice(0, 6000), missingFields()));
      }
    }

    // ═══════════════════════════════════════════════
    // STRATEGY 5: Broad search with scraping enabled as last resort
    // ═══════════════════════════════════════════════
    if (missingFields().length > 0) {
      console.log('Strategy 5: Broad search with content scraping');
      const { snippets } = await searchWeb(
        `"${lead.business_name}" ${city} contact email instagram`,
        true,
        3
      );
      if (snippets.length > 0) {
        mergeExtracted(await extractWithAI(lead.business_name, snippets.slice(0, 6000), missingFields()));
      }
    }

    // ═══════════════════════════════════════════════
    // STRATEGY 6: Try Facebook page for Instagram cross-link
    // ═══════════════════════════════════════════════
    if (!foundInstagram) {
      console.log('Strategy 6: Checking Facebook for Instagram link');
      const { snippets, urls } = await searchWeb(`"${lead.business_name}" ${city} site:facebook.com`, false, 3);
      if (urls.length > 0) {
        // Scrape the Facebook page to look for linked Instagram
        const fbContent = await scrapeUrl(urls[0]);
        if (fbContent.length > 0) {
          mergeExtracted(await extractWithAI(lead.business_name, fbContent.slice(0, 4000), ['instagram_handle']));
          // Also regex check for Instagram links in FB content
          if (!foundInstagram) {
            const igMatch = fbContent.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
            if (igMatch && !['p', 'explore', 'accounts', 'stories', 'reel', 'reels', 'tv'].includes(igMatch[1])) {
              foundInstagram = igMatch[1];
              console.log(`Found Instagram from Facebook: ${foundInstagram}`);
            }
          }
        }
      }
    }

    // ── Apply updates ──
    const updates: Record<string, string> = {};
    if (!lead.email && foundEmail) updates.email = foundEmail;
    if (!lead.instagram_handle && foundInstagram) {
      // Normalize: strip URLs, @, etc.
      let normalized = foundInstagram.trim();
      const urlMatch = normalized.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)\/?/);
      if (urlMatch) normalized = urlMatch[1];
      normalized = normalized.replace(/^@/, '').split(/[?/#]/)[0];
      updates.instagram_handle = normalized;
    }
    if (!lead.website && foundWebsite) updates.website = foundWebsite;
    if (!lead.address && foundAddress) updates.address = foundAddress;
    if (!lead.category && foundCategory) updates.category = foundCategory;
    if (!lead.phone && foundPhone) updates.phone = foundPhone;
    if (!lead.owner_name && foundOwnerName) updates.owner_name = foundOwnerName;

    if (Object.keys(updates).length > 0) {
      console.log(`Updating ${lead.business_name}:`, JSON.stringify(updates));
      await supabase.from('leads').update(updates).eq('id', lead.id);
    } else {
      console.log('No new data found for', lead.business_name);
    }

    return new Response(
      JSON.stringify({
        success: true,
        enriched: Object.keys(updates).length > 0 ? 1 : 0,
        total: leadsToEnrich.length,
        processedId: lead.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Enrich error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
