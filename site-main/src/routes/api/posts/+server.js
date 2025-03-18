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
   * @property {Array<{ depth: number, text: string }>} headings  // new property!
   */

  /** @type {Post[]} */
  let posts = [];

  // Import compiled modules with metadata
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

  // Sort posts by date (newest first)
  posts = posts.sort(
    (first, second) => new Date(second.date).getTime() - new Date(first.date).getTime()
  );

  return posts;
}

export async function GET() {
  const posts = await getPosts();
  console.log(posts);
  return json(posts);
}
