import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, referenceTemplates, channel } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "A prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isEmail = channel !== "instagram";

    let systemPrompt = `You are an expert cold-outreach copywriter for a company that partners with restaurants and food businesses. Write compelling, personalized outreach messages.

Rules:
- Keep the tone professional yet friendly and conversational
- Use placeholders like [Business Name], [Owner Name], [Instagram Handle] where appropriate
- Do NOT include the subject line in the message body
- Keep messages concise (under 200 words)
- Include a clear call-to-action
- Do not use generic filler — be specific and value-driven`;

    if (isEmail) {
      systemPrompt += `\n- Format the output as HTML suitable for email (use <b>, <i>, <br>, <a> tags as needed)
- The message will be sent as an HTML email`;
    } else {
      systemPrompt += `\n- Write as a short Instagram DM (under 100 words)
- Keep it casual and direct, no HTML formatting`;
    }

    let userPrompt = prompt;

    if (referenceTemplates && referenceTemplates.length > 0) {
      userPrompt += "\n\nHere are existing templates to use as style/tone references:\n";
      for (const t of referenceTemplates) {
        userPrompt += `\n--- Template: "${t.name}" ---\n`;
        if (t.subject) userPrompt += `Subject: ${t.subject}\n`;
        userPrompt += `Body:\n${t.message_body}\n`;
      }
      userPrompt +=
        "\nMatch the style and tone of these templates but create original content based on my prompt above.";
    }

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "generate_email",
          description: "Return the generated email content",
          parameters: {
            type: "object",
            properties: {
              subject: {
                type: "string",
                description: "Email subject line (only for email channel)",
              },
              message_body: {
                type: "string",
                description: "The full message body",
              },
            },
            required: isEmail ? ["subject", "message_body"] : ["message_body"],
            additionalProperties: false,
          },
        },
      },
    ];

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools,
          tool_choice: { type: "function", function: { name: "generate_email" } },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("No tool call returned from AI");
    }

    const generated = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(generated), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-email error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
