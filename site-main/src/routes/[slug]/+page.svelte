<script lang="js">
	import { formatDate } from '$lib/utils';
	import { setContext } from 'svelte';
  import GitHubButton from '$components/GitHubButton.svelte';

	export let data;
</script>

<svelte:head>
  <title>{data.meta.title}</title>
  <meta property="og:type" content="article" />
  <meta property="og:title" content={data.meta.title} />
  <meta name="author" content={data.meta.author} />
</svelte:head>

<article class="post">
	<div class="post-header">
		<h1 class="post-title">{data.meta.title}</h1>
	</div>
	<hgroup style="display: flex; justify-content: space-between; align-items: center;">
		<p>Published on {formatDate(data.meta.date)}</p>
    <div class="github-button-container">
      <GitHubButton username={data.meta.author} />
    </div>
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
</article>

<style>
	article {
		width: 1200px;
		margin: 0 auto;
	}

  .github-button-container {
    margin-top: 1rem;
  }

	.post-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--surface-2);
	}

	.post-title {
		color: var(--stone-5);
		font-size: 2rem;
		width: 100%;
		max-width: 100%;
	}

	.tags {
		display: flex;
		gap: var(--size-3);
		margin-top: var(--size-7);
	}

	.tags > * {
		padding: var(--size-2) var(--size-3);
		border-radius: var(--radius-round);
		background-color: var(--surface-2);
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
