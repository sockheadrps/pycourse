export async function handle({ event, resolve }) {
  if (event.url.pathname.startsWith('/.well-known/acme-challenge')) {
      return new Response('Direct Nginx handling required.', { status: 404 });
  }
  return resolve(event);
}


