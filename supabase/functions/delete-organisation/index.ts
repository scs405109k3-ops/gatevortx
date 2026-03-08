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

    // Verify caller
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch admin profile
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role, company_name')
      .eq('id', callerUser.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admins can delete an organisation' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const companyName = callerProfile.company_name;
    if (!companyName) {
      return new Response(JSON.stringify({ error: 'No company found for this admin' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all member auth IDs in this company (including admin)
    const { data: allProfiles } = await adminClient
      .from('profiles')
      .select('id')
      .eq('company_name', companyName);

    const memberIds = (allProfiles || []).map((p: any) => p.id);

    // 1. Delete all company data (order matters for FK constraints)
    await Promise.all([
      adminClient.from('notifications').delete().in('user_id', memberIds),
      adminClient.from('leave_requests').delete().in('employee_id', memberIds),
      adminClient.from('attendance').delete().in('employee_id', memberIds),
      adminClient.from('device_tokens').delete().in('user_id', memberIds),
    ]);

    // 2. Delete visitors (guard_id references profiles)
    await adminClient.from('visitors').delete().in('guard_id', memberIds);

    // 3. Delete emails sent/received by company members
    await Promise.all([
      adminClient.from('emails').delete().in('from_user_id', memberIds),
      adminClient.from('emails').delete().in('to_user_id', memberIds),
    ]);

    // 4. Delete email labels and assignments
    await Promise.all([
      adminClient.from('email_label_assignments').delete().in('user_id', memberIds),
      adminClient.from('email_labels').delete().in('user_id', memberIds),
    ]);

    // 5. Delete all profiles in company
    await adminClient.from('profiles').delete().eq('company_name', companyName);

    // 6. Delete all auth users (including the admin last)
    const otherIds = memberIds.filter((id: string) => id !== callerUser.id);
    await Promise.all(otherIds.map((id: string) => adminClient.auth.admin.deleteUser(id)));

    // Delete admin auth user last
    await adminClient.auth.admin.deleteUser(callerUser.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
