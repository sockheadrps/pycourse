<script>

  export let username = 'octocat';


  // Construct the full profile URL
  $: githubUrl = `https://github.com/${username}`;
</script>

<a
  href="{githubUrl}"
  target="_blank"
  rel="noopener noreferrer"
  class="github-button"
>
  {username}
</a>

<style>
  /* Basic Reset (optional) */
  a.github-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;

    /* Button-like styling */
    padding: 0.75rem 1.25rem;
    border: 2px solid var(--blue-7);
    border-radius: 0.5rem;
    background-color: transparent;
    color: var(--blue-7);
    cursor: pointer;
    font-weight: 600;
    text-decoration: none; /* remove underline for the link */
    transition: all 0.2s ease;
  }

  a.github-button:hover {
    background-color: var(--blue-7);
    color: #fff;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  a.github-button:active {
    transform: translateY(0);
    box-shadow: none;
  }
</style>
