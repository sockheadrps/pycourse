<script lang="js">
  import { formatDate } from '$lib/utils';
  import Quiz from '$components/Quiz.svelte';
  import { setContext } from 'svelte';

  export let data;
  import { onMount } from 'svelte';

  onMount(() => {
    setContext('quiz', data.quiz);
  });
</script>

<svelte:head>
  <title>{data.meta.title}</title>
  <meta property="og:type" content="article" />
  <meta property="og:title" content={data.meta.title} />
</svelte:head>

<article>
  <hgroup>
    <h1>{data.meta.title}</h1>
    <p>Published on {formatDate(data.meta.date)}</p>
  </hgroup>

  <div class="tags">
    {#each data.meta.categories as category}
      <span class="surface-4">&num;{category}</span>
    {/each}
  </div>

  <div class="prose">
    <div class="content">
      <svelte:component this={data.content} />
    </div>
  </div>
<!-- 
  {#if data.quiz && data.quiz.length > 0}
    <Quiz quiz={data.quiz[0].data.default} />
  {/if} -->
</article>

<style>
  article {
    color: var(--gray-5);
    width: 1200px;
    margin: 0 auto;
  }

  h1 {
    text-transform: capitalize;
    font-size: 2rem;
  }

  h1 + p {
    margin-top: var(--size-2);
    color: var(--gray-6);
  }

  .tags {
    display: flex;
    gap: var(--size-3);
    margin-top: var(--size-7);
  }

  .tags > * {
    padding: var(--size-2) var(--size-3);
    border-radius: var(--radius-round);
  }
  
  .content {
    font-size: larger;
    padding: 14px;
  }

  /* Mobile Styles */
  @media (max-width: 767px) {
    article {
      width: 100%;
      padding: 1rem;
      margin-left: auto;
			margin-right: auto;
    }
    h1 {
      font-size: 1.5rem;
    }
    h1 + p {
      margin-top: 0.5rem;
      font-size: 0.9rem;
    }
    .content {
      font-size: 1rem;
      padding: 10px;
    }
    .tags {
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    .tags > * {
      padding: 0.5rem 0.75rem;
      font-size: 0.9rem;
    }
  }
</style>
