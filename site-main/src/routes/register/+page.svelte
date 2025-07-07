<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';

	let email = '';
	let password = '';
	let username = '';
	let nickname = '';
	let loading = false;
	let error: string | null = null;
	let usernameError: string | null = null;

	async function checkUsername() {
		if (!username) return;

		try {
			const { data, error } = await supabase.rpc('is_username_available', {
				username: username
			});

			if (error) throw error;

			if (!data) {
				usernameError = 'Username is already taken';
			} else {
				usernameError = null;
			}
		} catch (err) {
			console.error('Error checking username:', err);
			usernameError = 'Error checking username availability';
		}
	}

	async function handleSubmit() {
	loading = true;
	error = null;
	usernameError = null;

	try {
		// 1️⃣ Check if username is available
		const { data: isAvailable, error: checkError } = await supabase.rpc('is_username_available', {
			username: username
		});

		if (checkError) throw checkError;

		if (!isAvailable) {
			usernameError = 'Username is already taken';
			loading = false;
			return;
		}

		// 2️⃣ Create the user with username and nickname in metadata
		const { data: authData, error: authError } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					username: username,
					nickname: nickname || username
				}
			}
		});

		if (authError) {
			if (authError.message.includes('already registered')) {
				error = 'This email is already registered. Please login instead.';
			} else {
				throw authError;
			}
			loading = false;
			return;
		}

		// 3️⃣ Add initial token balance
		if (authData.user) {
			const { error: tokenError } = await supabase.rpc('update_tokens', {
				uid: authData.user.id,
				amount: 100 // Starting balance
			});

			if (tokenError) {
				console.error('Token creation error:', tokenError);
				// Continue anyway since the user is created
			}

			// 4️⃣ Initialize read_posts table entry for the user
			const { error: insertError } = await supabase.from('read_posts').insert({
				user_id: authData.user.id,
				read_posts: []
			});

			if (insertError) {
				console.error('Failed to insert into read_posts:', insertError.message);
				// Not critical, so continue
			}
		}

		// 5️⃣ Redirect to login page
		goto('/login');
	} catch (err) {
		console.error('Registration error:', err);
		error = err instanceof Error ? err.message : 'An error occurred during registration';
	} finally {
			loading = false;
		}
	}
</script>

<div class="container">
	<h1>Register</h1>

	<form on:submit|preventDefault={handleSubmit}>
		<div class="form-group">
			<label for="email">Email</label>
			<input type="email" id="email" bind:value={email} required placeholder="Enter your email" />
		</div>

		<div class="form-group">
			<label for="username">Username</label>
			<input
				type="text"
				id="username"
				bind:value={username}
				on:input={checkUsername}
				required
				placeholder="Choose a unique username"
			/>
			{#if usernameError}
				<p class="error">{usernameError}</p>
			{/if}
		</div>

		<div class="form-group">
			<label for="nickname">Nickname (Optional)</label>
			<input
				type="text"
				id="nickname"
				bind:value={nickname}
				placeholder="Choose a display name (defaults to username)"
			/>
		</div>

		<div class="form-group">
			<label for="password">Password</label>
			<input
				type="password"
				id="password"
				bind:value={password}
				required
				placeholder="Enter your password"
				minlength="6"
			/>
		</div>

		{#if error}
			<p class="error">{error}</p>
		{/if}

		<button type="submit" disabled={loading || !!usernameError}>
			{loading ? 'Registering...' : 'Register'}
		</button>
	</form>
</div>

<style>
	.container {
		max-width: 400px;
		margin: 2rem auto;
		padding: 2rem;
		background: #1f2227;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	h1 {
		text-align: center;
		color: #fff;
		margin-bottom: 2rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		color: #fff;
	}

	input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #444;
		border-radius: 4px;
		background: #2c2f36;
		color: #fff;
	}

	input:focus {
		outline: none;
		border-color: #4d90fe;
	}

	button {
		width: 100%;
		padding: 0.75rem;
		background: #4d90fe;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
		transition: background-color 0.2s;
	}

	button:hover:not(:disabled) {
		background: #357abd;
	}

	button:disabled {
		background: #7f8c8d;
		cursor: not-allowed;
	}

	.error {
		color: #e74c3c;
		margin-top: 0.5rem;
		font-size: 0.9rem;
	}
</style>
