import { json } from '@sveltejs/kit';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';

/**
 * Extract headings from a markdown string.
 * @param {string} markdown
 * @returns {Array<{ depth: number, text: string }>}
 */
function extractHeadings(markdown) {
  const tree = unified().use(remarkParse).parse(markdown);
  const headings = [];
  visit(tree, 'heading', (node) => {
    // Extract text from heading children
    const text = node.children
      .filter(child => child.type === 'text')
      .map(child => child.value)
      .join('');
    headings.push({
      depth: node.depth,
      text
    });
  });
  return headings;
}

async function getPosts() {
  /** @typedef {Object} Post
   * @property {string} title
   * @property {string} date
   * @property {string} content
   * @property {string} slug
   * @property {boolean} published
   * @property {string[]} categories
   * @property {number} [index]         // provided in the markdown frontmatter
   * @property {Array<{ depth: number, text: string }>} headings
   */

  /** @type {Post[]} */
  let posts = [];

  // Import compiled modules with metadata for .svx
  const modules = import.meta.glob('/src/posts/**/*.svx', { eager: true });
  // Import raw content for heading extraction
  const raws = import.meta.glob('/src/posts/**/*.svx', { eager: true, as: 'raw' });

  for (const path in modules) {
    /** @type {{ metadata: Post }} */
    const file = /** @type {{ metadata: Post }} */ (modules[path]);
    const rawContent = raws[path];
    const slug = path.split('/').at(-1)?.replace('.svx', '') || '';
    const metadata = file.metadata;

    // Extract the stage from the file path.
    const segments = path.split('/');
    const postsIndex = segments.indexOf('posts');
    let stage = '';
    if (postsIndex !== -1 && segments.length > postsIndex + 1) {
      stage = segments[postsIndex + 1];
    }

    // Extract headings from the raw markdown content
    const headings = extractHeadings(rawContent);

    const post = { ...metadata, slug, stage, headings };
    if (post.published) {
      posts.push(post);
    }
  }

  // Sort by index if present, otherwise by date, etc.
  posts = posts.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  return posts;
}
function parseQuizFilename(path) {
  // e.g. path = "/src/posts/stg1/quiz-2-1.json"
  const fileName = path.split('/').pop().replace('.json', ''); // "quiz-2-1"
  
  // Quick check to ensure it starts with "quiz-"
  if (!fileName.startsWith('quiz-')) {
    return { postIndex: null, quizIndex: null };
  }

  // fileName.split('-') => ["quiz", "2", "1"]
  const parts = fileName.split('-');
  return {
    postIndex: parseInt(parts[1], 10),  // "2" -> 2
    quizIndex: parseInt(parts[2], 10)   // "1" -> 1
  };
}

/**
 * Gather all quiz JSON files in /src/posts/stg[x]
 */
async function getQuizzes() {
  // Import all .json quiz files in /src/posts/... subfolders
  const quizFiles = import.meta.glob('/src/posts/**/*.json', { eager: true });
  const quizzes = [];

  for (const path in quizFiles) {
    // Each quiz file is already parsed into an object
    const data = quizFiles[path];

    // Parse the stage folder (like "stg1") if needed
    const segments = path.split('/');
    const postsIndex = segments.indexOf('posts');
    let stage = '';
    if (postsIndex !== -1 && segments.length > postsIndex + 1) {
      stage = segments[postsIndex + 1]; // e.g. "stg1"
    }

    // Parse the postIndex and quizIndex from the filename
    const { postIndex, quizIndex } = parseQuizFilename(path);

    // Push a quiz object with indices, stage, and data
    quizzes.push({
      stage,
      postIndex,
      quizIndex,
      data
    });
  }

  return quizzes;
}




export async function GET() {
  const posts = await getPosts();      // your existing .svx logic
  const quizzes = await getQuizzes();  // new quiz logic
  return json({ posts, quizzes });
}
