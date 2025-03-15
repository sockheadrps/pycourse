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

	let ready = false;
	onMount(() => {
		const element = document.getElementById('element');

		if (element) {
			element.animate(
				[
					{ opacity: 0, transform: 'scale(0.8)' },
					{ opacity: 1, transform: 'scale(1)' }
				],
				{
					duration: 800,
					easing: 'ease-out'
				}
			);
		}
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
	<main>
		<div id="element"><slot /></div>
	</main>
	<Footer />
</div>

<style>
	.layout {
		display: grid;
		min-height: 100vh;
		grid-template-rows: auto 1fr auto;
		margin-inline: auto;
		padding-inline: var(--size-6);
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
