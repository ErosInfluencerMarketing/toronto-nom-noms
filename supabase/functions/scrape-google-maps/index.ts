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
    const { query, location } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Search query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchLocation = location || 'Toronto';
    const searchQuery = `${query} ${searchLocation} restaurants cafes site:google.com/maps`;

    console.log('Searching for:', searchQuery);

    // Use Firecrawl search to find businesses
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `${query} in ${searchLocation} restaurant cafe`,
        limit: 20,
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
    });

    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
      console.error('Firecrawl search error:', searchData);
      return new Response(
        JSON.stringify({ success: false, error: searchData.error || 'Search failed' }),
        { status: searchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = searchData.data || [];
    console.log(`Got ${results.length} search results`);

    if (results.length === 0) {
      return new Response(
        JSON.stringify({ success: true, businesses: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Combine search result content for AI extraction
    const combinedContent = results.map((r: any, i: number) => 
      `Result ${i + 1}:\nTitle: ${r.title || 'N/A'}\nURL: ${r.url || 'N/A'}\nDescription: ${r.description || 'N/A'}\nContent: ${(r.markdown || '').slice(0, 1500)}`
    ).join('\n\n---\n\n');

    // Use AI to extract structured business data
    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You extract restaurant and cafe business information from search results. Return ONLY a JSON array of businesses. Each business should have: business_name, address, phone_number, website, rating, category, price_range. If a field is unknown, use an empty string. Only include actual businesses (restaurants, cafes, coffee shops, etc). Do not include directories, articles, or non-business results. Return valid JSON only, no markdown.`
          },
          {
            role: 'user',
            content: `Extract all restaurant and cafe businesses from these search results about "${query}" in ${searchLocation}:\n\n${combinedContent}`
          }
        ],
        temperature: 0.1,
      }),
    });

    const aiData = await aiResponse.json();

    if (!aiResponse.ok) {
      console.error('AI extraction error:', aiData);
      return new Response(
        JSON.stringify({ success: false, error: 'AI extraction failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiContent = aiData.choices?.[0]?.message?.content || '[]';
    console.log('AI raw response:', aiContent.slice(0, 200));

    let businesses = [];
    try {
      // Strip markdown code fences if present
      const cleaned = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      businesses = Array.isArray(parsed) ? parsed : parsed.businesses || [];
    } catch (e) {
      console.error('Failed to parse AI response:', e);
    }

    console.log(`Extracted ${businesses.length} businesses`);

    return new Response(
      JSON.stringify({ success: true, businesses }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
