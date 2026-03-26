import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { channels, lead, message, subject, sender } = await req.json();

    if (!channels || !lead || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: channels, lead, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Record<string, { success: boolean; error?: string }> = {};

    // Send Email via Resend
    if (channels.includes("email")) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (!RESEND_API_KEY) {
        results.email = { success: false, error: "RESEND_API_KEY not configured" };
      } else if (!lead.email) {
        results.email = { success: false, error: "Lead has no email address" };
      } else {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: sender === "eros"
                ? "Eros Marketing <hello@erosmarketing.io>"
                : "The Noms Company Inc. <hello@nomspass.com>",
              to: [lead.email],
              subject: subject || `Hey ${lead.business_name}!`,
              html: message.replace(/\n/g, '<br>'),
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            results.email = {
              success: false,
              error: `Resend API error [${res.status}]: ${JSON.stringify(data)}`,
            };
          } else {
            results.email = { success: true };
          }
        } catch (e) {
          results.email = { success: false, error: e.message };
        }
      }
    }

    // Send Instagram DM via Meta Graph API
    if (channels.includes("instagram")) {
      const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN");
      const IG_ACCOUNT_ID = Deno.env.get("INSTAGRAM_BUSINESS_ACCOUNT_ID");

      if (!META_ACCESS_TOKEN) {
        results.instagram = { success: false, error: "META_ACCESS_TOKEN not configured" };
      } else if (!IG_ACCOUNT_ID) {
        results.instagram = { success: false, error: "INSTAGRAM_BUSINESS_ACCOUNT_ID not configured" };
      } else if (!lead.instagram_handle) {
        results.instagram = { success: false, error: "Lead has no Instagram handle" };
      } else {
        try {
          // Look up Instagram user ID by username
          const username = lead.instagram_handle.replace("@", "");
          const lookupUrl = `https://graph.facebook.com/v21.0/${IG_ACCOUNT_ID}?fields=business_discovery.username(${username}){id,username}&access_token=${META_ACCESS_TOKEN}`;
          const searchRes = await fetch(lookupUrl);
          const searchData = await searchRes.json();

          if (!searchRes.ok || !searchData.business_discovery?.id) {
            results.instagram = {
              success: false,
              error: `Could not find Instagram user: ${JSON.stringify(searchData.error || searchData)}`,
            };
          } else {
            const recipientId = searchData.business_discovery.id;

            // Send message
            const msgRes = await fetch(
              `https://graph.facebook.com/v21.0/${IG_ACCOUNT_ID}/messages`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  recipient: { id: recipientId },
                  message: { text: message },
                  access_token: META_ACCESS_TOKEN,
                }),
              }
            );

            const msgData = await msgRes.json();
            if (!msgRes.ok) {
              results.instagram = {
                success: false,
                error: `Instagram DM failed [${msgRes.status}]: ${JSON.stringify(msgData)}`,
              };
            } else {
              results.instagram = { success: true };
            }
          }
        } catch (e) {
          results.instagram = { success: false, error: e.message };
        }
      }
    }

    // Update last outreach date, status, engagement, and next outreach date
    const anySuccess = Object.values(results).some((r: any) => r.success);
    if (lead.id && anySuccess) {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const updateData: Record<string, any> = {
        last_outreach_date: todayStr,
      };
      // Auto-set status to contacted if currently "new"
      if (lead.status === "new") {
        updateData.status = "contacted";
      }
      // Set email engagement to 'sent' if email was sent and engagement is none/missing
      if (channels.includes("email") && results.email?.success && (!lead.email_engagement || lead.email_engagement === "none")) {
        updateData.email_engagement = "sent";
      }
      // For email sends (not sequence), set next outreach to 2 days later
      if (channels.includes("email") && results.email?.success) {
        const nextOutreach = new Date(today);
        nextOutreach.setDate(nextOutreach.getDate() + 2);
        updateData.next_outreach_date = nextOutreach.toISOString().split("T")[0];
      }
      const { error: updateError } = await serviceClient
        .from("leads")
        .update(updateData)
        .eq("id", lead.id);
      if (updateError) {
        console.error("Failed to update lead:", updateError);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-message error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
