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
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(50, 50, 50, 0.06) 100%);
		padding: 2rem;
		border-radius: 8px;
		margin: 2rem auto;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
		color: #fff;
		font-family: 'Open Sans', sans-serif;
		text-align: center;
		border: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	/* Quiz heading */
	.quiz h2 {
		all: unset;
		margin: 0 0 1rem;
		font-size: 1.5rem;
		font-weight: 600;
		letter-spacing: 0.05em;
	}

	/* Individual question text */
	.question {
		font-size: 1.2rem;
		margin-bottom: 1.5rem;
		font-weight: 500;
	}

	/* Container for answer choices */
	.answers {
		all: unset;
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		align-items: center;
		width: 100%;
	}

	/* Each list item wraps a button */
	.answers li {
		width: 100%;
	}

	/* Answer choice buttons */
	.answers button {
		width: 100%;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		background-color: #444;
		color: #fff;
		cursor: pointer;
		font-size: 1rem;
		transition:
			background-color 0.2s ease,
			transform 0.2s ease;
		text-align: center;
		font-weight: 500;
	}

	.answers button:hover:not(:disabled) {
		background-color: #666;
		transform: scale(1.02);
	}

	/* Highlight for the selected answer */
	.answers button.selected {
		background-color: #0070f3;
		transform: scale(1.02);
	}

	/* Disabled buttons become semi-transparent and non-clickable */
	.answers button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	/* Feedback message (e.g., correct/incorrect) */
	.feedback {
		font-size: 1rem;
		margin: 1rem 0;
		font-style: italic;
	}

	/* "Next" or "Submit" button at the bottom */
	.next {
		padding: 0.75rem 1rem;
		border-radius: 6px;
		background-color: #0070f3;
		color: #fff;
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			transform 0.2s ease;
		margin-top: 1rem;
		display: inline-block;
		font-weight: 600;
		text-align: center;
	}

	.next:hover {
		background-color: #005bb5;
		transform: scale(1.02);
	}

	/* Final score display */
	.score-card {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(50, 50, 50, 0.06) 100%);
		padding: 2rem;
		border-radius: 8px;
		max-width: 600px;
		margin: 2rem auto;
		box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
		color: #fff;
		text-align: center;
		font-family: 'Open Sans', sans-serif;
		border: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.score-card h2 {
		all: unset;
		margin: 0 0 1rem;
		font-size: 1.5rem;
		font-weight: 700;
	}

	.score-card p {
		font-size: 1.1rem;
		margin: 0.75rem 0;
	}

	.quiz-container {
		background-color: var(--surface-2);
		padding: 1rem;
		border-radius: 8px;
		margin: 2rem 0;
		border: 1px solid var(--border);
		box-shadow: 0 2px 4px hsl(var(--surface-shadow) / var(--shadow-strength));
	}

	.question {
		color: var(--text-1);
		margin-bottom: 1rem;
	}

	.answers {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	button {
		background-color: var(--surface-3);
		color: var(--text-1);
		border: 1px solid var(--surface-4);
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	button:hover {
		background-color: var(--surface-4);
	}

	.feedback {
		margin-top: 1rem;
		padding: 0.5rem;
		border-radius: 4px;
		color: var(--text-1);
		background-color: var(--surface-3);
	}

	.feedback.correct {
		color: var(--brand);
	}

	.score {
		color: var(--brand);
		font-size: 1.2rem;
		margin-top: 1rem;
	}

	button.selected {
		background-color: var(--brand);
		color: var(--text-1);
	}
</style>
