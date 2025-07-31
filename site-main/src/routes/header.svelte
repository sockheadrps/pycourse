<script lang="ts">
	import * as config from '$lib/config';
	import { session } from '$lib/stores/session';
	import { guides } from '$lib/stores/guides';
	import { supabase } from '$lib/supabase';
	import Settings from 'lucide-svelte/icons/settings';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import { guideServerUrl } from '$lib/config.js';
	import { onMount } from 'svelte';

	let dropdownOpen = false;
	let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		guides.fetchGuides();
	});

	function openDropdown() {
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
			hoverTimeout = null;
		}
		dropdownOpen = true;
	}

	function closeDropdown() {
		dropdownOpen = false;
	}

	function handleMouseEnter() {
		openDropdown();
	}

	function handleMouseLeave() {
		hoverTimeout = setTimeout(() => {
			closeDropdown();
		}, 150); // Small delay to prevent accidental closing
	}

	// Add event listener for clicking outside
	onMount(() => {
		guides.fetchGuides();
	});
</script>

<div class="glass-navbar">
	<nav class="nav-container">
		<a href="/" class="title">
			{config.title}
		</a>

		<ul class="links">
			<li><a href="/about">About</a></li>
			<li><a href="https://chat.socksthoughtshop.lol/chat">Chat</a></li>
			<li><a href="https://palindrome.socksthoughtshop.lol/monitor" target="_blank">MLPalindrome</a></li>
			
			<!-- Guides Dropdown -->
			<li class="dropdown-container" on:mouseenter={handleMouseEnter} on:mouseleave={handleMouseLeave}>
				<button class="dropdown-trigger">
					Guides
					<ChevronDown size={16} class="chevron" />
				</button>
				{#if dropdownOpen}
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<div class="dropdown-menu" on:mouseenter={handleMouseEnter} on:mouseleave={handleMouseLeave} on:click|stopPropagation>
						{#if $guides.loading}
							<div class="dropdown-item loading">Loading guides...</div>
						{:else if $guides.error}
							<div class="dropdown-item error">Error loading guides</div>
						{:else if $guides.guides.length === 0}
							<div class="dropdown-item empty">No guides available</div>
						{:else}
							{#each $guides.guides as guide}
								<a href={`${guideServerUrl}/guides/${guide.slug}/tutorial`} 
								   target="_blank" 
								   class="dropdown-item">
									<div class="guide-title">{guide.title}</div>
									{#if guide.description}
										<div class="guide-description">{guide.description}</div>
									{/if}
								</a>
							{/each}
						{/if}
					</div>
				{/if}
			</li>
			
			{#if $session}
			  <li class="dropdown-container"><a href="/logout" on:click|preventDefault={() => supabase.auth.signOut()}>Logout</a></li>
			  <li class="dropdown-container"><a href="/account" class="icon-link"><Settings size={20} /></a></li>
			{:else}
			  <li class="dropdown-container"><a href="/login">Login</a></li>
			{/if}
		  </ul>
	</nav>
</div>

<style>
	/* Glass-like container */
	.glass-navbar {
		background: rgba(255, 255, 255, 0.06);
		backdrop-filter: blur(10px);
		padding-top: 1rem;
		padding-bottom: 1rem;
		margin-bottom: 1rem;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		box-shadow: var(--shadow-3);
		display: flex;
		justify-content: center;
	}

	/* Container for nav to match the width of the main container */
	.nav-container {
		width: 100%;
		max-width: 1200px;
		padding: 0 2rem;
		box-sizing: border-box;
	}

	/* Horizontal nav bar by default */
	nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}

	/* Title link styling */
	.title {
		color: var(--gray-6);
		text-decoration: none;
		font-weight: bold;
		font-size: 1.5rem;
		transition: color 0.3s ease, text-shadow 0.3s ease;
	}

	.title:hover {
		color: var(--gray-4);
		text-shadow: 0 0 10px rgba(255, 255, 255, 0.181);
	}

	/* Horizontal link list */
	.links {
		display: flex;
		gap: 1.5rem;
		list-style: none;
	}

	.links a {
		color: var(--gray-6);
		text-decoration: none;
		font-size: 1rem;
		transition: color 0.3s ease, text-shadow 0.3s ease;
		
	}

	.links a:hover {
		color: var(--gray-4);
		text-shadow: 0 0 10px rgba(255, 255, 255, 0.181);
	}

	.icon-link {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Dropdown Styles */
	.dropdown-container {
		position: relative;
		color: var(--gray-6);
		text-decoration: none;
		font-size: 1rem;
		transition: color 0.3s ease, text-shadow 0.3s ease;
		box-shadow: none;
		margin: 0;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		display: flex;
		align-items: center;
	}

	.dropdown-trigger {
		/* reset all styles */
		all: unset;
		background: none;
		border: none;
		color: var(--gray-6);
		text-decoration: none;
		font-size: 1rem;
		cursor: pointer;
		display: flex;
		
		align-items: center;
		gap: 0.25rem;
		transition: color 0.3s ease, text-shadow 0.3s ease;
		padding: 0;
	}

	.dropdown-trigger:hover {
		color: var(--gray-4);
		text-shadow: 0 0 10px rgba(255, 255, 255, 0.181);
	}

	.chevron {
		transition: transform 0.3s ease;
		margin-left: 0.25rem;
	}

	.dropdown-container:hover .chevron {
		transform: rotate(180deg);
	}

	.dropdown-menu {
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(255, 255, 255, 0.06);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		min-width: 280px;
		max-width: 350px;
		max-height: 400px;
		overflow-y: auto;
		z-index: 1000;
		box-shadow: var(--shadow-3);
		margin-top: 0.5rem;
	}

	.dropdown-item {
		display: block;
		padding: 0.75rem 1rem;
		color: var(--gray-6);
		text-decoration: none;
		transition: color 0.3s ease, text-shadow 0.3s ease, background-color 0.2s ease;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.dropdown-item:last-child {
		border-bottom: none;
	}

	.dropdown-item:hover {
		background-color: rgba(255, 255, 255, 0.05);
		color: var(--gray-4);
		text-shadow: 0 0 10px rgba(255, 255, 255, 0.181);
	}

	.dropdown-item.loading,
	.dropdown-item.error,
	.dropdown-item.empty {
		color: var(--gray-5);
		font-style: italic;
		cursor: default;
	}

	.dropdown-item.error {
		color: #ff6b6b;
	}

	.guide-title {
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.guide-description {
		font-size: 0.85rem;
		color: var(--gray-5);
		line-height: 1.3;
	}

	/* Media queries for phones */
	@media (max-width: 600px) {
		nav {
			align-items: center;
			margin-right: 4rem;
		}

		.title {
			font-size: 1.2rem;
		}

		.links {
			flex-direction: column;
			gap: 0.5rem;
			font-size: 0.9rem;
		}

		.dropdown-menu {
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 90vw;
			max-width: 350px;
			max-height: 60vh;
			background: rgba(255, 255, 255, 0.06);
			backdrop-filter: blur(10px);
		}
	}
</style>
