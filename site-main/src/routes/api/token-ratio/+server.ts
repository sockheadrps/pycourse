// src/routes/api/token-ratio/+server.ts
import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'token_ratio')
    .single();

  if (error || !data) {
    console.error('❌ Failed to load token ratio:', error);
    return json({ error: 'Failed to load token ratio' }, { status: 500 });
  }

  return json({ ratio: parseFloat(data.value) });
}
