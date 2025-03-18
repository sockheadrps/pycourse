export async function load({ fetch }) {
  const response = await fetch('/api/posts');
  const { posts, quizzes } = await response.json();
  console.log(posts);
  return { posts, quizzes };
}
