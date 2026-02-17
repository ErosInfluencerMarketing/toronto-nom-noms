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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const userId = claimsData.claims.sub;

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!apiKey || !lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get leads with missing fields
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId);

    if (leadsError) throw leadsError;

    const leadsToEnrich = leads?.filter((l: any) =>
      !l.email || !l.instagram_handle || !l.website || !l.address
    ) || [];

    if (leadsToEnrich.length === 0) {
      return new Response(
        JSON.stringify({ success: true, enriched: 0, message: 'All leads are fully populated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process in batches of 5
    const batchSize = 5;
    let totalEnriched = 0;

    for (let i = 0; i < leadsToEnrich.length; i += batchSize) {
      const batch = leadsToEnrich.slice(i, i + batchSize);
      
      // Search for each business to find missing info
      const enrichPromises = batch.map(async (lead: any) => {
        const missingFields: string[] = [];
        if (!lead.email) missingFields.push('email');
        if (!lead.instagram_handle) missingFields.push('instagram');
        if (!lead.website) missingFields.push('website');
        if (!lead.address) missingFields.push('address');

        if (missingFields.length === 0) return null;

        try {
          // Search for the business
          const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `"${lead.business_name}" ${lead.address || ''} contact email instagram`,
              limit: 5,
              scrapeOptions: { formats: ['markdown'] },
            }),
          });

          const searchData = await searchResponse.json();
          if (!searchResponse.ok) return null;

          const results = searchData.data || [];
          if (results.length === 0) return null;

          const content = results.map((r: any) =>
            `Title: ${r.title || ''}\nURL: ${r.url || ''}\nContent: ${(r.markdown || '').slice(0, 1500)}`
          ).join('\n---\n');

          // Use AI to extract missing info
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
                  content: `Extract contact information for the business "${lead.business_name}". Return ONLY a JSON object with these fields (only include fields you find with high confidence):
- email: string (contact/business email)
- instagram_handle: string (Instagram handle WITHOUT @)
- website: string (business website URL)
- address: string (full street address)

Return valid JSON only, no markdown. Use empty string for unknown fields.`
                },
                {
                  role: 'user',
                  content: `Find the missing information (${missingFields.join(', ')}) for "${lead.business_name}" from these search results:\n\n${content}`
                }
              ],
              temperature: 0.1,
            }),
          });

          const aiData = await aiResponse.json();
          if (!aiResponse.ok) return null;

          const aiContent = aiData.choices?.[0]?.message?.content || '{}';
          const cleaned = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const extracted = JSON.parse(cleaned);

          // Build update object with only newly found data
          const updates: Record<string, string> = {};
          if (!lead.email && extracted.email) updates.email = extracted.email;
          if (!lead.instagram_handle && extracted.instagram_handle) updates.instagram_handle = extracted.instagram_handle;
          if (!lead.website && extracted.website) updates.website = extracted.website;
          if (!lead.address && extracted.address) updates.address = extracted.address;

          if (Object.keys(updates).length === 0) return null;

          const { error: updateError } = await supabase
            .from('leads')
            .update(updates)
            .eq('id', lead.id);

          if (updateError) {
            console.error(`Failed to update lead ${lead.id}:`, updateError);
            return null;
          }

          return lead.id;
        } catch (e) {
          console.error(`Error enriching ${lead.business_name}:`, e);
          return null;
        }
      });

      const results = await Promise.all(enrichPromises);
      totalEnriched += results.filter(Boolean).length;
    }

    return new Response(
      JSON.stringify({ success: true, enriched: totalEnriched, total: leadsToEnrich.length }),
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
