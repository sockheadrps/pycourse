// src/routes/api/admin/cashouts/[id]/confirm/+server.ts
import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST({ params, request }) {
  const id = parseInt(params.id);
  if (isNaN(id)) return json({ error: 'Invalid payout ID' }, { status: 400 });

  // Authenticate admin
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  if (!token) return json({ error: 'Invalid token' }, { status: 401 });

  const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { data: { user }, error } = await adminSupabase.auth.getUser(token);
  if (error || !user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { data: adminSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'admin_user_ids')
    .single();

  const adminIds: string[] = JSON.parse(adminSetting.value);
  if (!adminIds.includes(user.id)) return json({ error: 'Forbidden' }, { status: 403 });

  // Load the payout request
  const { data: cashout, error: cashoutError } = await supabase
    .from('cashout_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (cashoutError || !cashout) {
    console.error('❌ Failed to find cashout request:', cashoutError);
    return json({ error: 'Cashout request not found' }, { status: 404 });
  }

  // Subtract tokens from user balance
  const { data: userTokenData, error: userError } = await supabase
    .from('tokens')
    .select('tokens')
    .eq('user_id', cashout.user_id)
    .single();

  if (userError || !userTokenData) {
    console.error('❌ Failed to load user tokens:', userError);
    return json({ error: 'User tokens not found' }, { status: 404 });
  }

  if (userTokenData.tokens < cashout.token_amount) {
    return json({ error: 'Insufficient tokens for payout' }, { status: 400 });
  }

  const newBalance = userTokenData.tokens - cashout.token_amount;

  const { error: updateError } = await supabase
    .from('tokens')
    .update({ tokens: newBalance })
    .eq('user_id', cashout.user_id);

  if (updateError) {
    console.error('❌ Failed to update user tokens:', updateError);
    return json({ error: 'Failed to update user tokens' }, { status: 500 });
  }

  // Mark the payout request as "completed"
  const { error: statusError } = await supabase
    .from('cashout_requests')
    .update({ status: 'completed' })
    .eq('id', id);

  if (statusError) {
    console.error('❌ Failed to update payout status:', statusError);
    return json({ error: 'Failed to update payout status' }, { status: 500 });
  }

  console.log(`✅ Subtracted ${cashout.token_amount} tokens from user ${cashout.user_id}`);

  return json({ success: true, newBalance });
}
