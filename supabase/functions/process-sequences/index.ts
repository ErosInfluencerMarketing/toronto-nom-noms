import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function fillPlaceholders(message: string, lead: any): string {
  return message
    .replace(/\[Business Name\]/g, lead.business_name || "")
    .replace(/\[Owner Name\]/g, lead.owner_name || "there")
    .replace(/\[Example Restaurant\]/g, "La Bella Italia")
    .replace(
      /\[Instagram Handle\]/g,
      lead.instagram_handle ? `@${lead.instagram_handle}` : "Instagram"
    )
    .replace(/\[City\]/g, lead.city || "")
    .replace(/\[Category\]/g, lead.category || "");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const BATCH_SIZE = 20; // Process at most 20 per invocation to avoid timeouts
    const now = new Date().toISOString();
    const { data: sequences, error: seqErr } = await supabase
      .from("sequences")
      .select("*")
      .eq("status", "active")
      .lte("next_send_at", now)
      .order("next_send_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (seqErr) throw seqErr;
    if (!sequences || sequences.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    let errors = 0;
    let skipped = 0;

    for (let i = 0; i < sequences.length; i++) {
      const seq = sequences[i];
      try {
        // Rate limit: Resend allows max 2 req/sec, so wait 600ms between sends
        if (i > 0) await sleep(600);

        const { data: steps } = await supabase
          .from("sequence_steps")
          .select("*")
          .eq("sequence_id", seq.id)
          .order("step_number", { ascending: true });

        const nextStepNumber = seq.current_step + 1;
        const hasSteps = steps && steps.length > 0;

        let templateId: string;
        if (hasSteps) {
          const currentStep = steps.find((s: any) => s.step_number === nextStepNumber);
          if (!currentStep) {
            await supabase
              .from("sequences")
              .update({ status: "completed", next_send_at: null })
              .eq("id", seq.id);
            continue;
          }
          templateId = currentStep.template_id;
        } else {
          templateId = seq.template_id;
        }

        const [{ data: lead }, { data: template }] = await Promise.all([
          supabase.from("leads").select("*").eq("id", seq.lead_id).single(),
          supabase.from("templates").select("*").eq("id", templateId).single(),
        ]);

        if (!lead || !template) {
          console.error(`Missing lead or template for sequence ${seq.id}`);
          await supabase
            .from("sequences")
            .update({ status: "completed", next_send_at: null })
            .eq("id", seq.id);
          skipped++;
          continue;
        }

        // Validate email before attempting to send
        if (!lead.email || !isValidEmail(lead.email)) {
          console.error(`Invalid/missing email for lead ${lead.id} (${lead.business_name}): "${lead.email}"`);
          await supabase
            .from("sequences")
            .update({ status: "completed", next_send_at: null })
            .eq("id", seq.id);
          skipped++;
          continue;
        }

        const message = fillPlaceholders(template.message_body, lead).replace(/\n/g, "<br>");
        const defaultSubject =
          nextStepNumber === 1
            ? `Hey ${lead.business_name}!`
            : `Following up — ${lead.business_name} (${nextStepNumber})`;
        const subject = template.subject
          ? fillPlaceholders(template.subject, lead)
          : defaultSubject;

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "The Noms Company Inc. <hello@nomspass.com>",
            to: [lead.email],
            subject,
            html: message,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          console.error(`Resend error for sequence ${seq.id}:`, errData);

          // Permanent errors (validation) — stop retrying
          if (res.status === 422) {
            await supabase
              .from("sequences")
              .update({ status: "completed", next_send_at: null })
              .eq("id", seq.id);
            skipped++;
          } else {
            // Transient errors (rate limit, server) — leave active for next cron retry
            errors++;
          }
          continue;
        }

        const totalSteps = hasSteps ? steps.length : seq.max_followups;
        const isComplete = nextStepNumber >= totalSteps;

        let nextSendAt: string | null = null;
        if (!isComplete && hasSteps) {
          const nextStep = steps.find((s: any) => s.step_number === nextStepNumber + 1);
          if (nextStep) {
            const next = new Date();
            next.setDate(next.getDate() + nextStep.delay_days);
            nextSendAt = next.toISOString();
          }
        } else if (!isComplete) {
          const next = new Date();
          next.setDate(next.getDate() + seq.interval_days);
          nextSendAt = next.toISOString();
        }

        await supabase
          .from("sequences")
          .update({
            current_step: nextStepNumber,
            status: isComplete ? "completed" : "active",
            next_send_at: nextSendAt,
          })
          .eq("id", seq.id);

        // Update last outreach date and auto-set status to contacted if still "new"
        const leadUpdate: Record<string, any> = {
          last_outreach_date: new Date().toISOString().split("T")[0],
        };
        if (lead.status === "new") {
          leadUpdate.status = "contacted";
        }
        await supabase
          .from("leads")
          .update(leadUpdate)
          .eq("id", seq.lead_id);

        processed++;
      } catch (e) {
        console.error(`Error processing sequence ${seq.id}:`, e);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, errors, skipped, total: sequences.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-sequences error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
