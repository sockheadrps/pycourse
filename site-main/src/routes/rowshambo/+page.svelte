<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { onMount, onDestroy } from 'svelte';
	import Arena from '$lib/components/Arena.svelte';
	import CashoutForm from '$lib/components/CashoutForm.svelte';
	import ArenaResult from '$lib/components/ArenaResult.svelte';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import { activeChallenger } from '$lib/stores/activeChallenger';
	import { browser } from '$app/environment';
	import type { Session } from '@supabase/supabase-js';

	let ready = false;
	let showArena = false;
	let showCashout = false;

	let client: Client | null = null;
	let wager = 0;
	let countdown = 10;

	let playerChoice: 'rock' | 'paper' | 'scissors' | null = null;
	let opponentChoice: 'rock' | 'paper' | 'scissors' | null = null;
	let gameResult: 'win' | 'lose' | 'tie' | null = null;
	let showArenaResult = false;

	let cooldownUsers: Set<string> = new Set();
	let pendingChallenges: Set<string> = new Set();
	$: console.log(cooldownUsers, 'cooldownUsers');

	function startCooldown(userId: string) {
		console.log('Starting cooldown for:', userId);
		cooldownUsers.add(userId);
		console.log('Current cooldown users:', Array.from(cooldownUsers));

		// Remove from cooldown after 30 seconds
		setTimeout(() => {
			cooldownUsers.delete(userId);
			console.log('Cooldown ended for:', userId);
			console.log('Remaining cooldown users:', Array.from(cooldownUsers));
		}, 30000);
	}

	const cleanup = () => {
		console.log('Cleaning up WebSocket client');
		if (client) {
			client.close();
			client = null;
		}
	};
	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('beforeunload', cleanup);
		}
		cleanup();
	});
	beforeNavigate(() => {
		cleanup();
	});

	async function initializeClient() {
		if (browser) {
			// Optional: if user reloads the page
			window.addEventListener('beforeunload', cleanup);

			const { data } = await supabase.auth.getSession();
			const session = data.session;

			if (session?.access_token) {
				client = new Client('ws://localhost:8080/rowshambo');
				client.onMessage = (msg: any) => {
					if (msg.type === 'chat') {
						chatMessages = [...chatMessages, msg];
					} else if (msg.system) {
						if (msg.tokens !== undefined && client) {
							client.tokens = msg.tokens;
						}
						chatMessages = [...chatMessages, { user: 'System', text: msg.message }];
					} else if (msg.type === 'join' && client) {
						console.log('join', msg);
						client.tokens = msg.tokens;
						client.userId = msg.userId;
						connectedUsers = msg.connectedUsers;
						chatMessages = [
							...chatMessages,
							{ user: 'System', text: `Welcome! You have ${msg.tokens} tokens.` }
						];
					} else if (msg.type === 'challenge-request' && client) {
						client.activeChallengerId = msg.challenger.userId;
						client.activeChallengeWager = msg.challenger.wager;

						chatMessages = [
							...chatMessages,
							{
								user: 'System',
								text: `${msg.challenger.username} challenged you for ${msg.challenger.wager} tokens!`
							}
						];
					} else if (msg.type === 'challenge-response') {
						console.log('Challenge response received:', msg);
						if (msg.response === 'decline') {
							console.log('Processing decline from:', msg.username);
							// Find the user who declined in the connectedUsers array
							console.log(connectedUsers, 'connectedUsers');
							console.log(msg, 'msg');
							console.log(msg.username, 'msg.username');
							const declinedUser = connectedUsers.find((u) => u.userId === msg.targetId);
							console.log('Found declined user:', declinedUser);

							if (declinedUser) {
								console.log('Adding to cooldown:', declinedUser.userId);
								// Remove from pending challenges using the targetId (challenger's ID)
								pendingChallenges.delete(msg.targetId);
								// Add to cooldown using the declined user's ID
								startCooldown(declinedUser.userId);
								chatMessages = [
									...chatMessages,
									{ user: 'System', text: `${msg.username} declined your challenge.` }
								];
							} else {
								console.log('Could not find declined user in connectedUsers');
								// Fallback: use the targetId for cooldown
								console.log('Using targetId for cooldown:', msg.targetId);
								pendingChallenges.delete(msg.targetId);
								startCooldown(msg.targetId);
								chatMessages = [
									...chatMessages,
									{ user: 'System', text: `${msg.username} declined your challenge.` }
								];
							}
						}
					} else if (msg.type === 'game-start' && client) {
						client.inGame = true;
						client.isChallenger = msg.isChallenger;

						// Make sure we have all required data
						if (!msg.opponent?.username || !msg.wager) {
							return;
						}
						// Update the game state
						$activeChallenger = {
							username: msg.opponent.username,
							wager: msg.wager
						};
						showArena = true;

						// Add system message about game starting
						chatMessages = [
							...chatMessages,
							{
								user: 'System',
								text: `Game starting with ${msg.opponent.username} for ${msg.wager} tokens!`
							}
						];
					} else if (msg.type === 'tokens-update' && client) {
						client.tokens = msg.tokens;
						if (msg.message) {
							chatMessages = [...chatMessages, { user: 'System', text: msg.message }];
						} else {
							chatMessages = [
								...chatMessages,
								{ user: 'System', text: `Your token balance is now ${msg.tokens}` }
							];
						}
					} else if (msg.type === 'game-result') {
						console.log('Added to pending:', pendingChallenges);

						if (!msg.winner || !msg.loser) {
							console.log('Added to pending:', pendingChallenges);
							// Fallback: Use the original text parsing as a backup
							const match = /chose (\w+) and .* chose (\w+)\./.exec(msg.result);
							const playerChoiceParsed = match ? match[1] : null;
							const opponentChoiceParsed = match ? match[2] : null;
							let outcome: 'win' | 'lose' | 'tie' = 'tie';
							if (msg.result.includes('wins')) {
								const winnerMatch = msg.result.match(/^(\w+) wins/);
								const winner = winnerMatch ? winnerMatch[1] : null;
								if (winner === session?.user?.user_metadata?.username) {
									outcome = 'win';
								} else {
									outcome = 'lose';
								}
							}

							playerChoice = playerChoiceParsed as 'rock' | 'paper' | 'scissors' | null;
							opponentChoice = opponentChoiceParsed as 'rock' | 'paper' | 'scissors' | null;
							gameResult = outcome;
						} else {
							// Use structured data
							console.log('Added to pending:', pendingChallenges);

							const isWinner = msg.winner.userId === client?.userId;
							playerChoice = isWinner ? msg.winner.choice : msg.loser.choice;
							opponentChoice = isWinner ? msg.loser.choice : msg.winner.choice;
							gameResult = isWinner ? 'win' : 'lose';
						}

						// Show the result modal
						showArena = true;
						chatMessages = [...chatMessages, { user: 'System', text: msg.result }];

						// Reset game state
						client.inGame = false;
						// Clear pending challenges for both players
						pendingChallenges.clear();
						console.log('Cleared pending challenges after game result');
					}
				};
			} else {
				console.warn('No auth session available; skipping WebSocket connection.');
			}
			ready = true;
		}
	}

	onMount(() => {
		initializeClient();
	});

	interface User {
		username: string;
		userId: string;
		tokens: number;
	}

	class Client {
		#ws: WebSocket | null = null;
		#url: string;
		#reconnectInterval = 5000;
		#reconnectTimer: ReturnType<typeof setTimeout> | null = null;
		tokens = 0;
		#_wager = 0;
		pvpReady = false;
		lockWager = false;
		activeChallengerId: string | null = null;
		activeChallengeWager: number | null = null;
		inGame = false;
		isChallenger = false;
		connected = false;
		userId: string | null = null;

		get wager() {
			return this.#_wager;
		}

		set wager(value: number) {
			// Don't allow changes if wager is locked
			if (this.lockWager) return;

			// Don't allow negative wagers
			if (value < 0) return;

			// Calculate token change
			const change = value - this.#_wager;

			// Check if we have enough tokens for the increase
			if (change > 0 && change > this.tokens) return;

			// Update tokens and wager
			this.tokens -= change;
			this.#_wager = value;
		}

		constructor(url: string) {
			this.#url = url;
			this.initWebSocket();
		}

		async initWebSocket() {
			try {
				// 1️⃣ Get Supabase session and token
				const {
					data: { session }
				} = await supabase.auth.getSession();
				const token = session?.access_token;

				if (!token) {
					throw new Error(`No auth token available`);
				}

				// 2️⃣ Construct WebSocket URL with token
				const wsUrl = `${this.#url}?token=${token}`;
				this.#ws = new WebSocket(wsUrl);

				// 3️⃣ Setup event listeners
				this.#ws.onopen = () => {
					this.connected = true;
					this.onOpen();

					// Send register message
					const msg = {
						type: 'register',
						userId: session?.user?.id
					};
					this.send(JSON.stringify(msg));
				};

				this.#ws.onmessage = (event: MessageEvent) => {
					try {
						const msg = JSON.parse(event.data);
						this.onMessage(msg);
					} catch (e) {
						console.error('❌ Invalid message received:', e);
					}
				};

				this.#ws.onclose = () => {
					this.connected = false;
					this.onClose();
					this.#scheduleReconnect();
				};

				this.#ws.onerror = (error: Event) => {
					console.error('❌ WebSocket error:', error);
					this.connected = false;
					this.onError(error);
				};
			} catch (err) {
				console.error('Failed to initialize WebSocket:', err);
				this.connected = false;
				this.#scheduleReconnect();
			}
		}

		#scheduleReconnect() {
			if (!this.#reconnectTimer) {
				this.#reconnectTimer = setTimeout(() => {
					this.initWebSocket();
					this.#reconnectTimer = null;
				}, this.#reconnectInterval);
			}
		}

		send(message: string) {
			if (this.#ws && this.#ws.readyState === WebSocket.OPEN) {
				this.#ws.send(message);
			} else {
				console.warn('❌ WebSocket is not open. Cannot send message. State:', this.#ws?.readyState);
			}
		}

		close() {
			if (this.#ws) {
				this.#ws.close();
			}
		}

		// Public hooks to override
		onOpen() {}
		onMessage(message: any) {
			console.log('onMessage', message.type);
			if (message.type === 'chat') {
				chatMessages = [...chatMessages, { user: message.user, text: message.text }];
			} else if (message.system) {
				if (message.tokens !== undefined) {
					this.tokens = message.tokens;
				}
				chatMessages = [...chatMessages, { user: 'System', text: message.message }];
			} else if (message.type === 'users') {
				connectedUsers = message.users;
			} else if (message.type === 'join') {
				this.tokens = message.tokens;
				this.userId = message.userId;
				chatMessages = [
					...chatMessages,
					{ user: 'System', text: `Welcome! You have ${message.tokens} tokens.` }
				];
			} else if (message.type === 'challenge-request') {
				this.activeChallengerId = message.challenger.userId;
				this.activeChallengeWager = message.challenger.wager;

				chatMessages = [
					...chatMessages,
					{
						user: 'System',
						text: `${message.challenger.username} challenged you for ${message.challenger.wager} tokens!`
					}
				];
			} else if (message.type === 'game-start') {
				this.inGame = true;
				this.isChallenger = message.isChallenger;
				showArena = true;

				// Make sure we have all required data
				if (!message.opponent?.username || !message.wager) {
					return;
				}

				// Update the game state
				$activeChallenger = {
					username: message.opponent.username,
					wager: message.wager
				};
				showArena = true;

				// Add system message about game starting
				chatMessages = [
					...chatMessages,
					{
						user: 'System',
						text: `Game starting with ${message.opponent.username} for ${message.wager} tokens!`
					}
				];
			} else if (message.type === 'game-result') {
				console.log('Added to pending:', pendingChallenges);

				if (!message.winner || !message.loser) {
					console.log('Added to pending:', pendingChallenges);
					// Fallback: Use the original text parsing as a backup
					const match = /chose (\w+) and .* chose (\w+)\./.exec(message.result);
					const playerChoiceParsed = match ? match[1] : null;
					const opponentChoiceParsed = match ? match[2] : null;
					let outcome: 'win' | 'lose' | 'tie' = 'tie';
					if (message.result.includes('wins')) {
						const winnerMatch = message.result.match(/^(\w+) wins/);
						const winner = winnerMatch ? winnerMatch[1] : null;
						if (winner === session?.user?.user_metadata?.username) {
							outcome = 'win';
						} else {
							outcome = 'lose';
						}
					}

					playerChoice = playerChoiceParsed as 'rock' | 'paper' | 'scissors' | null;
					opponentChoice = opponentChoiceParsed as 'rock' | 'paper' | 'scissors' | null;
					gameResult = outcome;
				} else {
					// Use structured data
					console.log('Added to pending:', pendingChallenges);

					const isWinner = message.winner.userId === this.userId;
					playerChoice = isWinner ? message.winner.choice : message.loser.choice;
					opponentChoice = isWinner ? message.loser.choice : message.winner.choice;
					gameResult = isWinner ? 'win' : 'lose';
				}

				// Show the result modal
				showArena = true;
				chatMessages = [...chatMessages, { user: 'System', text: message.result }];

				// Reset game state
				this.inGame = false;
				// Clear pending challenges for both players
				pendingChallenges.clear();
				console.log('Cleared pending challenges after game result');
			} else if (message.type === 'challenge-decline') {
				console.log(message, 'message');
				console.log('challenge-decline');
				// The opponent declined your challenge
				$activeChallenger = null;
				this.activeChallengerId = null;
				this.activeChallengeWager = null;
				this.inGame = false;
				this.isChallenger = false;
				showArena = false;
				console.log({ user: 'System', text: `${message.username} declined your challenge.` });

				chatMessages = [
					...chatMessages,
					{ user: 'System', text: `${message.username} declined your challenge.` }
				];
			} else {
				console.log('no message type', message);
			}
		}
		onClose() {}
		onError(error: Event) {}

		acceptChallenge(user: User) {
			if (this.inGame) {
				return;
			}
			// Send accept message
			const msg = {
				type: 'challenge-accept',
				targetId: this.activeChallengerId,
				wager: this.activeChallengeWager
			};
			this.send(JSON.stringify(msg));

			this.activeChallengerId = null;
		}

		declineChallenge() {
			// Send decline message to the server
			console.log('declineChallenge');
			const msg = {
				type: 'challenge-response',
				targetId: this.activeChallengerId,
				response: 'decline'
			};
			console.log('sending msg', msg);
			this.send(JSON.stringify(msg));

			// Clear local state
			this.activeChallengerId = null;
			this.activeChallengeWager = null;
			this.inGame = false;
			this.isChallenger = false;
			$activeChallenger = null;
			showArena = false;

			// Inform user
			chatMessages = [...chatMessages, { user: 'System', text: 'You declined the challenge.' }];
		}

		makeChoice(choice: 'rock' | 'paper' | 'scissors') {
			if (!this.inGame) return;

			const msg = {
				type: 'play-choice',
				choice: choice
			};
			this.send(JSON.stringify(msg));
		}
	}

	let chatInput = '';
	let chatMessages: { user: string; text: string }[] = [];
	let connectedUsers: User[] = [];

	function sendChat() {
		if (chatInput.trim() && client) {
			const msg = {
				type: 'chat',
				text: chatInput
			};
			client.send(JSON.stringify(msg));
			chatInput = '';
		}
	}

	function sendChallenge(user: User) {
		if (!client) return;

		// Check if user is in cooldown
		if (cooldownUsers.has(user.userId)) {
			console.log('User in cooldown:', user.userId);
			console.log('Cooldown users:', Array.from(cooldownUsers));
			chatMessages = [
				...chatMessages,
				{ user: 'System', text: 'Please wait before challenging this user again.' }
			];
			return;
		}

		if (!client.lockWager) {
			chatMessages = [
				...chatMessages,
				{ user: 'System', text: 'Please lock in your wager first!' }
			];
			return;
		}

		if (user.userId === client.userId) {
			chatMessages = [...chatMessages, { user: 'System', text: 'You cannot challenge yourself!' }];
			return;
		}

		const msg = {
			type: 'challenge',
			targetId: user.userId,
			wager: client.wager
		};
		client.send(JSON.stringify(msg));
		pendingChallenges.add(user.userId);
		console.log('Added to pending:', user.userId, Array.from(pendingChallenges));

		chatMessages = [
			...chatMessages,
			{ user: 'System', text: `Challenge sent to ${user.username} for ${msg.wager} tokens!` }
		];
	}

	function acceptChallenge(user: User) {
		if (!client) {
			console.error('No client available');
			return;
		}

		// ⚠️ Check if the user has enough tokens
		if (client.tokens < (client.activeChallengeWager || 0)) {
			chatMessages = [
				...chatMessages,
				{
					user: 'System',
					text: `❌ You don't have enough tokens to accept this challenge!`
				}
			];
			return;
		}

		client.acceptChallenge(user);
	}

	function declineArena() {
		showArena = false;
		playerChoice = null;
		opponentChoice = null;
		gameResult = null;
	}

	function handleChoice(event: CustomEvent<'rock' | 'paper' | 'scissors'>) {
		if (!client) return;
		client.makeChoice(event.detail);
	}

	function handleCancel() {
		if (!client) return;
		client.declineChallenge();
	}
	function resetGameState() {
		showArena = false;
		$activeChallenger = null;
		playerChoice = null;
		opponentChoice = null;
		gameResult = null;
		if (client) {
			client.inGame = false;
			// Clear pending challenges when resetting game state
			pendingChallenges.clear();
			console.log('Cleared pending challenges in resetGameState');
		}
	}
	$: console.log('lockWager:', !client?.lockWager);
	$: console.log('inGame:', client?.inGame);
	$: console.log('inCooldown:', cooldownUsers);
	$: console.log('hasPendingChallenge:', pendingChallenges);
</script>

<div class="container">
	<!-- Sidebar -->
	<aside class="sidebar">
		{#if client && client.tokens !== null}
			<h4>Roshambokens: <span class="token-count">{client.tokens}</span></h4>
		{/if}

		<div class="wager-section">
			<label for="wager">Wager</label>
			<input id="wager" type="number" min="1" bind:value={wager} disabled={client?.lockWager} />
			<button
				on:click={() => {
					if (client) {
						client.wager = wager;
						client.lockWager = !client.lockWager;
					}
				}}
				class={client?.lockWager ? 'locked' : ''}
			>
				{client?.lockWager ? 'Unlock Wager' : 'Lock Wager'}
			</button>
		</div>
		<div class="pvp-section">
			<button
				class={client?.pvpReady ? 'ready' : 'not-ready'}
				on:click={() => client && (client.pvpReady = !client.pvpReady)}
			>
				{client?.pvpReady ? 'Ready for PvP' : 'Not Ready'}
			</button>
		</div>

		<div class="cashout-section">
			<button class="cashout-button" on:click={() => (showCashout = true)}> Cash Out </button>
		</div>

		{#if showCashout && client}
			<div class="modal-backdrop" on:click={() => (showCashout = false)}>
				<div class="modal" on:click|stopPropagation>
					<h3>Cash Out</h3>
					<CashoutForm currentTokens={client.tokens} />
					<button class="close-button" on:click={() => (showCashout = false)}>Cancel</button>
				</div>
			</div>
		{/if}
	</aside>

	<!-- Main content -->
	<main class="main-area">
		<div class="chat-container">
			<!-- Chat log -->
			<div class="chat-log">
				{#each chatMessages as msg}
					<div class="chat-message"><strong>{msg.user}:</strong> {msg.text}</div>
				{/each}
			</div>

			<!-- Chat input -->
			<div class="chat-input">
				<input
					type="text"
					placeholder="Type your message..."
					bind:value={chatInput}
					on:keydown={(e) => e.key === 'Enter' && sendChat()}
				/>
				<button on:click={sendChat}>Send</button>
			</div>
		</div>
	</main>
	<aside class="user-list">
		<h3>Players</h3>
		<ul>
			{#each connectedUsers.filter((user) => user.userId !== client?.userId) as user}
				{#if client?.activeChallengerId === user.userId}
					<!-- Active challenge view -->
					<div class="challenge-container">
						<div class="challenger-name">
							{user.username} challenged you for {client.activeChallengeWager} tokens!
						</div>
						<div class="challenge-actions">
							<button on:click={() => acceptChallenge(user)} class="user-button accept-challenge">
								Accept
							</button>
							<button
								on:click={() => {
									if (client) {
										client.declineChallenge();
										client.activeChallengerId = null;
										client.activeChallengeWager = null;
									}
								}}
								class="user-button decline-challenge"
							>
								Decline
							</button>
						</div>
					</div>
				{:else}
					<button
						on:click={() => sendChallenge(user)}
						class="user-button challenge-button"
						class:pending={pendingChallenges.has(user.userId)}
						class:cooldown={cooldownUsers.has(user.userId)}
						disabled={!client?.lockWager ||
							client?.inGame ||
							user.userId === client?.userId ||
							cooldownUsers.has(user.userId) ||
							pendingChallenges.has(user.userId)}
						data-userid={user.userId}
					>
						{user.username}
						{#if client?.lockWager}
							<span class="wager-amount">Challenge for {client.wager} tokens</span>
						{/if}
						{#if cooldownUsers.has(user.userId)}
							<span class="cooldown-text">(Cooldown)</span>
						{/if}
					</button>
				{/if}
			{/each}
		</ul>
	</aside>

	{#if showArena && !gameResult}
		<Arena
			activeChallenger={$activeChallenger ?? { username: '', wager: 0 }}
			isChallenger={client?.isChallenger || false}
			countdown={10}
			on:choice={handleChoice}
			on:cancel={declineArena}
		/>
	{:else if showArena && gameResult}
		<ArenaResult {playerChoice} {opponentChoice} result={gameResult} on:close={resetGameState} />
	{/if}
</div>

<style>
	.cooldown {
		background-color: #7f8c8d;
		color: #ccc;
		cursor: not-allowed;
		border-color: transparent;
	}
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.849);
		backdrop-filter: blur(10px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: #2c2f36;
		border-radius: 8px;
		padding: 2rem;
		width: 90%;
		max-width: 400px;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
		color: #fff;
	}

	.modal h3 {
		margin: 0 0 1rem 0;
		color: #fff;
		text-align: center;
	}

	.close-button {
		width: 100%;
		padding: 0.75rem;
		background: #f1c40f;
		color: #2c3e50;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: bold;
		margin-top: 1rem;
	}

	.close-button:hover {
		background: #f39c12;
	}

	.wager-amount {
		font-size: 0.8rem;
		color: #ffce00;
		margin-left: 0.25rem;
	}

	.challenge-actions {
		display: flex;
		gap: 0.5rem;
		margin: 0.5rem 0;
	}

	.user-button {
		flex: 1;
		padding: 0.75rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		font-weight: bold;
	}

	.challenge-button {
		background-color: #2ecc71;
		color: white;
		position: relative;
		overflow: hidden;
		border: 2px solid transparent;
		transition: all 0.3s ease;
		width: 100%;
		padding: 0.75rem;
		margin: 0.5rem 0;
		border-radius: 4px;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.challenge-button.pending {
		border-color: #2ecc71;
		animation: borderPulse 1.5s infinite;
	}

	.challenge-button.cooldown {
		background-color: #7f8c8d !important;
		color: #ccc !important;
		cursor: not-allowed !important;
		border-color: transparent !important;
		pointer-events: none;
		opacity: 0.7;
	}

	.challenge-button:disabled {
		background-color: #7f8c8d;
		color: #ccc;
		cursor: not-allowed;
		pointer-events: none;
		opacity: 0.7;
	}

	@keyframes borderPulse {
		0% {
			box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.7);
		}
		70% {
			box-shadow: 0 0 0 10px rgba(46, 204, 113, 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(46, 204, 113, 0);
		}
	}

	.challenge-button:not(:disabled):hover {
		background-color: #27ae60;
		transform: translateY(-1px);
	}

	.accept-challenge {
		background-color: #2ecc71;
		color: #fff;
	}

	.accept-challenge:hover {
		background-color: #27ae60;
	}

	.decline-challenge {
		background-color: #e74c3c;
		color: #fff;
	}

	.decline-challenge:hover {
		background-color: #c0392b;
	}

	.wager-amount {
		font-size: 0.8rem;
		color: #fff;
		opacity: 0.8;
	}

	@keyframes pulse {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.02);
		}
		100% {
			transform: scale(1);
		}
	}

	.container {
		display: flex;
		height: 80vh;
		width: 90vw;
		color: #fff;
		background: #2c2f36;
		font-family: sans-serif;
	}

	.sidebar {
		width: 250px;
		padding: 1.5rem;
		background-color: #1f2227;
		border-right: 1px solid #444;
		box-sizing: border-box;
	}

	.sidebar h2,
	.sidebar h3 {
		margin: 1rem 0 0.5rem;
	}

	.token-count {
		color: #ffce00;
		font-weight: bold;
	}

	.wager-section input {
		width: 60px;
		margin-left: 0.5rem;
		margin-right: 0.5rem;
	}

	.wager-section button {
		background-color: #4d90fe;
		border: none;
		color: white;
		padding: 0.3rem 0.8rem;
		border-radius: 4px;
		cursor: pointer;
	}

	.wager-section button.locked {
		background-color: #e74c3c;
	}

	.pvp-section button {
		margin-top: 0.5rem;
		padding: 0.4rem 0.8rem;
		border-radius: 4px;
		border: none;
		cursor: pointer;
	}

	.ready {
		background-color: #2ecc71;
		color: white;
	}

	.not-ready {
		background-color: #7f8c8d;
		color: white;
	}

	.main-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		box-sizing: border-box;
	}

	.chat-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		background: #1e1f24;
		padding: 1rem;
		border-radius: 8px;
	}

	.chat-log {
		flex: 1;
		overflow-y: auto;
		margin-bottom: 1rem;
		background: #4d5169;
		padding: 0.5rem;
		border-radius: 4px;
	}

	.chat-message {
		margin-bottom: 0.5rem;
	}

	.chat-input {
		display: flex;
		gap: 0.5rem;
	}

	.chat-input input {
		flex: 1;
		padding: 0.5rem;
		border: none;
		border-radius: 4px;
	}

	.chat-input button {
		background-color: #3498db;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
	}

	.user-list {
		width: 250px;
		background-color: #1f2227;
		padding: 1rem;
		border-left: 1px solid #444;
		box-sizing: border-box;
	}

	.user-list h3 {
		margin: 0 0 1rem 0;
		color: #fff;
		font-size: 1.2rem;
	}

	.user-list ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.user-button {
		width: 100%;
		padding: 0.75rem;
		margin: 0.5rem 0;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.challenge-button {
		background-color: #2ecc71;
		color: white;
	}

	.challenge-button:disabled {
		background-color: #7f8c8d;
		color: #ccc;
		cursor: not-allowed;
	}

	.challenge-button:not(:disabled):hover {
		background-color: #27ae60;
		transform: translateY(-1px);
	}

	.accept-challenge {
		background-color: #f1c40f;
		color: #2c3e50;
		font-weight: bold;
		animation: pulse 1.5s infinite;
	}

	.accept-challenge:hover {
		background-color: #f39c12;
	}

	.wager-amount {
		font-size: 0.8rem;
		color: #fff;
		opacity: 0.8;
	}

	@keyframes pulse {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.02);
		}
		100% {
			transform: scale(1);
		}
	}

	.cashout-section {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #444;
	}

	.cashout-button {
		width: 100%;
		padding: 0.75rem;
		background: #f1c40f;
		color: #2c3e50;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: bold;
		transition: background-color 0.2s;
	}

	.cashout-button:hover {
		background: #f39c12;
	}

	.cooldown-text {
		font-size: 0.8rem;
		color: #e74c3c;
		margin-left: 0.25rem;
		font-weight: bold;
	}
</style>
