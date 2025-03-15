import { error } from '@sveltejs/kit';

export async function load({ params }) {
	try {
		const post = await import(`../../posts/${params.slug}.svx`);
		console.log(post.default);

		return {
			content: post.default,
			meta: post.metadata,
			frameSrc: post.frameSrc,
		};
	} catch (e) {
		console.error(e);
		throw error(404, 'Post not found');
	}
}
