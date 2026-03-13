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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authenticate the guard
    const guardClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { authorization: authHeader } } }
    );
    const { data: { user: guardUser }, error: authErr } = await guardClient.auth.getUser();
    if (authErr || !guardUser) throw new Error("Guard not authenticated");

    const { data: guardProfile } = await supabase
      .from("profiles")
      .select("id, name, role, company_name")
      .eq("id", guardUser.id)
      .single();

    if (!guardProfile || guardProfile.role !== "guard") {
      return new Response(JSON.stringify({ success: false, error: "Only guards can scan QR codes" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { qr_data } = await req.json();
    if (!qr_data) throw new Error("Missing qr_data");

    // Decode QR payload
    let payload: any;
    try {
      payload = JSON.parse(atob(qr_data));
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid QR code format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];

    // Validate the QR date — must be today
    if (payload.date !== today) {
      return new Response(JSON.stringify({
        success: false,
        error: `QR code is expired. This code was for ${payload.date}, today is ${today}.`,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate same company
    if (payload.company !== guardProfile.company_name) {
      return new Response(JSON.stringify({
        success: false,
        error: "QR code belongs to a different company.",
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const employeeId = payload.eid;

    // Check if already checked in today
    const { data: existing } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("date", today)
      .maybeSingle();

    if (existing?.check_in && !existing?.checked_out_at) {
      // Process check-out
      const checkOutTime = new Date().toISOString();
      await supabase
        .from("attendance")
        .update({ checked_out_at: checkOutTime })
        .eq("id", existing.id);

      // Notify employee
      await supabase.from("notifications").insert({
        user_id: employeeId,
        message: `👋 Your checkout time has been recorded by ${guardProfile.name}.`,
        type: "attendance",
      });

      return new Response(JSON.stringify({
        success: true,
        action: "checkout",
        employee_name: payload.name,
        time: checkOutTime,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existing?.checked_out_at) {
      return new Response(JSON.stringify({
        success: false,
        error: `${payload.name} has already checked in and out today.`,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine attendance status
    const now = new Date();
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("work_start_time")
      .eq("role", "admin")
      .eq("company_name", guardProfile.company_name)
      .limit(1)
      .single();

    const startTime = (adminProfile as any)?.work_start_time?.slice(0, 5) || "09:00";
    const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const status = nowTime > startTime ? "late" : "present";

    const checkInTime = now.toISOString();

    if (existing) {
      await supabase
        .from("attendance")
        .update({ status, guard_id: guardProfile.id, check_in: checkInTime })
        .eq("id", existing.id);
    } else {
      await supabase.from("attendance").insert({
        employee_id: employeeId,
        guard_id: guardProfile.id,
        date: today,
        status,
        check_in: checkInTime,
      });
    }

    // Notify employee
    const statusEmoji = status === "present" ? "✅" : "⏰";
    await supabase.from("notifications").insert({
      user_id: employeeId,
      message: `${statusEmoji} Your attendance for today has been marked as "${status}" by ${guardProfile.name}.`,
      type: "attendance",
    });

    return new Response(JSON.stringify({
      success: true,
      action: "checkin",
      employee_name: payload.name,
      status,
      time: checkInTime,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-qr-token error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
