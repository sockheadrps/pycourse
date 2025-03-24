// src/routes/logout/+page.server.ts
import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';

export const actions: Actions = {
	default: async ({ locals }) => {
		await locals.sb.auth.signOut();
		throw redirect(303, '/');
	}
};
