import { getSupabase } from '@supabase/auth-helpers-sveltekit';
import type { Handle } from '@sveltejs/kit';
const { startSignalingServer } = require('../lib/ws-server');
import { createServer } from 'http';
import { handler } from '../build/handler'; // Adjusted the path to match the correct location

const server = createServer(handler);

// 👇 Start WebSocket on the same port
startSignalingServer(server);

server.listen(5173, () => {
  console.log('SvelteKit app + WebSocket running on http://localhost:5173');
});


export const handle: Handle = async ({ event, resolve }) => {
	const { session, supabaseClient } = await getSupabase(event);

	console.log('SESSION in handle:', session); // <-- add this line

	event.locals.sb = supabaseClient;
	event.locals.session = session;

	return resolve(event);
};
