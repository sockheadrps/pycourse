import { error } from '@sveltejs/kit';

export async function load({ params }) {
	try {
		const about = await import(`../../static/about/about.svx`);
		console.log(about);

		return {
			content: about.default,
			meta: about.metadata
		};
	} catch (e) {
		console.error(e);
		throw error(404, 'Post not found');
	}
}
