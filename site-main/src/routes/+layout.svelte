<script lang="ts">
	import Footer from './footer.svelte';
	import Header from './header.svelte';
	import './app.css';

	import 'open-props/style';
	import 'open-props/normalize';
	import 'open-props/buttons';
	import '../app.css';
	import { supabase } from '$lib/supabase';
	import { onMount } from 'svelte';
	import { invalidateAll, onNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { session } from '$lib/stores/session'; // Import the session store
	



	onMount(() => {
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event, newSession) => {
			session.set(newSession); // Store the session in the session store
			invalidateAll();
		});
		return async () => {
			subscription.unsubscribe();
		};
	});

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<div class="layout">
	<Header />
	<main class="container">
		<div id="element"><slot /></div>
	</main>
	<Footer />
</div>

<style>
	.layout {
		width: 1200px;
		margin: 0 auto;
		padding: 0 2rem;
		display: grid;
		grid-template-rows: auto 1fr auto;
		grid-template-columns: 1fr;
		gap: 0;
		box-sizing: border-box;
	}

	.container {
		flex: 1;
		margin-top: 2rem;
		padding: 0 1rem;
		max-width: 1200px;
		margin-left: auto;
		margin-right: auto;
	}

	@media (min-width: 768px) {
		.container {
			margin-top: 4rem;
			padding: 0 2rem;
		}
	}

	@keyframes slideInFromLeft {
		0% {
			transform: translateX(-100%);
			opacity: 0;
		}
		100% {
			transform: translateX(0);
			opacity: 1;
		}
	}

	.slide-in-left {
		animation: slideInFromLeft 0.6s ease-out forwards;
	}
</style>
