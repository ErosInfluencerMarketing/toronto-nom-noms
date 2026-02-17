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

    // Parse optional body for skip list
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

    // Filter to leads missing email specifically (primary goal)
    const leadsToEnrich = leads?.filter((l: any) =>
      !l.email && !skipIds.includes(l.id)
    ) || [];

    console.log(`Found ${leadsToEnrich.length} leads needing email (skipping ${skipIds.length})`);

    if (leadsToEnrich.length === 0) {
      return new Response(
        JSON.stringify({ success: true, enriched: 0, total: 0, message: 'No more leads to enrich' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lead = leadsToEnrich[0];
    let extractedData: Record<string, string> = {};

    // Strategy 1: If lead has a website, scrape it directly for contact info
    if (lead.website && !lead.website.includes('yelp.com') && !lead.website.includes('instagram.com') && !lead.website.includes('facebook.com')) {
      console.log(`Strategy 1: Scraping website ${lead.website}`);
      try {
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: lead.website,
            formats: ['markdown'],
            onlyMainContent: false, // We want footer/header where contact info lives
          }),
        });

        if (scrapeResponse.ok) {
          const scrapeData = await scrapeResponse.json();
          const pageContent = scrapeData.data?.markdown || scrapeData.markdown || '';
          console.log(`Scraped ${pageContent.length} chars from website`);

          if (pageContent.length > 0) {
            extractedData = await extractWithAI(lovableApiKey, lead.business_name, pageContent.slice(0, 4000));
          }
        }
      } catch (e) {
        console.error('Website scrape error:', e);
      }
    }

    // Strategy 2: If no email found from website, try search with targeted query
    if (!extractedData.email) {
      const searchQueries = [
        `"${lead.business_name}" Toronto email contact`,
        `"${lead.business_name}" Toronto "@" site:instagram.com OR site:facebook.com OR site:yelp.com`,
      ];

      for (const searchQuery of searchQueries) {
        if (extractedData.email) break;
        
        console.log(`Strategy 2: Searching "${searchQuery}"`);
        try {
          const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: searchQuery, limit: 5 }),
          });

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const results = searchData.data || [];
            console.log(`Search returned ${results.length} results`);

            if (results.length > 0) {
              const content = results.map((r: any) =>
                `${r.title || ''} | ${r.url || ''} | ${r.description || ''}`
              ).join('\n');

              const searchExtracted = await extractWithAI(lovableApiKey, lead.business_name, content);
              // Merge - only fill in what we don't have yet
              if (!extractedData.email && searchExtracted.email) extractedData.email = searchExtracted.email;
              if (!extractedData.instagram_handle && searchExtracted.instagram_handle) extractedData.instagram_handle = searchExtracted.instagram_handle;
              if (!extractedData.website && searchExtracted.website) extractedData.website = searchExtracted.website;
              if (!extractedData.address && searchExtracted.address) extractedData.address = searchExtracted.address;
              if (!extractedData.category && searchExtracted.category) extractedData.category = searchExtracted.category;
            }
          }
        } catch (e) {
          console.error('Search error:', e);
        }
      }
    }

    // Strategy 3: If we found a website from search but don't have email yet, scrape that website
    if (!extractedData.email && extractedData.website && !lead.website) {
      console.log(`Strategy 3: Scraping discovered website ${extractedData.website}`);
      try {
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: extractedData.website,
            formats: ['markdown'],
            onlyMainContent: false,
          }),
        });

        if (scrapeResponse.ok) {
          const scrapeData = await scrapeResponse.json();
          const pageContent = scrapeData.data?.markdown || scrapeData.markdown || '';
          if (pageContent.length > 0) {
            const websiteExtracted = await extractWithAI(lovableApiKey, lead.business_name, pageContent.slice(0, 4000));
            if (!extractedData.email && websiteExtracted.email) extractedData.email = websiteExtracted.email;
          }
        }
      } catch (e) {
        console.error('Website scrape error:', e);
      }
    }

    // Apply updates
    const updates: Record<string, string> = {};
    if (!lead.email && extractedData.email) updates.email = extractedData.email;
    if (!lead.instagram_handle && extractedData.instagram_handle) updates.instagram_handle = extractedData.instagram_handle;
    if (!lead.website && extractedData.website) updates.website = extractedData.website;
    if (!lead.address && extractedData.address) updates.address = extractedData.address;
    if (!lead.category && extractedData.category) updates.category = extractedData.category;

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

async function extractWithAI(apiKey: string, businessName: string, content: string): Promise<Record<string, string>> {
  try {
    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'user',
            content: `Extract contact info for "${businessName}" from this content. Look especially for email addresses (check for @ symbols, "mailto:", "contact us", "email" sections). Return ONLY a JSON object: {"email":"","instagram_handle":"","website":"","address":"","category":""}. For category use a cuisine/business type. Use empty string if not found.\n\n${content}`
          }
        ],
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
