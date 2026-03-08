import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function imageUrlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
  const base64 = btoa(binary);
  const mimeType = res.headers.get("content-type") || "image/jpeg";
  return { base64, mimeType };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { reference_url, current_url, context } = await req.json();

    if (!reference_url || !current_url) {
      return new Response(JSON.stringify({ match: null, confidence: 0, message: "Missing image URLs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch both images and convert to base64
    const [refImg, curImg] = await Promise.all([
      imageUrlToBase64(reference_url),
      imageUrlToBase64(current_url),
    ]);

    const systemPrompt = `You are a face verification security system for an access control application. 
Your task is to determine if two photos show the same person.
Be accurate but also consider lighting, angle, and image quality differences.
Always respond with valid JSON only.`;

    const userPrompt = context === "visitor"
      ? `These are two photos of a visitor. The first is their reference photo from a previous visit, and the second is their current visit photo.
Analyze if these are the same person.
Respond with ONLY this JSON: {"match": true/false, "confidence": 0-100, "reason": "brief explanation"}`
      : `These are two photos of an employee. The first is their profile photo (reference), and the second is today's attendance capture.
Verify if this is the same person checking in for attendance.
Respond with ONLY this JSON: {"match": true/false, "confidence": 0-100, "reason": "brief explanation"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${refImg.mimeType};base64,${refImg.base64}` },
              },
              {
                type: "image_url",
                image_url: { url: `data:${curImg.mimeType};base64,${curImg.base64}` },
              },
              { type: "text", text: userPrompt },
            ],
          },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ match: null, confidence: 0, message: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "{}";

    // Parse JSON from AI response (strip markdown if present)
    let parsed: { match: boolean; confidence: number; reason: string };
    try {
      const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      parsed = { match: null as unknown as boolean, confidence: 0, reason: "Could not analyze images" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-face error:", e);
    return new Response(
      JSON.stringify({ match: null, confidence: 0, reason: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
