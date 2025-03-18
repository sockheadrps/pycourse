<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { fly } from 'svelte/transition';
	import { formatDate } from '$lib/utils';

	/**
	 * @typedef {Object} Heading
	 * @property {number} depth
	 * @property {string} text
	 */
	/**
	 * @typedef {Object} Post
	 * @property {string} title
	 * @property {string} date
	 * @property {string} description
	 * @property {string} slug
	 * @property {string} stage
	 * @property {Heading[]} [headings]
	 */
	/**
	 * @typedef {Object} PageData
	 * @property {string} title
	 * @property {Post[]} posts
	 */

	/** @type {PageData} */
	export let data;

	let ready = false;
	let stages = [];
	let selectedStage = 'stg1';
	let filteredPosts = [];
	// The post that remains "hovered" (sticky) until a new one is hovered.
	let hoveredPost = null;

	function getStageLabel(stage) {
		const num = stage.match(/\d+/);
		return num ? `Stage ${num[0]}` : stage;
	}

	onMount(() => {
		stages = Array.from(new Set(data.posts.map((post) => post.stage).filter(Boolean)));
		if (stages.length === 0) {
			stages = ['stg1'];
		}
		selectedStage = stages.includes('stg1') ? 'stg1' : stages[0];
		filteredPosts = data.posts.filter((post) => post.stage === selectedStage);
		ready = true;
	});

	// Update filteredPosts when selectedStage changes.
	$: if (ready) {
		filteredPosts = data.posts.filter((post) => post.stage === selectedStage);
	}
</script>

<svelte:head>
	<title>{data.title}</title>
</svelte:head>

<!-- Stage Navigation Bar -->
<nav class="stage-bar">
	{#if ready}
		{#each stages as stage}
			<button
				class:active={selectedStage === stage}
				on:click={() => {
					hoveredPost = null; // reset sticky hover on stage change
					selectedStage = stage;
				}}
			>
				{getStageLabel(stage)}
			</button>
		{/each}
	{/if}
</nav>

{#if ready}
	<div class="layout" in:fade|local={{ y: 20, duration: 300 }} out:fade|local={{ y: -20, duration: 300 }}>
		<section class="posts-container">
			<h1>{data.title}</h1>
			{#key selectedStage}
				<ul
					class="posts"
					in:fade|local={{ delay: 200, duration: 200 }}

				>
					{#each filteredPosts as post}
						<li
							on:mouseenter={() => (hoveredPost = post)}
							class:hovered={hoveredPost && hoveredPost.slug === post.slug}
						>
							<a class="post" href={post.slug}>
								<h2 class="post-title">{post.title}</h2>
								<time class="post-date">{formatDate(post.date)}</time>
								<p class="post-description">{post.description}</p>
							</a>
						</li>
					{/each}
				</ul>
			{/key}
		</section>

		<!-- The sidebar is always rendered (keeping layout width constant)
		     Its content fades in/out. -->
		{#if hoveredPost && hoveredPost.headings && hoveredPost.headings.length > 0}
			<aside class="headings-sidebar">
				<div in:fade|local={{ delay: 200, duration: 200 }}>
					<h2>{hoveredPost.title}</h2>
					<ul>
						{#each hoveredPost.headings as heading}
							<li class="heading-item" style="margin-left: {(heading.depth - 1) * 10}px;">
								{heading.text}
							</li>
						{/each}
					</ul>
				</div>
			</aside>
		{/if}
	</div>
{/if}

<style>
	button {
		all: unset;
	}
	/* Overall layout: fixed width with spacing */
	.layout {
		width: 1200px;
		margin: 0 auto;
		padding: 0 2rem;
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: 1rem;
		align-items: flex-start;
		box-sizing: border-box;
	}

	/* Posts container takes 1/3 of the space */
	.posts-container {
		grid-column: 1;
	}
	.posts-container h1 {
		margin: 0 0 1rem;
	}

	.posts {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Post styling */
	.post {
		display: block;
		padding: 1rem;
		border: 1px solid #444;
		border-radius: 4px;
		background-color: #1a1a1a;
		color: #fff;
		text-decoration: none;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
		box-sizing: border-box;
	}
	.post:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.463);
		border: 1px solid #636363;
	}
	li.hovered .post {
		transform: translateY(-2px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.463);
	}
	.post-title {
		margin: 0 0 0.5rem;
		font-size: 1.25rem;
	}
	.post-date {
		display: block;
		margin-bottom: 0.5rem;
		color: #999;
	}
	.post-description {
		margin: 0;
	}

	/* Headings sidebar takes 2/3 of the space */
	.headings-sidebar {
		grid-column: 2;
		background-color: #2b2b2b;
		padding: 1rem;
		border-radius: 6px;
		border: 1px solid #444;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
		max-height: 80vh;
		overflow-y: auto;
		box-sizing: border-box;
		margin-top: 1rem;
	}
	.headings-sidebar h2 {
		margin: 0 0 1rem;
		font-size: 1.1rem;
		border-bottom: 1px solid #444;
		padding-bottom: 0.5rem;
		color: #fff;
	}
	.headings-sidebar ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.heading-item {
		color: #ccc;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
		cursor: pointer;
		transition: color 0.2s ease;
	}
	.heading-item:hover {
		color: #fff;
	}

	/* Stage Navigation Bar */
	.stage-bar {
		display: flex;
		align-items: center;
		width: fit-content;
		margin: 1rem auto;
		background-color: #3a3f4b;
		border-radius: 9999px;
		padding: 0.25rem;
		gap: 0;
	}
	.stage-bar button {
		appearance: none;
		-webkit-appearance: none;
		border: none;
		outline: none;
		cursor: pointer;
		padding: 0.5rem 1rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: #ccc;
		background: transparent;
		border-radius: 9999px;
		transition:
			background-color 0.2s ease,
			color 0.2s ease;
	}
	.stage-bar button + button {
		margin-left: 0.25rem;
	}
	.stage-bar button:hover:not(.active) {
		text-decoration: underline;
	}
	.stage-bar button:focus {
		text-decoration: underline;
	}
	.stage-bar button.active {
		color: #fff;
		text-decoration: underline;
	}
</style>
