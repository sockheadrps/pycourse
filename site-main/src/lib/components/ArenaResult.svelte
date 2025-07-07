<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';

	const dispatch = createEventDispatcher<{ close: void }>();

	export let playerChoice: 'rock' | 'paper' | 'scissors';
	export let opponentChoice: 'rock' | 'paper' | 'scissors';
	export let result: 'win' | 'lose' | 'tie';

	onMount(() => {
		// Auto-close after 5 seconds
		const timer = setTimeout(() => {
			dispatch('close');
		}, 5000);
		return () => clearTimeout(timer);
	});

	function close() {
		dispatch('close');
	}
</script>

<div class="arena-modal">
	<div class="arena-content">
		<h2>Game Result</h2>
		<div class="results">
			<div class="result">
				<h3>You</h3>
				{#if playerChoice}
					<img src={`/assets/${playerChoice}.png`} alt={playerChoice} />
				{/if}
			</div>
			<div class="result">
				<h3>Opponent</h3>
				{#if opponentChoice}
					<img src={`/assets/opponent${opponentChoice}.png`} alt={opponentChoice} />
				{/if}
			</div>
		</div>
		<p class="outcome">
			{#if result === 'win'}
				🎉 You win!
			{:else if result === 'lose'}
				😢 You lose.
			{:else}
				🤝 It's a tie.
			{/if}
		</p>
		<button class="close" on:click={close}>Close</button>
	</div>
</div>

<style>
	.arena-modal {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.arena-content {
		background: #2c2f36;
		padding: 2rem;
		border-radius: 8px;
		text-align: center;
		color: white;
		min-width: 300px;
	}

	.results {
		display: flex;
		justify-content: center;
		gap: 2rem;
		margin-top: 1rem;
	}

	.result img {
		width: 100px;
		height: 100px;
		object-fit: contain;
	}

	.outcome {
		margin-top: 1rem;
		font-size: 1.5rem;
		font-weight: bold;
	}

	.close {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		background: #e74c3c;
		color: white;
		cursor: pointer;
		transition: background 0.2s;
	}

	.close:hover {
		background: #c0392b;
	}
</style>
