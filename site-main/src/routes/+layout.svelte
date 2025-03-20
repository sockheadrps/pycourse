<script lang="ts">
	import Footer from './footer.svelte';
	import Header from './header.svelte';
	import './app.css';

	import 'open-props/style';
	import 'open-props/normalize';
	import 'open-props/buttons';
	import '../app.css';
	import { onNavigate } from '$app/navigation';
	import { onMount } from 'svelte';

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
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		margin-inline: auto;
		padding-inline: var(--size-6);
		background-color: var(--surface-4);
		padding-top: 2.5rem;
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
