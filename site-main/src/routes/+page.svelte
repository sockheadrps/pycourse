<script>
  import { formatDate } from '$lib/utils';

  /**
   * @typedef {Object} Post
   * @property {string} title
   * @property {string} date
   * @property {string} description
   * @property {string} slug
   */

  /**
   * @typedef {Object} PageData
   * @property {string} title
   * @property {Post[]} posts
   */

  /** @type {PageData} */
  export let data;
</script>

<svelte:head>
  <title>{data.title}</title>
</svelte:head>

<section>
  <h1>{data.title}</h1>

  <ul class="posts">
    {#each data.posts as post}

      <li>
        <a class="post" href={post.slug}>
          <h2 class="post-title">{post.title}</h2>
          <time class="post-date">{formatDate(post.date)}</time>
          <p class="post-description">{post.description}</p>
        </a>
      </li>
    {/each}
  </ul>
</section>

<style>
  /* Example root-level sizing variables (tweak as needed) */


  section {
    margin-inline: auto;
    padding: var(--size-7) 1rem;
    /* You can keep max-inline-size if you want a content limit */
    width: 1200px;
    color: var(--gray-4);
  }

  .posts {
    list-style: none;
    margin: 0;
    padding: 0;
    /* Create a responsive grid for horizontal “cards” */
    display: grid;
    gap: var(--size-7);
    grid-template-rows: repeat(auto-fill, minmax(250px, 1fr));
  }

  /* Turn each item into a clickable card */
  .post {
    display: block;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: var(--size-7);
    color: inherit;
    text-decoration: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  /* Card hover effect */
  .post:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .post-title {
    margin: 0 0 var(--size-3);
    font-size: var(--font-size-fluid-3);
    text-transform: capitalize;
  }

  .post-date {
    display: block;
    margin-bottom: var(--size-3);
    color: var(--text-2);
  }

  .post-description {
    margin: 0;
  }
</style>
