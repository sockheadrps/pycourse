<script lang="js">
	import { formatDate } from '$lib/utils';
	import GitHubButton from '$components/GithubButton.svelte';
	import { session } from '$lib/stores/session';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';

	onMount(async () => {
	if (!$session?.user) return;

	const userId = $session.user.id;
	const slug = $page.url.pathname.split('/').pop(); // replace with your actual slug logic
	if (!slug) return;

	try {
		// First check for the user's row
		let { data, error } = await supabase
			.from('read_posts')
			.select('read_posts')
			.eq('user_id', userId)
			.single(); // ensures we only get one row

		if (error && error.code !== 'PGRST116') {
			// 'PGRST116' = No rows found, fine in this case
			console.error('Error checking read_posts:', error.message);
			return;
		}

		if (!data) {
			// No row yet — insert it
			const { error: insertError } = await supabase
				.from('read_posts')
				.insert({
					user_id: userId,
					read_posts: [slug]
				});

			if (insertError) {
				console.error('Error inserting read_posts row:', insertError.message);
			} else {
				console.log('Inserted initial read_posts row with:', slug);
			}
		} else {
			const current = data.read_posts ?? [];

			if (!current.includes(slug)) {
				const updated = [...current, slug];
				const { error: updateError } = await supabase
					.from('read_posts')
					.update({ read_posts: updated })
					.eq('user_id', userId);

				if (updateError) {
					console.error('Error updating read_posts:', updateError.message);
				} else {
					console.log('Updated read_posts with:', slug);
				}
			}
		}
	} catch (e) {
		console.error('Unexpected error in read_posts tracking:', e);
	}
});


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
		margin-top: 2rem;
		margin-bottom: 5rem;
	}

	.github-button-container {
		margin-top: 1rem;
	}

	.post-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--surface-2);
		margin: 0;
		padding: 0;
	}

	.post-title {
		color: var(--stone-5);
		font-size: 2.5rem;
		width: 100%;
		max-width: 100%;
	}

	.tags {
		display: flex;
		gap: var(--size-3);
	}

	.tags > * {
		padding: var(--size-2) var(--size-3);
		border-radius: var(--radius-round);
		background-color: var(--surface-2);
		margin-top: -2rem;
	}

	p {
		font-size: 0.9rem;
		height: 100%;
		margin-top: -3rem;
		color: var(--stone-7);
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
