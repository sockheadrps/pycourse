import { error } from '@sveltejs/kit';

export async function load({ params }) {
  // Grab all .svx files in posts, including subdirectories
  const posts = import.meta.glob('../../posts/**/*.svx');

  // Find the module that matches the slug
  const match = Object.entries(posts).find(([path]) => {
    // Extract the filename (e.g., "abstractions-and-design.svx")
    const fileName = path.split('/').pop();
    // Remove the extension to get the slug
    const slug = fileName.replace('.svx', '');
    return slug === params.slug;
  });

  if (!match) {
    throw error(404, 'Post not found');
  }

  // Load the module
  const postModule = await match[1]();

  return {
    content: postModule.default,
    meta: postModule.metadata,
    frameSrc: postModule.frameSrc
  };
}
