import { json } from '@sveltejs/kit';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';




/**
 * Gather all quiz JSON files in /src/posts/stg[x]
 */
async function getQuizzes(endpoint) {
  // Import all .json quiz files in /src/posts/... subfolders
  const quizArray = import.meta.glob(`/src/posts/**/*.json`, { eager: true });
  console.log("quizArray", quizArray);

  // for (const path in quizArray) {
  //   // Each quiz file is already parsed into an object
  //   const data = quizArray[path];

  //   // Parse the stage folder (like "stg1") if needed
  //   const segments = path.split('/');
  //   const postsIndex = segments.indexOf('posts');
  //   let stage = '';
  //   if (postsIndex !== -1 && segments.length > postsIndex + 1) {
  //     stage = segments[postsIndex + 1]; // e.g. "stg1"
  //   }



  return quizArray;
}






export async function POST({ request }) {
  const { endpoint } = await request.json();
  const quizzes = await getQuizzes(endpoint);  // new quiz logic
	console.log("quizzes", quizzes);
  return json({ quizzes });
}

