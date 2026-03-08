import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const [bodyResult, callerResult] = await Promise.all([
      req.json(),
      callerClient.auth.getUser(),
    ]);

    const { data: { user: callerUser }, error: callerError } = callerResult;
    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, password, name, role, user_code } = bodyResult;

    if (!email || !password || !name || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, password, name, role' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['employee', 'guard', 'teacher'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Role must be employee, guard, or teacher' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate custom user_code if provided
    if (user_code && typeof user_code === 'string' && user_code.trim()) {
      const { data: existing } = await adminClient
        .from('profiles')
        .select('id')
        .eq('user_code', user_code.trim().toUpperCase())
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ error: `User ID "${user_code.trim().toUpperCase()}" is already taken` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role, company_name')
      .eq('id', callerUser.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admins can create users' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        name: name.trim(),
        role,
        company_name: callerProfile.company_name || '',
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If custom user_code was provided, update the profile
    if (user_code && typeof user_code === 'string' && user_code.trim()) {
      await adminClient
        .from('profiles')
        .update({ user_code: user_code.trim().toUpperCase() })
        .eq('id', newUser.user.id);
    }

    // Fetch the profile to return user_code
    const { data: createdProfile } = await adminClient
      .from('profiles')
      .select('user_code')
      .eq('id', newUser.user.id)
      .single();

    return new Response(JSON.stringify({
      user: newUser.user,
      user_code: createdProfile?.user_code || null,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
