import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, company_name, role")
      .eq("id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found");

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Use Lovable AI to generate a secure unique daily token
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a security token generator. Generate only a single cryptographically strong random alphanumeric token of exactly 32 characters. Output ONLY the token, nothing else, no explanation.",
          },
          {
            role: "user",
            content: `Generate a unique 32-char token for employee ID ${profile.id} on date ${today}. Output only the token.`,
          },
        ],
        max_tokens: 50,
      }),
    });

    let aiToken = "";
    if (aiResponse.ok) {
      const aiResult = await aiResponse.json();
      aiToken = (aiResult.choices?.[0]?.message?.content || "").trim().replace(/[^A-Za-z0-9]/g, "").slice(0, 32);
    }

    // Fallback: deterministic but secure token using crypto
    if (!aiToken || aiToken.length < 16) {
      const raw = `${profile.id}|${today}|${Date.now()}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(raw);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      aiToken = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
    }

    // Build QR payload: includes employee ID, date, company, AI token
    const payload = {
      v: 1, // version
      eid: profile.id,
      name: profile.name,
      company: profile.company_name,
      date: today,
      token: aiToken,
    };

    const qrData = btoa(JSON.stringify(payload));

    return new Response(JSON.stringify({ qr_data: qrData, date: today, name: profile.name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-qr-token error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
