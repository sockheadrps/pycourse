<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { onMount } from 'svelte';

	export let currentTokens: number;
	let bitcoinAddress = '';
	let tokenAmount = 0;
	let loading = false;
	let error = '';
	let success = '';
	let settings: { cashout_fee: number; cashout_minimum: number } | null = null;
	import CashoutSuccessPopup from '$lib/components/CashoutSuccessPopup.svelte';
	let showPopup = false;
	let confirmed = false;

	let pill: HTMLDivElement;
	let isDragging = false;
	let startX = 0;
	let offsetX = 0;
	let slideComplete = false;

	function startDrag(event: MouseEvent | TouchEvent) {
		isDragging = true;
		startX = (event as TouchEvent).touches
			? (event as TouchEvent).touches[0].clientX
			: (event as MouseEvent).clientX;
	}

	function onDrag(event: MouseEvent | TouchEvent) {
		if (!isDragging) return;
		const currentX = (event as TouchEvent).touches
			? (event as TouchEvent).touches[0].clientX
			: (event as MouseEvent).clientX;
		const deltaX = currentX - startX;

		const track = pill.parentElement!;
		const trackWidth = track.clientWidth - pill.clientWidth;

		offsetX = Math.max(0, Math.min(trackWidth, deltaX));
		pill.style.transform = `translateX(${offsetX}px)`;

		// Check if user dragged to end
		if (offsetX >= trackWidth - 5) {
			slideComplete = true;
			confirmed = true;
		}
	}

	function endDrag() {
		if (!isDragging) return;
		isDragging = false;

		if (!slideComplete) {
			// Snap back
			offsetX = 0;
			pill.style.transform = 'translateX(0)';
		}
	}

	// Load settings
	onMount(async () => {
		try {
			const { data, error: settingsError } = await supabase.from('settings').select('key, value');

			if (settingsError) {
				error = 'Failed to load cashout settings';
				return;
			}

			// Convert to object
			settings = {
				cashout_fee: parseFloat(data.find((s: any) => s.key === 'cashout_fee')?.value ?? '0'),
				cashout_minimum: parseFloat(
					data.find((s: any) => s.key === 'cashout_minimum')?.value ?? '0'
				)
			};

			console.log('Loaded cashout settings:', settings);
		} catch (e) {
			console.error(e);
			error = 'Failed to load cashout settings';
		}
	});

	async function handleSubmit() {
		loading = true;
		error = '';
		success = '';

		// ✅ Check minimum
		const min = settings?.cashout_minimum ?? 0;
		if (tokenAmount < min) {
			error = `Minimum cashout is ${min} tokens.`;
			loading = false;
			return;
		}

		// ✅ Calculate fee and total deduction
		const fee = tokenAmount * (settings?.cashout_fee ?? 0);
		const totalDeduction = tokenAmount + fee;

		if (totalDeduction > currentTokens) {
			error = `You don't have enough tokens to cover the cashout (${tokenAmount}) and fee (${fee}).`;
			loading = false;
			return;
		}

		try {
			// ✅ Get the current Supabase session (user must be logged in!)
			const {
				data: { session }
			} = await supabase.auth.getSession();

			if (!session?.access_token) {
				error = 'You are not logged in!';
				return;
			}

			// ✅ Make the API call to /api/cashout
			const res = await fetch('/api/cashout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${session.access_token}`
				},
				body: JSON.stringify({
					bitcoin_address: bitcoinAddress,
					token_amount: tokenAmount
				})
			});

			const data = await res.json();

			if (!res.ok) {
				// Server responded with error
				error = data.message || 'Cashout request failed.';
				return;
			}

			// ✅ Update UI
			success = data.message || 'Cashout request submitted successfully.';
			currentTokens -= totalDeduction;
			bitcoinAddress = '';
			tokenAmount = 0;

			// Force page reload on success
			// window.location.reload();
			showPopup = true;
		} catch (err) {
			console.error('Cashout error:', err);
			error = 'Failed to process cashout request.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="cashout-form">
	{#if settings}
		<div class="info-box">
			<p>Current Balance: <strong>{currentTokens} tokens</strong></p>
			<p>Minimum Cashout: <strong>{settings.cashout_minimum} tokens</strong></p>
			<p>Fee: <strong>{settings.cashout_fee}%</strong></p>
		</div>
	{/if}

	<form on:submit|preventDefault={handleSubmit}>
		<div class="form-group">
			<label for="bitcoin-address">Bitcoin Address</label>
			<input
				id="bitcoin-address"
				type="text"
				bind:value={bitcoinAddress}
				placeholder="Enter your Bitcoin address"
				required
			/>
		</div>

		<div class="form-group">
			<label for="token-amount">Token Amount</label>
			<input
				id="token-amount"
				type="number"
				bind:value={tokenAmount}
				min={settings?.cashout_minimum || 100}
				max={currentTokens}
				required
			/>
		</div>

		{#if error}
			<div class="error">{error}</div>
		{/if}

		{#if success}
			<div class="success">{success}</div>
		{/if}

		<button type="submit" disabled={loading || !confirmed}>
			{loading ? 'Processing...' : 'Cash Out'}
		</button>
		{#if !confirmed}
			<div class="warning">⚠️ Double-check your Bitcoin address! Cashouts are irreversible.</div>
			<div class="slide-container">
				<div
					class="slide-track"
					on:mousedown={startDrag}
					on:touchstart={startDrag}
					on:mouseup={endDrag}
					on:touchend={endDrag}
					on:mousemove={onDrag}
					on:touchmove={onDrag}
				>
					<div class="slide-pill" bind:this={pill}></div>
					<p class="slide-text">{slideComplete ? 'Confirmed!' : 'Slide to confirm'}</p>
				</div>
			</div>
		{/if}
	</form>
	<CashoutSuccessPopup title="Cashout Successful!" visible={showPopup}>
		Your cashout has been submitted and will be processed shortly.
	</CashoutSuccessPopup>
</div>

<style>
	.warning {
		color: #ffce00;
		background: rgba(255, 206, 0, 0.1);
		border: 1px solid rgba(255, 206, 0, 0.3);
		border-radius: 4px;
		padding: 0.5rem;
		margin: 1rem 0;
		font-size: 0.9rem;
	}

	.slide-container {
		margin: 1rem 0;
	}

	.slide-track {
		position: relative;
		width: 100%;
		height: 40px;
		background: #444;
		border-radius: 20px;
		overflow: hidden;
		cursor: pointer;
		user-select: none;
	}

	.slide-pill {
		position: absolute;
		top: 0;
		left: 0;
		width: 40px;
		height: 40px;
		background: #2ecc71;
		border-radius: 50%;
		transition: background 0.3s;
	}

	.slide-text {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		font-size: 0.9rem;
		pointer-events: none;
		user-select: none;
	}

	.cashout-form {
		background: #1f2227;
		padding: 1.5rem;
		border-radius: 8px;
		max-width: 400px;
		margin: 1rem auto;
	}

	h3 {
		margin: 0 0 1rem 0;
		color: #fff;
	}

	.info-box {
		background: #2c2f36;
		padding: 1rem;
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	.info-box p {
		margin: 0.5rem 0;
		color: #fff;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		color: #fff;
	}

	input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #444;
		border-radius: 4px;
		background: #2c2f36;
		color: #fff;
	}

	.fee-info {
		font-size: 0.9rem;
		color: #ffce00;
		margin-top: 0.5rem;
	}

	button {
		width: 100%;
		padding: 0.75rem;
		background: #2ecc71;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: bold;
	}

	button:disabled {
		background: #7f8c8d;
		cursor: not-allowed;
	}

	.error {
		color: #e74c3c;
		margin: 1rem 0;
		padding: 0.5rem;
		background: rgba(231, 76, 60, 0.1);
		border-radius: 4px;
	}

	.success {
		color: #2ecc71;
		margin: 1rem 0;
		padding: 0.5rem;
		background: rgba(46, 204, 113, 0.1);
		border-radius: 4px;
	}
</style>
