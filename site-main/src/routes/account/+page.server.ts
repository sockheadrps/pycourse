import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const actions: Actions = {
	purchaseTokens: async ({ locals }) => {
		if (!locals.session?.user) {
			return { success: false, error: 'Not authenticated' };
		}

		try {
			// First check if user already has tokens
			const { data: existingTokens, error } = await locals.sb
				.from('grey_tokens')
				.select('*')
				.eq('user_id', locals.session.user.id)
				.maybeSingle();

			if (error && error.code !== 'PGRST116') {
				// PGRST116 is "no rows returned"
				throw error;
			}

			const currentTokens = existingTokens?.tokens || 0;
			const newTokens = currentTokens + 10;

			const { error: upsertError } = await locals.sb.from('tokens').upsert({
				user_id: locals.session.user.id,
				tokens: newTokens
			});

			if (upsertError) throw upsertError;

			return { success: true, tokens: 10, totalTokens: newTokens };
		} catch (error) {
			console.error('Error purchasing tokens:', error);
			return { success: false, error: 'Failed to purchase tokens' };
		}
	}
};
