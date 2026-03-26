import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Engagement hierarchy: higher index = higher engagement
const ENGAGEMENT_LEVELS = ['none', 'sent', 'opened', 'clicked', 'replied'] as const;

function getHigherEngagement(current: string, incoming: string): string {
  const currentIdx = ENGAGEMENT_LEVELS.indexOf(current as any);
  const incomingIdx = ENGAGEMENT_LEVELS.indexOf(incoming as any);
  return incomingIdx > currentIdx ? incoming : current;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Resend webhook received:", JSON.stringify(payload));

    const eventType = payload.type;
    const data = payload.data;

    if (!eventType || !data) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map Resend event types to engagement levels
    let engagement: string | null = null;
    switch (eventType) {
      case "email.sent":
      case "email.delivered":
        engagement = "sent";
        break;
      case "email.opened":
        engagement = "opened";
        break;
      case "email.clicked":
        engagement = "clicked";
        break;
      default:
        // Ignore other events (bounced, complained, etc.)
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Extract recipient email from webhook data
    const recipientEmail = data.to?.[0] || data.email;
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "No recipient email in payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to update leads matching this email
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find leads with this email
    const { data: leads, error: fetchError } = await supabase
      .from("leads")
      .select("id, email_engagement")
      .eq("email", recipientEmail);

    if (fetchError) {
      console.error("Error fetching leads:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!leads || leads.length === 0) {
      console.log(`No leads found for email: ${recipientEmail}`);
      return new Response(JSON.stringify({ success: true, matched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update each lead only if new engagement is higher
    let updated = 0;
    for (const lead of leads) {
      const newEngagement = getHigherEngagement(lead.email_engagement || "none", engagement);
      if (newEngagement !== (lead.email_engagement || "none")) {
        const { error: updateError } = await supabase
          .from("leads")
          .update({ email_engagement: newEngagement })
          .eq("id", lead.id);

        if (updateError) {
          console.error(`Error updating lead ${lead.id}:`, updateError);
        } else {
          updated++;
        }
      }
    }

    console.log(`Updated ${updated} leads for ${recipientEmail} to engagement: ${engagement}`);

    return new Response(
      JSON.stringify({ success: true, matched: leads.length, updated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
