import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  user_ids: string[];  // target user IDs
  title: string;
  body: string;
  data?: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');

    if (!fcmServerKey) {
      return new Response(
        JSON.stringify({ error: 'FCM_SERVER_KEY secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const payload: PushPayload = await req.json();

    // Fetch all device tokens for the target users
    const { data: tokens, error } = await supabase
      .from('device_tokens')
      .select('token, platform')
      .in('user_id', payload.user_ids);

    if (error) throw error;
    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No device tokens found for these users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fcmTokens = tokens.map((t: any) => t.token);

    // Send via FCM v1 (HTTP v1 API)
    const fcmPayload = {
      registration_ids: fcmTokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      priority: 'high',
    };

    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${fcmServerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fcmPayload),
    });

    const fcmResult = await fcmResponse.json();

    return new Response(
      JSON.stringify({ sent: fcmTokens.length, fcm: fcmResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[send-push] Error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
