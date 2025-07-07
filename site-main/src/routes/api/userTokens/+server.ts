import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const GET: RequestHandler = async ({ url, locals }) => {
	const session = await locals.getSession();

	if (!session?.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { data, error } = await supabase
			.from('tokens')
			.select('tokens, grey_tokens')
			.eq('user_id', session.user.id)
			.single();

		if (error) {
			console.error('Error fetching tokens:', error);
			return json({ tokens: 0, grey_tokens: 0 });
		}

		return json({
			tokens: data?.tokens || 0,
			grey_tokens: data?.grey_tokens || 0
		});
	} catch (error) {
		console.error('Unexpected error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
