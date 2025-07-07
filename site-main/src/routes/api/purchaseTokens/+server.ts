// src/routes/api/purchaseTokens/+server.ts
import { supabaseAdmin } from '$lib/server/supabaseAdmin';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST({ request }: RequestEvent) {
	const formData = await request.formData();
	const userId = formData.get('user_id');

	if (!userId || typeof userId !== 'string') {
		return json({ success: false, error: 'Missing or invalid user ID' }, { status: 400 });
	}

	const tokensToAdd = 10;

	// Insert or update tokens for the user
	const { data, error } = await supabaseAdmin
		.from('tokens')
		.upsert({ user_id: userId, grey_tokens: tokensToAdd }, { onConflict: 'user_id' })
		.select()
		.single();

	if (error) {
		console.error('Supabase insert error:', error.message);
		return json({ success: false, error: error.message }, { status: 500 });
	}

	return json({ success: true, tokens: tokensToAdd });
}
