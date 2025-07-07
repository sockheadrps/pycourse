<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { onMount, onDestroy } from 'svelte';

	const dispatch = createEventDispatcher<{
		choice: 'rock' | 'paper' | 'scissors';
		cancel: void;
	}>();

	export let activeChallenger: { username: string; wager: number };
	export let isChallenger: boolean = false;
	export let countdown: number = 10;
	export let playerChoice: 'rock' | 'paper' | 'scissors' | null = null;
	export let opponentChoice: 'rock' | 'paper' | 'scissors' | null = null;
	export let result: 'win' | 'lose' | 'tie' | null = null;

	let timer: ReturnType<typeof setInterval>;

	onMount(() => {
		timer = setInterval(() => {
			if (countdown > 0) {
				countdown--;
			} else {
				clearInterval(timer);
				const choices: ('rock' | 'paper' | 'scissors')[] = ['rock', 'paper', 'scissors'];
				const randomChoice = choices[Math.floor(Math.random() * choices.length)];
				handleChoice(randomChoice);
			}
		}, 1000);
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});

	function handleChoice(choice: 'rock' | 'paper' | 'scissors') {
		clearInterval(timer);
		dispatch('choice', choice);
	}

</script>

<div class="arena-modal">
	<div class="arena-content">
		<h2>{isChallenger ? 'Your Challenge' : 'Challenge from'} {activeChallenger.username}</h2>
		<p>Wager: {activeChallenger.wager} tokens</p>

		{#if !playerChoice && !opponentChoice}
			<div class="countdown">
				<span class="timer">{countdown}</span>
				<span class="timer-label">seconds to choose</span>
			</div>

			<div class="choices">
				<button on:click={() => handleChoice('rock')}>Rock 🪨</button>
				<button on:click={() => handleChoice('paper')}>Paper 📄</button>
				<button on:click={() => handleChoice('scissors')}>Scissors ✂️</button>
			</div>

		{:else if playerChoice && opponentChoice}
			<div class="results">
				<div class="result">
					<h3>You</h3>
					<img src={`/assets/${playerChoice}.png`} alt={playerChoice} />
				</div>
				<div class="result">
					<h3>Opponent</h3>
					<img src={`/assets/opponent${opponentChoice}.png`} alt={opponentChoice} />
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
			<button class="cancel" on:click={handleCancel}>Close</button>
		{/if}
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

	.countdown {
		margin: 1rem 0;
		font-size: 1.2rem;
	}

	.timer {
		font-size: 2rem;
		font-weight: bold;
		color: #ffce00;
	}

	.choices {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin: 2rem 0;
	}

	.choices button {
		padding: 1rem 2rem;
		font-size: 1.2rem;
		border: none;
		border-radius: 4px;
		background: #4d90fe;
		color: white;
		cursor: pointer;
		transition: background 0.2s;
	}

	.choices button:hover {
		background: #357abd;
	}

	.cancel {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		background: #e74c3c;
		color: white;
		cursor: pointer;
		transition: background 0.2s;
	}

	.cancel:hover {
		background: #c0392b;
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
</style>
