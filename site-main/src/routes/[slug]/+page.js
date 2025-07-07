import { error } from '@sveltejs/kit';

export async function load({ params, fetch }) {
	// Grab all .svx files in posts, including subdirectories
	const posts = import.meta.glob('../../posts/**/*.svx');

	// Find the module that matches the slug
	const match = Object.entries(posts).find(([path]) => {
		const fileName = path.split('/').pop();
		const slug = fileName.replace('.svx', '');
		return slug === params.slug;
	});

	if (!match) {
		throw error(404, 'Post not found');
	}

	// Load the markdown module
	const postModule = await match[1]();

	// Fetch the combined posts/quizzes data from your API endpoint
	const res = await fetch('/api/posts');
	const { quizzes } = await res.json();

	// Filter quizzes to get those that belong to this post.
	// Assumes the markdown frontmatter includes "index"
	const postIndex = postModule.metadata.index;
	const quizForThisPost = quizzes.filter((q) => q.postIndex === postIndex);

	return {
		content: postModule.default,
		meta: postModule.metadata,
		frameSrc: postModule.frameSrc,
		quiz: quizForThisPost
	};
}
