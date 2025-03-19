<script lang="js">
	// Expect a quiz prop with questions: [{ question, answers, correct }, ...]
	export let quiz_index;
	import { getContext } from 'svelte';
	const value = getContext('quiz');
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { page } from '$app/stores';
	import { quintOut } from 'svelte/easing';
	let current_endpoint = $page.url.pathname.slice(1);
	let quiz = null;

	let currentQuestionIndex = 0;
	let selectedAnswer = null;
	let isAnswered = false;
	let feedback = '';
	let completed = false;
	let ready = false;
	let score = 0;

	onMount(async () => {
		await load().then((quizzes) => {
			quiz = quizzes.default[quiz_index];
		});
		ready = true;
	});

	async function load() {
		const response = await fetch('/api/quiz', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ endpoint: $page.url.pathname })
		});
		const { quizzes } = await response.json();
		let keys = Object.keys(quizzes);
		console.log('quizzes', quizzes);
		let target_quiz_name = '';
		for (let key of keys) {
			let target = key.slice(0, -5);

			let final_target = target.slice(target.length - current_endpoint.length);
			if (final_target === current_endpoint) {
				target_quiz_name = key;
				break;
			}
		}
		return quizzes[`${target_quiz_name}`];
	}

	function selectAnswer(index) {
		if (!isAnswered) {
			selectedAnswer = index;
			isAnswered = true;
			const current = quiz.questions[currentQuestionIndex];
			if (current && index === current.correct) {
				feedback = 'Correct!';
				score++;
			} else {
				feedback =
					'Incorrect. The correct answer was: ' +
					(current ? current.answers[current.correct] : 'unknown');
			}
			// Automatically move to the scorecard if it's the last question
			if (currentQuestionIndex === quiz.questions.length - 1) {
				completed = true;
			}
		}
	}

	function nextQuestion() {
		if (currentQuestionIndex < quiz.questions.length - 1) {
			currentQuestionIndex++;
			selectedAnswer = null;
			isAnswered = false;
			feedback = '';
		} else {
			completed = true;
		}
	}
</script>

{#if ready && quiz}
	{#if quiz.questions && quiz.questions.length > 0}
		{#if !completed}
			<div class="quiz" in:fade={{ duration: 300, delay: 200, easing: quintOut }}>
				<h2>Question {currentQuestionIndex + 1} of {quiz.questions.length}</h2>
				<p class="question">{quiz.questions[currentQuestionIndex].question}</p>
				<ul class="answers">
					{#each quiz.questions[currentQuestionIndex].answers as answer, index}
						<li>
							<button
								on:click={() => selectAnswer(index)}
								class:selected={selectedAnswer === index}
								disabled={isAnswered}
							>
								{answer}
							</button>
						</li>
					{/each}
				</ul>
				{#if isAnswered && currentQuestionIndex < quiz.questions.length - 1}
					<p class="feedback">{feedback}</p>
					<button class="next" on:click={nextQuestion}>Next Question</button>
				{/if}
			</div>
		{:else}
			<!-- Show the score card with a fly and fade transition -->
			<div class="score-card" in:fly={{ y: 50, duration: 500 }}>
				<h2>Quiz Complete!</h2>
				<p>Your score: {score} / {quiz.questions.length}</p>
				<p>Percentage: {Math.round((score / quiz.questions.length) * 100)}%</p>
			</div>
		{/if}
	{/if}
{/if}

<style>
	button {
		all: unset;
	}
	.quiz {
		background: rgba(255, 255, 255, 0.1);
		padding: 1.5rem;
		border-radius: 8px;
		max-width: 600px;
		margin: 1rem auto;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
		color: #fff;
		font-family: sans-serif;
		text-align: center;
	}

	.quiz h2 {
		all: unset;
		margin-top: 0;
		font-size: 1.2rem;
		margin-bottom: 0.75rem;
	}

	.question {
		font-size: 1rem;
		margin-bottom: 1rem;
	}

	.answers {
		all: unset;
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		justify-content: space-between;
		align-items: center;
	}

	.answers li {
		display: flex;
		margin-bottom: 0.5rem;
		width: 100%;
	}

	.answers button {
		width: 100%;
		padding: 1rem;
		border: none;
		border-radius: 4px;
		background-color: #444;
		color: #fff;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.answers button:hover:not(:disabled) {
		background-color: #555;
	}

	.answers button.selected {
		background-color: #0070f3;
	}

	.answers button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.feedback {
		font-size: 0.95rem;
		margin-bottom: 1rem;
	}

	.next {
		padding: 0.75rem 1rem;
		border: none;
		border-radius: 4px;
		background-color: #0070f3;
		color: #fff;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.next:hover {
		background-color: #005bb5;
	}

	.score-card {
		background: rgba(255, 255, 255, 0.1);
		padding: 2rem;
		border-radius: 8px;
		max-width: 600px;
		margin: 2rem auto;
		box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
		color: #fff;
		text-align: center;
		font-family: sans-serif;
	}

	.score-card h2 {
		all: unset;
		margin: 0 0 1rem;
		font-size: 1.4rem;
	}

	.score-card p {
		font-size: 1rem;
		margin: 0.5rem 0;
	}
</style>
