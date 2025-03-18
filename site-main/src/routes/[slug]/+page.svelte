<script lang="js">
  import { formatDate } from '$lib/utils';
  import Quiz from '$components/Quiz.svelte';
  export let data;
  console.log("data", data);
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

  {#if data.quiz && data.quiz.length > 0}
    <!-- Assuming you want the first quiz from the array -->
    <Quiz quiz={data.quiz[0].data.default} />
  {/if}
</article>

<style>
  article {
    color: var(--gray-5);
    width: 1200px;
  }

  h1 {
    text-transform: capitalize;
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
</style>
