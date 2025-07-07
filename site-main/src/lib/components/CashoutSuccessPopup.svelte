<script lang="ts">
	import { onMount } from 'svelte';
	export let title = 'Success!';
	export let visible = false;
	export let duration = 3000; // default to 3 seconds

	let container: HTMLDivElement | null = null;
	let timeoutId: number | null = null;

	// Watch visibility
	$: if (visible) {
		// Clear existing timer
		if (timeoutId) clearTimeout(timeoutId);

		// Automatically fade away after duration
		timeoutId = setTimeout(() => {
			visible = false;
			window.location.reload();
		}, duration);
	}
</script>

<div bind:this={container} class="popup-container" class:animate-in={visible}>
	<div class="popup-bar">
		<h3>{title}</h3>
	</div>
	<div class="popup-content">
		<slot />
	</div>
</div>

<style>
	.popup-container {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		max-width: 300px;
		background-color: #ffffff0f;
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
		color: #fff;
		box-sizing: border-box;
		transform: scale(0);
		opacity: 0;
		transition:
			transform 0.4s ease,
			opacity 0.4s ease;
		z-index: 9999;
	}

	.popup-container.animate-in {
		transform: scale(1);
		opacity: 1;
	}

	.popup-bar {
		background: linear-gradient(120deg, var(--green-7) 0%, var(--green-4) 100%);
		padding: 0.25rem 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.15);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.popup-bar h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #fff;
	}

	.popup-content {
		padding: 1rem;
		font-size: 0.9rem;
	}
</style>
