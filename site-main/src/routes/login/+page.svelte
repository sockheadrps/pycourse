<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { createEventDispatcher } from 'svelte';

	let email = '';
	let password = '';
	let error = '';
	let message = '';
	let highlightEmail = false; // highlight state

	const dispatch = createEventDispatcher();

	async function login() {
		const { data, error: loginError } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		if (loginError) {
			error = loginError.message;
		} else if (data) {
			const { user, session } = data;
			dispatch('login', { user, session });
			window.location.href = '/';
		}
	}

	async function resetPassword() {
		if (!email) {
			error = 'Please enter your email address first.';
			message = '';
			highlightEmail = true; // highlight the email field
			return;
		}

		highlightEmail = false; // remove highlight if email is filled

		const { data, error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: 'http://localhost:5173/reset-password' // use your real site URL in production!
		});

		if (resetError) {
			error = resetError.message;
			message = '';
		} else {
			message = 'Password reset email sent! Check your inbox.';
			error = '';
		}
	}
</script>

<main class="registration-container">
	<h1>Login</h1>
	<form method="POST" on:submit|preventDefault={login}>
		<div class="form-group">
			<label for="email">Email</label>
			<input
				type="email"
				id="email"
				bind:value={email}
				required
				class:highlight={highlightEmail}
				on:input={() => (highlightEmail = false)}
			/>
		</div>
		<div class="form-group">
			<label for="password">Password</label>
			<input type="password" id="password" bind:value={password} required />
		</div>

		{#if error}
			<p class="error">{error}</p>
		{/if}
		{#if message}
			<p class="success">{message}</p>
		{/if}

		<button type="submit" class="register-button">Login</button>
	</form>

	<p>
		<a href="#" on:click|preventDefault={resetPassword}>Forgot Password?</a>
	</p>

	<p>Don't have an account? <a href="/register">Register</a></p>
</main>

<style>
	.registration-container {
		max-width: 400px;
		margin: 4rem auto;
		padding: 2rem;
		background: var(--surface-2);
		border-radius: var(--radius-2);
		box-shadow: var(--shadow-2);
	}
	.success {
		color: var(--green-6);
		margin-top: 1rem;
		text-align: center;
	}
	h1 {
		text-align: center;
		margin-bottom: 1.5rem;
		color: var(--gray-9);
	}
	p {
		text-align: center;
		margin-top: 1rem;
		font-size: 0.8rem;
	}
	.form-group {
		margin-bottom: 1rem;
	}
	label {
		display: block;
		margin-bottom: 0.5rem;
		color: var(--gray-5);
	}
	input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid var(--gray-3);
		border-radius: var(--radius-1);
		background: var(--surface-1);
		transition:
			box-shadow 0.3s,
			border-color 0.3s;
	}
	input.highlight {
		border-color: var(--red-6);
		box-shadow: 0 0 5px var(--red-6);
	}
	.error {
		color: var(--red-6);
		margin-top: 1rem;
		text-align: center;
	}
	.register-button {
		width: 100%;
		padding: 0.75rem;
		background: var(--blue-6);
		color: var(--gray-0);
		border: none;
		border-radius: var(--radius-1);
		cursor: pointer;
		transition: background 0.3s;
	}
	.register-button:hover {
		background: var(--blue-7);
	}
</style>
