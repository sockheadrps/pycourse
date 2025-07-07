import { json } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { supabase } from '$lib/supabase';



const supabaseUrl = SUPABASE_URL!;
const supabaseServiceKey = SUPABASE_SERVICE_ROLE_KEY!;

export async function GET({ request }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return json({ error: 'Invalid token' }, { status: 401 });
  }

  // Validate JWT
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data, error } = await supabase.auth.getUser(token);
  const user = data?.user;

  if (error || !user) {
    console.error('❌ Failed to authenticate user:', error);
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  // Load admin_user_ids from settings
  const { data: adminSetting } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'admin_user_ids')
    .single();

  const adminIds: string[] = JSON.parse(adminSetting.value);

  if (!adminIds.includes(userId)) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  // Load cashout requests
  const { data: cashouts, error: cashoutError } = await supabaseAdmin
    .from('cashout_requests')
    .select('*')
    .eq('status', 'pending');

  if (cashoutError) {
    console.error('❌ Error loading cashouts:', cashoutError);
    return json({ error: cashoutError.message }, { status: 500 });
  }

  return json({ cashouts });
}

