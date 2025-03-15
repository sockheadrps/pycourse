import { json } from '@sveltejs/kit';

async function getPosts() {
	/**
	 * @typedef {Object} Post
	 * @property {string} title - The title of the post
	 * @property {string} date - The date of the post
	 * @property {string} content - The content of the post
	 * @property {string} slug - The slug of the post
	 * @property {boolean} published - The file path
	 * @property {string[]} categories - The categories of the post
	 */

	/** @type {Post[]} */
	let posts = [];

	const paths = import.meta.glob('/src/posts/*.svx', {
		eager: true
	});

	/**
	 * @property {string} file.metadata - The file path of the post
	 */
	for (const path in paths) {
		/**
		 * @type {{ metadata: Post }}
		 */
		const file = /** @type {{ metadata: Post }} */ (paths[path]); // JSDoc type cast
		const slug = path.split('/').at(-1)?.replace('.svx', '') || '';
		const metadata = file.metadata;
		const post = { ...metadata, slug };
		post.published && posts.push(post);
	}

	posts = posts.sort(
		(first, second) => new Date(second.date).getTime() - new Date(first.date).getTime()
	);

	return posts;
}

export async function GET() {
	const posts = await getPosts();
	return json(posts);
}
