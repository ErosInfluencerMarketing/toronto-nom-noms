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
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = user.id;
    console.log('Enriching leads for user:', userId);

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!apiKey || !lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId);

    if (leadsError) throw leadsError;

    const leadsToEnrich = leads?.filter((l: any) =>
      !l.email || !l.instagram_handle || !l.website || !l.address || !l.category
    ) || [];

    console.log(`Found ${leadsToEnrich.length} leads to enrich`);

    if (leadsToEnrich.length === 0) {
      return new Response(
        JSON.stringify({ success: true, enriched: 0, message: 'All leads are fully populated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process only 1 lead per call to stay within timeout
    const lead = leadsToEnrich[0];
    const missingFields: string[] = [];
    if (!lead.email) missingFields.push('email');
    if (!lead.instagram_handle) missingFields.push('instagram_handle');
    if (!lead.website) missingFields.push('website');
    if (!lead.address) missingFields.push('address');
    if (!lead.category) missingFields.push('category');

    const addressHint = lead.notes?.match(/Address: (.+)/)?.[1] || '';
    const searchQuery = `${lead.business_name} ${addressHint} Toronto contact`;
    console.log(`Searching: ${searchQuery}`);

    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: searchQuery, limit: 3 }),
    });

    const searchData = await searchResponse.json();
    console.log(`Search: status=${searchResponse.status}, results=${(searchData.data || []).length}`);

    if (!searchResponse.ok || !(searchData.data?.length)) {
      return new Response(
        JSON.stringify({ success: true, enriched: 0, total: leadsToEnrich.length, message: 'No search results' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = searchData.data.map((r: any) =>
      `${r.title || ''} | ${r.url || ''} | ${r.description || ''}`
    ).join('\n');

    console.log('Calling AI...');

    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'user',
            content: `Extract contact info for "${lead.business_name}" from these search results. Return ONLY a JSON object: {"email":"","instagram_handle":"","website":"","address":"","category":""}. For category, use a cuisine/business type like "Cafe", "Italian", "Pizza", "Coffee Shop", "Bakery", "Japanese", "Brunch", etc. Use empty string if not found.\n\n${content}`
          }
        ],
        temperature: 0,
      }),
    });

    console.log(`AI response status: ${aiResponse.status}`);
    const aiData = await aiResponse.json();

    if (!aiResponse.ok) {
      console.error('AI error:', JSON.stringify(aiData).slice(0, 200));
      return new Response(
        JSON.stringify({ success: false, error: 'AI extraction failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiContent = aiData.choices?.[0]?.message?.content || '{}';
    console.log('AI content:', aiContent.slice(0, 300));
    const cleaned = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const extracted = JSON.parse(cleaned);

    const updates: Record<string, string> = {};
    if (!lead.email && extracted.email) updates.email = extracted.email;
    if (!lead.instagram_handle && extracted.instagram_handle) updates.instagram_handle = extracted.instagram_handle;
    if (!lead.website && extracted.website) updates.website = extracted.website;
    if (!lead.address && extracted.address) updates.address = extracted.address;
    if (!lead.category && extracted.category) updates.category = extracted.category;

    if (Object.keys(updates).length > 0) {
      console.log(`Updating ${lead.business_name}:`, JSON.stringify(updates));
      const { error: updateError } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', lead.id);

      if (updateError) {
        console.error('Update error:', updateError);
      }
    } else {
      console.log('No new data found for', lead.business_name);
    }

    return new Response(
      JSON.stringify({
        success: true,
        enriched: Object.keys(updates).length > 0 ? 1 : 0,
        total: leadsToEnrich.length,
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
