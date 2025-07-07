<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { session } from '$lib/stores/session';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import CashoutForm from '$lib/components/CashoutForm.svelte';
	import { Coins, Bitcoin } from 'lucide-svelte';
	import { PUBLIC_TEST_MODE, PUBLIC_ALLOW_CASHOUT } from '$env/static/public';

	const isTest = PUBLIC_TEST_MODE === 'true';

	let loading = false;
	let message = '';
	let tokens = 0;
	let user = $session?.user;
	let showPayment = false;
	let address = '';
	let btcAmount = '';
	let socket: WebSocket | null = null;
	let showPurchaseModal = false;
	let selectedAmount = 0;
	let selectedPrice = 0;
	let btcPrice = 0;
	let error = '';
	let purchaseFee = 0; // default
	let tokenRatio = 100; // default
	const calculatedTokens = btcAmount * btcPrice * tokenRatio * (1 - purchaseFee);

	let currentPassword = '';
	let newPassword = '';
	let confirmPassword = '';
	let changePasswordError = '';
	let changePasswordSuccess = '';
	const tokensPerDollar = 100; // 100 tokens per $1

	$: packagesWithBtc =
		btcPrice > 0
			? tokenPackages.map((pkg) => {
					// 1️⃣ BTC value for this USD price
					const btcValue = (pkg.usdPrice / btcPrice).toFixed(8);

					// 2️⃣ Adjusted tokens (after purchase fee)
					const adjustedTokens = Math.floor(pkg.usdPrice * tokensPerDollar * (1 - purchaseFee));

					const resultPackage = {
						...pkg,
						btcValue,
						adjustedTokens
					};

					return resultPackage;
				})
			: [];

	async function changePassword(currentPassword: string, newPassword: string) {
		error = '';
		message = '';

		// Reauthenticate the user by signing in again
		const { data, error: signInError } = await supabase.auth.signInWithPassword({
			email: user.email,
			password: currentPassword
		});

		if (signInError) {
			error = 'Current password is incorrect.';
			return;
		}

		// If reauthentication succeeded, update the password
		const { error: updateError } = await supabase.auth.updateUser({
			password: newPassword
		});

		if (updateError) {
			error = updateError.message;
		} else {
			message = '✅ Password updated successfully!';
		}
	}

	// Token package options with fixed token amounts and payment URLs
	const tokenPackages = [
		{
			tokens: 1000,
			usdPrice: 10,
			paymentUrl: 'https://pay-link.s3.us-west-2.amazonaws.com/index.html?uid=f5b4dedbdf274073'
		},
		{
			tokens: 2000,
			usdPrice: 20,
			paymentUrl: 'https://pay-link.s3.us-west-2.amazonaws.com/index.html?uid=a4eb3bb1e88b4ce3'
		},
		{
			tokens: 5000,
			usdPrice: 50,
			paymentUrl: 'https://pay-link.s3.us-west-2.amazonaws.com/index.html?uid=43a82d661b464bb9'
		},
		{
			tokens: 10000,
			usdPrice: 100,
			paymentUrl: 'https://pay-link.s3.us-west-2.amazonaws.com/index.html?uid=07900c541c4f474b'
		}
	];

	async function updateTokens() {
		const { data: tokenData } = await supabase
			.from('tokens')
			.select('tokens')
			.eq('user_id', user.id)
			.single();
		if (tokenData) {
			tokens = tokenData.tokens;
		}
	}

	onMount(async () => {
		try {
			// Fetch the purchase fee and token ratio from the settings table
			const { data: feeData } = await supabase
				.from('settings')
				.select('value')
				.eq('key', 'purchase_fee')
				.single();

			const { data: ratioData } = await supabase
				.from('settings')
				.select('value')
				.eq('key', 'token_ratio')
				.single();

			if (feeData) purchaseFee = parseFloat(feeData.value);
			if (ratioData) tokenRatio = parseFloat(ratioData.value);
		} catch (error) {
			console.error('Failed to fetch purchase settings:', error);
		}

		if (!user?.id) return;

		const { data: tokenData } = await supabase
			.from('tokens')
			.select('tokens')
			.eq('user_id', user.id)
			.single();
		if (tokenData) {
			tokens = tokenData.tokens;
		}

		// Fetch BTC price
		const response = await fetch('/api/btc-price');
		if (response.ok) {
			const data = await response.json();
			btcPrice = parseFloat(data.price);
		} else {
			console.error('BTC price API request failed:', response.status);
		}

		// Initialize WebSocket connection
		const wsUrl = `ws://localhost:8080/account?userId=${user.id}`;
		socket = new WebSocket(wsUrl);
		socket.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data.type === 'tokens-update') {
					tokens = data.tokens;
				}
				if (data.action === 'reload') {
					console.log('Server requested page reload!');
					// ✅ Slight delay to let DB update finish
					setTimeout(updateTokens, 1000);
				}
			} catch (e) {
				console.error('Failed to parse WebSocket message:', e);
			}
		};
		socket.onerror = (e) => console.error('❌ WebSocket error:', e);
		socket.onclose = () => {
			socket = null;
		};
	});

	onDestroy(() => {
		if (socket) {
			socket.close();
			socket = null;
		}
	});

	async function getTestTokens(amount: number) {
		loading = true;
		error = '';
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			if (!session) {
				error = 'Not logged in!';
				return;
			}

			// ✅ Send the userId and selected amount!
			const res = await fetch('http://localhost:8080/test-payment', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${session.access_token}`
				},
				body: JSON.stringify({
					userId: user.id,
					amount // <== Send the selected amount (10, 20, 50, 100)
				})
			});
			const data = await res.json();
			console.log('Test payment response:', data);
			if (data.success) {
				alert('✅ Test payment successful!');
				updateTokens();
				// Optionally update UI with new tokens, etc.
			} else {
				error = data.error || 'Test payment failed';
			}
		} catch (err) {
			console.error(err);
			error = 'Error fetching test payment';
		} finally {
			loading = false;
		}
	}

	async function startPayment(amount: number, price: number) {
		loading = true;
		message = '';
		showPurchaseModal = false;
		selectedAmount = amount;
		selectedPrice = price;

		try {
			if (!user) throw new Error('No user found');

			console.log('Starting payment for:', { amount, price, userId: user.id });

			const res = await fetch('http://localhost:8080/create-payment', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId: user.id,
					amount: price // Price in USD
				})
			});

			if (!res.ok) {
				const errorText = await res.text();
				console.error('Payment creation failed:', errorText);
				throw new Error(errorText);
			}

			const json = await res.json();
			console.log('Payment response:', json);

			address = json.address;
			btcAmount = json.btcAmount;
			console.log('Set payment details:', { address, btcAmount });

			showPayment = true;
		} catch (error) {
			console.error('Payment error:', error);
			message = '❌ Failed to create payment address';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Account Settings</title>
</svelte:head>

<div class="account-container">
	{#if loading}
		<div class="loading">Loading...</div>
	{:else if user}
		<div class="account-header">
			<h1>Account Settings</h1>
			<div class="balance">
				Current Balance: {tokens} tokens
			</div>
		</div>

		<div class="settings-section">
			<h2>Change Password</h2>

			<div class="form-group">
				<label for="current-password">Current Password</label>
				<input
					type="password"
					id="current-password"
					bind:value={currentPassword}
					placeholder="Enter your current password"
					required
				/>
			</div>

			<div class="form-group">
				<label for="new-password">New Password</label>
				<input
					type="password"
					id="new-password"
					bind:value={newPassword}
					placeholder="Enter your new password"
					required
				/>
			</div>

			<div class="form-group">
				<label for="confirm-password">Confirm New Password</label>
				<input
					type="password"
					id="confirm-password"
					bind:value={confirmPassword}
					placeholder="Re-enter new password"
					required
				/>
			</div>

			<button
				on:click={async () => {
					if (newPassword !== confirmPassword) {
						error = 'Passwords do not match!';
						return;
					}
					await changePassword(currentPassword, newPassword);
				}}
			>
				Change Password
			</button>

			{#if error}
				<p class="error">{error}</p>
			{/if}
			{#if message}
				<p class="success">{message}</p>
			{/if}
		</div>

		<div class="settings-section">
			<h2>Purchase Tokens</h2>

			{#if showPurchaseModal}
				<div class="modal-backdrop" role="presentation">
					<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
						<h3 id="modal-title">Select Token Package</h3>
						<div class="token-packages">
							{#each packagesWithBtc as pkg}
								<button
									class="package-button"
									on:click={() =>
										isTest ? getTestTokens(pkg.usdPrice) : window.open(pkg.paymentUrl, '_blank')}
									disabled={loading}
								>
									<div class="package-amount">{pkg.adjustedTokens} Tokens</div>
									<div class="package-price">${pkg.usdPrice}</div>
									<div class="package-btc">≈ {pkg.btcValue} BTC</div>
								</button>
							{/each}
						</div>
						<button class="close-button" on:click={() => (showPurchaseModal = false)}>Cancel</button
						>
					</div>
				</div>
			{:else}
				<button on:click={() => (showPurchaseModal = true)} disabled={loading}>
					Purchase Tokens
				</button>
			{/if}

			{#if showPayment}
				<div
					class="payment-section"
					role="dialog"
					aria-modal="true"
					aria-labelledby="payment-title"
				>
					<div class="token-info">
						<Coins class="icon" size={32} />
						<span class="amount">{selectedAmount}</span>
						<span class="token-name">RoShamBoTokens</span>
						<div class="price-container">
							<Bitcoin class="bitcoin-icon" size={20} />
							<span class="price">${selectedPrice}</span>
						</div>
					</div>
					<button class="close-button" on:click={() => (showPayment = false)}>Close</button>
				</div>
			{/if}

			{#if message}
				<div class="message" class:error={message.includes('error')}>
					{message}
				</div>
			{/if}
		</div>

		{#if PUBLIC_ALLOW_CASHOUT === 'true'}
			<div class="settings-section">
				<h2>Cash Out Tokens</h2>
				<CashoutForm currentTokens={tokens} />
			</div>
		{/if}
	{/if}
</div>

<style>
	.account-container {
		max-width: 800px;
		margin: 2rem auto;
		padding: 0 1rem;
	}

	.account-header {
		margin-bottom: 2rem;
	}

	.balance {
		font-size: 1.2rem;
		color: var(--text-2);
		margin-top: 0.5rem;
	}

	.settings-section {
		background: var(--surface-2);
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 2rem;
		box-shadow: var(--shadow-1);
	}

	.settings-section h2 {
		color: var(--text-1);
		margin-bottom: 1rem;
		font-size: 1.2rem;
	}

	.form-group {
		margin-bottom: 1rem;
		display: flex;
		flex-direction: column;
	}

	.form-group label {
		margin-bottom: 0.25rem;
		color: var(--text-2);
		font-size: 0.9rem;
	}

	.form-group input {
		padding: 0.5rem;
		border: 1px solid var(--surface-4);
		border-radius: 4px;
		background: var(--surface-1);
		color: var(--text-1);
		font-size: 0.9rem;
		transition: border-color 0.2s;
	}

	.form-group input:focus {
		border-color: var(--brand);
		outline: none;
	}

	button {
		padding: 0.6rem 1rem;
		background: var(--blue-6);
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	button:hover:not(:disabled) {
		background: var(--blue-7);
	}

	.error {
		color: var(--red-6);
		margin-top: 0.5rem;
		font-size: 0.9rem;
	}

	.success {
		color: var(--green-6);
		margin-top: 0.5rem;
		font-size: 0.9rem;
	}

	.payment-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--size-4);
		padding: var(--size-6);
		border-radius: var(--radius-3);
		background: var(--surface-2);
		box-shadow: var(--shadow-2);
		margin-top: 1rem;
	}

	.token-info {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--size-2);
		font-family: var(--font-sans);
	}

	.icon {
		color: var(--brand);
		margin-bottom: var(--size-2);
	}

	.amount {
		font-size: var(--font-size-5);
		font-weight: var(--font-weight-7);
		color: var(--text-1);
		background: var(--gradient-1);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.token-name {
		font-size: var(--font-size-2);
		color: var(--text-2);
		text-transform: uppercase;
		letter-spacing: var(--font-letterspacing-2);
	}

	.price-container {
		display: flex;
		align-items: center;
		gap: var(--size-2);
		margin-top: var(--size-2);
	}

	.bitcoin-icon {
		color: var(--orange-6);
	}

	.price {
		font-size: var(--font-size-4);
		font-weight: var(--font-weight-6);
		color: var(--text-1);
	}

	code {
		background: var(--surface-3);
		padding: 0.5rem;
		border-radius: 4px;
		font-family: monospace;
		word-break: break-all;
	}

	@media (max-width: 600px) {
		.account-container {
			padding: 1rem;
		}
	}

	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: var(--surface-2);
		border-radius: 8px;
		padding: 2rem;
		max-width: 400px;
		width: 90%;
		box-shadow: var(--shadow-3);
	}

	.modal h3 {
		margin: 0 0 1.5rem 0;
		color: var(--text-1);
		text-align: center;
	}

	.token-packages {
		display: grid;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.package-button {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1rem;
		background: var(--surface-3);
		border: 2px solid transparent;
		transition: all 0.2s;
	}

	.package-button:hover:not(:disabled) {
		background: var(--surface-4);
		border-color: var(--brand);
	}

	.package-amount {
		font-size: 1.2rem;
		font-weight: bold;
		color: var(--text-1);
	}

	.package-price {
		color: var(--text-2);
		margin-top: 0.25rem;
	}

	.package-btc {
		font-size: 0.9rem;
		color: var(--text-3);
		margin-top: 0.25rem;
	}

	.close-button {
		width: 100%;
		background: var(--surface-3);
		color: var(--text-2);
	}

	.close-button:hover:not(:disabled) {
		background: var(--surface-4);
		color: var(--text-1);
	}
</style>
