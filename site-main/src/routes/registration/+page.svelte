<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { createEventDispatcher } from 'svelte';
	import { session } from '$lib/stores/session';

	let email = '';
	let password = '';
	let error = '';
	const dispatch = createEventDispatcher();



	async function register() {
		const { data, error: signUpError } = await supabase.auth.signUp({
			email,
			password
		});

		if (signUpError) {
			error = signUpError.message;
		} else if (data) {
			const { user, session } = data;
			if (user) {
				const { error: insertError } = await supabase.from('read_posts').insert({
					user_id: user.id,
					read_posts: []
				});
				if (insertError) {
					console.error('Failed to insert into read_posts:', insertError.message);
					return fail(500, { error: 'Failed to track user registration' });
				}
			}
			dispatch('register', { user, session });
			window.location.href = '/';
		}
	}
</script>

<main class="registration-container">
	<h1>Register</h1>
	<form method="POST" action="?/register" on:submit|preventDefault={register}>
		<div class="form-group">
			<label for="email">Email</label>
			<input type="email" id="email" bind:value={email} required />
			<input type="text" id="username" name="username" autocomplete="username" hidden />
		</div>
		<div class="form-group">
			<label for="password">Password</label>
			<input type="password" id="password" bind:value={password} required />
		</div>
		{#if error}
			<p class="error">{error}</p>
		{/if}
		<button type="submit" class="register-button">Register</button>
	</form>
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
