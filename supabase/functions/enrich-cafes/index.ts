import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

interface CafeInput {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  totalRatings?: number;
}

interface EnrichedCafe extends CafeInput {
  website?: string;
  phone?: string;
  email?: string;
  instagram_handle?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { cafes } = await req.json() as { cafes: CafeInput[] };
    if (!cafes || !Array.isArray(cafes) || cafes.length === 0) {
      return new Response(JSON.stringify({ error: 'No cafes provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const googleMapsKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');

    if (!googleMapsKey) {
      return new Response(JSON.stringify({ error: 'Google Maps API key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const enriched: EnrichedCafe[] = [];

    for (const cafe of cafes) {
      const result: EnrichedCafe = { ...cafe };

      // Step 1: Google Place Details for website & phone
      try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(cafe.placeId)}&fields=website,formatted_phone_number,international_phone_number&key=${googleMapsKey}`;
        const detailsRes = await fetch(detailsUrl);
        const detailsData = await detailsRes.json();

        if (detailsData.result) {
          result.website = detailsData.result.website || undefined;
          result.phone = detailsData.result.formatted_phone_number || detailsData.result.international_phone_number || undefined;
        }
      } catch (e) {
        console.error(`Place Details error for ${cafe.name}:`, e);
      }

      // Step 2: If we have a website + Firecrawl + AI, scrape for email & Instagram
      if (result.website && firecrawlKey && lovableKey) {
        // Skip social media / aggregator sites
        const skipDomains = ['instagram.com', 'facebook.com', 'yelp.com', 'tripadvisor.com', 'google.com'];
        const isSkipDomain = skipDomains.some(d => result.website!.includes(d));

        if (!isSkipDomain) {
          try {
            console.log(`Scraping ${result.website} for ${cafe.name}`);
            const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${firecrawlKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url: result.website,
                formats: ['markdown'],
                onlyMainContent: false,
              }),
            });

            if (scrapeRes.ok) {
              const scrapeData = await scrapeRes.json();
              const content = (scrapeData.data?.markdown || scrapeData.markdown || '').slice(0, 4000);

              if (content.length > 100) {
                const extracted = await extractWithAI(lovableKey, cafe.name, content);
                if (extracted.email) result.email = extracted.email;
                if (extracted.instagram_handle) result.instagram_handle = extracted.instagram_handle;
              }
            }
          } catch (e) {
            console.error(`Scrape error for ${cafe.name}:`, e);
          }
        }
      }

      // Step 3: If still missing email/instagram, try a search
      if ((!result.email || !result.instagram_handle) && firecrawlKey && lovableKey) {
        try {
          const searchQuery = `"${cafe.name}" Sydney ${!result.email ? 'email contact' : ''} ${!result.instagram_handle ? 'instagram' : ''}`.trim();
          console.log(`Searching: ${searchQuery}`);

          const searchRes = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: searchQuery, limit: 3 }),
          });

          if (searchRes.ok) {
            const searchData = await searchRes.json();
            const results = searchData.data || [];
            if (results.length > 0) {
              const content = results.map((r: any) =>
                `${r.title || ''} | ${r.url || ''} | ${r.description || ''}`
              ).join('\n');

              const extracted = await extractWithAI(lovableKey, cafe.name, content);
              if (!result.email && extracted.email) result.email = extracted.email;
              if (!result.instagram_handle && extracted.instagram_handle) result.instagram_handle = extracted.instagram_handle;
            }
          }
        } catch (e) {
          console.error(`Search error for ${cafe.name}:`, e);
        }
      }

      enriched.push(result);

      // Small delay between cafes to avoid rate limits
      if (cafes.length > 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return new Response(
      JSON.stringify({ success: true, cafes: enriched }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Enrich cafes error:', error);
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
            content: `Extract contact info for "${businessName}" from this content. Look for email addresses (@ symbols, "mailto:", "contact", "email" sections) and Instagram handles (@username patterns, instagram.com/ links). Return ONLY a JSON object: {"email":"","instagram_handle":""}. For instagram_handle, return just the username without @. Use empty string if not found.\n\n${content}`
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
    console.log(`AI extracted for ${businessName}:`, JSON.stringify(extracted));
    return extracted;
  } catch (e) {
    console.error('AI extraction error:', e);
    return {};
  }
}