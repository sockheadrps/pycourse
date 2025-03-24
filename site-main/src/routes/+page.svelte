<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, scale, fly } from 'svelte/transition';
	import { quintIn, quintInOut, quintOut } from 'svelte/easing';
	import { formatDate } from '$lib/utils';
	import { session } from '$lib/stores/session';
	let readPostSlugs: string[] = [];
	import Timeline from '../components/Timeline.svelte';

	/**
	 * @typedef {Object} Heading
	 * @property {number} depth
	 * @property {string} text
	 */
	interface Heading {
		depth: number;
		text: string;
	}

	/**
	 * @typedef {Object} Post
	 * @property {string} title
	 * @property {string} date
	 * @property {string} description
	 * @property {string} slug
	 * @property {string} stage
	 * @property {Heading[]} [headings]
	 */
	interface Post {
		title: string;
		date: string;
		description: string;
		slug: string;
		stage: string;
		headings?: Heading[];
	}

	/**
	 * @typedef {Object} PageData
	 * @property {string} title
	 * @property {Post[]} posts
	 * @property {any} session
	 */
	interface PageData {
		title: string;
		posts: Post[];
	}

	export let data: PageData;

	let ready = false;
	let stages: string[] = [];
	let selectedStage = 'stg1';
	let filteredPosts: Post[] = [];
	let hoveredPost: Post | null = null;
	import { supabase } from '$lib/supabase';

	let timelineSteps: { label: string; active: boolean }[] = [];

	function getStageLabel(stage: string): string {
		const num = stage.match(/\d+/);
		return num ? `Stage ${num[0]}` : stage;
	}

	// Build the array of timeline steps from your stages
	function updateTimelineSteps(): void {
		timelineSteps = stages.map((stage, i) => ({
			label: getStageLabel(stage),
			// Mark as "active" if it's before or equal to the selected stage
			active: i <= stages.indexOf(selectedStage)
		}));
	}

	onMount(async () => {
		stages = Array.from(new Set(data.posts.map((post) => post.stage).filter(Boolean)));
		if (stages.length === 0) {
			stages = ['stg1'];
		}

		// If "stg1" is present, default to that; otherwise pick the first stage
		selectedStage = stages.includes('stg1') ? 'stg1' : stages[0];
		filteredPosts = data.posts.filter((post) => post.stage === selectedStage);

		// Initialize the timeline steps
		updateTimelineSteps();
		const unsubscribe = session.subscribe(async ($session) => {
		if ($session?.user) {
			const { data: readData, error } = await supabase
				.from('read_posts')
				.select('read_posts')
				.eq('user_id', $session.user.id)
				.single();

			if (!error && readData?.read_posts) {
				readPostSlugs = readData.read_posts;
			}
		}
	});
	ready = true;

	return unsubscribe; // cleanup on destroy

	});

	// Whenever selectedStage changes, rebuild the timeline steps
	// and re-filter the posts
	$: if (ready) {
		filteredPosts = data.posts.filter((post) => post.stage === selectedStage);
		updateTimelineSteps();
	}

	// Called when a timeline bubble is clicked
	function handleSelect(event: CustomEvent<{ index: number }>): void {
		const { index } = event.detail;
		// Set the selected stage based on the clicked bubble index
		selectedStage = stages[index];
		hoveredPost = null;
	}
</script>

<svelte:head>
	<title>{data.title}</title>
</svelte:head>

<Timeline steps={timelineSteps} on:select={handleSelect} />
{#if ready}
	<div class="layout-holder">
		<div class="layout">
			<section class="posts-container">
				{#key selectedStage}
					<ul class="posts" in:fly={{ duration: 200, delay: 300, easing: quintOut }}>
						{#each filteredPosts as post}
							<li
								on:mouseenter={() => (hoveredPost = post)}
								class:hovered={hoveredPost && hoveredPost.slug === post.slug}
							>
								<a class="post" href={post.slug}>
									<div class="post-content">
										<div class="container">
											<h2 class="post-title">
												{post.title}
											</h2>
											<time class="post-date">{formatDate(post.date)}</time>
											<p class="post-description">{post.description}</p>
										</div>
										<div class="post-status">
											{#if readPostSlugs && readPostSlugs.includes(post.slug)}
												<span class="checkmark" title="Read">✅ read</span>
											{:else}
												<span class="checkmark" title="Not read">❌ not read</span>
											{/if}
										</div>
									</div>
								</a>
							</li>
						{/each}
					</ul>
				{/key}
			</section>

			{#if hoveredPost && hoveredPost.headings && hoveredPost.headings.length > 0}
				{#key hoveredPost.slug}
					<aside class="headings-sidebar">
						<div>
							<h2 in:fade={{ duration: 200, delay: 300, easing: quintOut }}>{hoveredPost.title}</h2>
							<ul in:fade={{ duration: 200, delay: 300, easing: quintOut }}>
								{#each hoveredPost.headings as heading}
									<li class="heading-item" style="margin-left: {(heading.depth - 1) * 10}px;">
										{heading.text}
									</li>
								{/each}
							</ul>
						</div>
					</aside>
				{/key}
			{/if}
		</div>
	</div>
{/if}

<style>
	button {
		all: unset;
	}
	.auth-button {
		cursor: pointer;
		color: var(--blue-4);
		font-size: 1.2rem;
		font-weight: 500;
		text-decoration: underline;
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
		overflow-y: auto;
	}

	.post-content {
		display: grid;
		grid-template-columns: auto; /* Main content */
		align-items: center;
	}

	.container {
		display: flex;
		flex-direction: column;
	}

	.post-status {
		margin:0;
		padding:0;
		display: flex;
		justify-content: right;
		align-items: center;
		opacity: 0.5;
	}

	/* Posts container takes 1/3 of the space */
	.posts-container {
		/* Let it fill nearly the entire viewport height */
		height: calc(100vh - 60px); /* subtract header/footer height as needed */
		overflow-y: auto;
		position: relative; /* allows "z-index" layering if needed */
		z-index: 1; /* so the footer can appear above it if desired */
	}
	.posts-container h1 {
		margin: 0 0 1rem;
	}
	.checkmark {
		display: block;
		font-size: 0.9rem;
		color: var(--green-4);
		opacity: 0.75;
	}
	.posts {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		margin-top: 1rem;
	}

	/* Post styling */
	.post {
		display: block;
		padding-left: 1rem;
		padding-right: 1rem;
		padding-top: 1rem;
		padding-bottom: 0.5rem;
		border: 1px solid #444;
		border-radius: 4px;
		background-color: #1a1a1a;
		text-decoration: none;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
		box-sizing: border-box;
		margin-bottom: 1rem;
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
		color: var(--blue-4);
	}
	.post-date {
		display: block;
		margin-bottom: 0.5rem;
		color: var(--text-2);
	}
	.post-description {
		margin: 0;
		color: var(--stone-5);
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
		z-index: 10;
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

	/* Media queries for phones */
	@media (max-width: 600px) {
		.layout {
			padding: 0;
			margin: 0;
			grid-template-columns: 1fr;
		}

		.posts-container {
			grid-column: 1 / -1;
		}
		.post {
			display: block;
			padding: 1rem;
			border: 1px solid #444;
			border-radius: 4px;
			background-color: #1a1a1a;
			text-decoration: none;
			font-size: 0.8rem;
			transition:
				transform 0.2s ease,
				box-shadow 0.2s ease;
			box-sizing: border-box;
			margin: 0;
			width: 40%;
		}

		.post-title {
			margin: 0 0 0.5rem;
			font-size: 1rem;
			color: var(--blue-4);
		}
		.post-date {
			display: block;
			margin-bottom: 0.5rem;
			font-size: 0.8rem;
			color: var(--text-2);
		}
		.post-description {
			margin: 0;
			color: var(--stone-5);
			font-size: 0.9rem;
		}

		.headings-sidebar {
			grid-column: 1 / -1;
			margin-top: 1rem;
		}

		.stage-bar {
			flex-direction: column;
			width: 100%;
			margin: 1rem 0;
		}

		.stage-bar button {
			width: 100%;
			text-align: center;
			margin: 0.25rem 0;
		}
	}
</style>
