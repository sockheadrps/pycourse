import { json } from '@sveltejs/kit';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';




/**
 * Gather all quiz JSON files in /src/posts/stg[x]
 */
async function getQuizzes(endpoint) {
	const quizModules = import.meta.glob('/src/posts/**/*.json', { eager: true });
	const quizzes = {};

	for (const path in quizModules) {
		const file = path.split('/').pop(); // e.g. loops.json
		const module = quizModules[path];

		if (module?.default) {
			quizzes[file] = module.default;
		}
	}

	return quizzes;
}





export async function POST({ request }) {
  const { endpoint } = await request.json();
  const quizzes = await getQuizzes(endpoint);  // new quiz logic
  return json({ quizzes });
}

