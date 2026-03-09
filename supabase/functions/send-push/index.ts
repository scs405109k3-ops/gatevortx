import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PushPayload {
  user_ids: string[];
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

    // Fetch all device tokens for the target users (native + web)
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

    const allTokens = tokens.map((t: any) => t.token);

    // FCM Legacy API handles both native (Android/iOS) and web tokens
    const fcmPayload = {
      registration_ids: allTokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      priority: 'high',
      // Web-specific options
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
        },
      },
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

    const nativeCount = tokens.filter((t: any) => t.platform !== 'web').length;
    const webCount = tokens.filter((t: any) => t.platform === 'web').length;

    return new Response(
      JSON.stringify({ 
        sent: allTokens.length,
        native: nativeCount,
        web: webCount,
        fcm: fcmResult 
      }),
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
