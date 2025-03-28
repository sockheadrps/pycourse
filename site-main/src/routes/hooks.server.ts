import { getSupabase } from '@supabase/auth-helpers-sveltekit';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const { session, supabaseClient } = await getSupabase(event);

	console.log('SESSION in handle:', session); // <-- add this line

	event.locals.sb = supabaseClient;
	event.locals.session = session;

	return resolve(event);
};
