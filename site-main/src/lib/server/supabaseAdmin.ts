// src/lib/server/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
	throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
