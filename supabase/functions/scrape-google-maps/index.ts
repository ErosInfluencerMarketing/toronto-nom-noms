const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    const searchLocation = location || 'Toronto';
    const searchQuery = `${query} in ${searchLocation} restaurants cafes google maps`;

    console.log('Searching for:', searchQuery);

    // Use Firecrawl search to find restaurants/cafes
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
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

    // Now scrape Google Maps directly for structured data
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(query + ' ' + searchLocation)}`;
    console.log('Scraping Google Maps URL:', mapsUrl);

    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: mapsUrl,
        formats: [
          'markdown',
          {
            type: 'json',
            prompt: `Extract all restaurant and cafe businesses from this Google Maps page. For each business, extract: business_name, address, phone_number, website, rating, category (restaurant or cafe), and any other useful details. Return as an array of objects.`,
            schema: {
              type: 'object',
              properties: {
                businesses: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      business_name: { type: 'string' },
                      address: { type: 'string' },
                      phone_number: { type: 'string' },
                      website: { type: 'string' },
                      rating: { type: 'string' },
                      category: { type: 'string' },
                      price_range: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        ],
        waitFor: 5000,
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok) {
      console.error('Firecrawl scrape error:', scrapeData);
      // Fall back to search results if scraping fails
      return new Response(
        JSON.stringify({
          success: true,
          source: 'search',
          data: searchData.data || [],
          businesses: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract structured business data
    const jsonData = scrapeData.data?.json || scrapeData.json || {};
    const businesses = jsonData.businesses || [];

    console.log(`Found ${businesses.length} businesses from Maps scrape`);

    // Also try to parse search results for additional businesses
    const searchResults = searchData.data || [];

    return new Response(
      JSON.stringify({
        success: true,
        source: 'maps',
        businesses,
        searchResults: searchResults.slice(0, 10),
        markdown: scrapeData.data?.markdown || scrapeData.markdown || '',
      }),
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
