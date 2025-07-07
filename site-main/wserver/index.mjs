import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
console.log(process.env.PUBLIC_TEST_MODE, 'test');

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const app = express(); // ✅ YOU FORGOT THIS LINE

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ✅ Handle URL-encoded query string bodies
app.use(cors());
app.use((req, res, next) => {
	console.log(`📡 ${req.method} ${req.originalUrl}`);
	next();
});

const apiKey = process.env.VITE_BLOCKONOMICS_API_KEY;
const resetAddress = process.env.VITE_BLOCKONOMICS_RESET_ADDRESS === 'true';
const callbackUrl = process.env.VITE_BLOCKONOMICS_CALLBACK_URL || 'http://localhost:8080/callback';
const userPaymentMap = new Map(); // Map Bitcoin address → userId
const userSockets = new Map(); // Map userId → WebSocket

// Token ratio settings
let tokenRatio = 100; // tokens per dollar

async function getTokenRatio() {
	const { data, error } = await supabaseAdmin
		.from('settings')
		.select('value')
		.eq('key', 'token_ratio')
		.single();

	if (error) {
		console.error('Error fetching token ratio:', error);
		return 100; // default ratio
	}

	return parseFloat(data.value) || 100;
}

async function setTokenRatio(ratio) {
	const { error } = await supabaseAdmin
		.from('settings')
		.upsert({ key: 'token_ratio', value: ratio.toString() });

	if (error) {
		console.error('Error setting token ratio:', error);
		return false;
	}

	tokenRatio = ratio;
	return true;
}

// Initialize token ratio
(async () => {
	tokenRatio = await getTokenRatio();
})();

async function handleBlockonomicsCallback(req, res) {
	console.log('⚡ Callback received', req.query);
	const { addr, status, value, confirmations, secret, txid } = req.query;
	console.log('Looking up payment info for address:', addr);
	const paymentInfo = userPaymentMap.get(addr);
	console.log('👤 Matched payment info:', paymentInfo);

	if (secret !== process.env.VITE_BLOCKONOMICS_CALLBACK_SECRET) {
		console.warn('❌ Invalid callback secret');
		return res.status(403).send('Invalid secret');
	}

	if (!paymentInfo) {
		console.warn('❌ No payment info found for address:', addr);
		return res.status(404).send('Payment not found');
	}

	const { userId, tokenAmount } = paymentInfo;

	// Status 1: Payment detected but not confirmed
	if (status === '1' && userId) {
		console.log(
			'💰 Payment detected, adding grey tokens for user:',
			userId,
			'amount:',
			tokenAmount
		);
		const { error } = await supabaseAdmin
			.from('tokens')
			.update({ grey_tokens: tokenAmount })
			.eq('user_id', userId);

		if (error) {
			console.error('❌ Failed to add grey tokens:', error);
			return res.status(500).send('Error updating grey tokens');
		}

		// Notify WebSocket about grey tokens
		const ws = userSockets.get(userId);
		if (ws && ws.readyState === ws.OPEN) {
			ws.send(
				JSON.stringify({
					type: 'payment-detected',
					amount: tokenAmount,
					status: 'grey'
				})
			);
		}
	}

	// Status 2: Payment confirmed
	if (status === '2' && confirmations >= 1 && userId) {
		console.log(
			'✅ Payment confirmed, converting grey tokens to regular tokens for user:',
			userId,
			'amount:',
			tokenAmount
		);

		// First, verify the grey tokens exist
		const { data: tokenData, error: checkError } = await supabaseAdmin
			.from('tokens')
			.select('grey_tokens, tokens')
			.eq('user_id', userId)
			.single();

		if (checkError || !tokenData) {
			console.error('❌ Failed to verify grey tokens:', checkError);
			return res.status(500).send('Error verifying grey tokens');
		}

		if (tokenData.grey_tokens !== tokenAmount) {
			console.error('❌ Grey token amount mismatch:', {
				expected: tokenAmount,
				actual: tokenData.grey_tokens
			});
			return res.status(400).send('Grey token amount mismatch');
		}

		// Convert grey tokens to regular tokens by adding to existing balance
		const { error: updateError } = await supabaseAdmin
			.from('tokens')
			.update({
				tokens: (tokenData.tokens || 0) + tokenAmount,
				grey_tokens: 0
			})
			.eq('user_id', userId);

		if (updateError) {
			console.error('❌ Failed to convert grey tokens:', updateError);
			return res.status(500).send('Error converting grey tokens');
		}

		// Notify WebSocket about confirmed payment
		const ws = userSockets.get(userId);
		if (ws && ws.readyState === ws.OPEN) {
			ws.send(
				JSON.stringify({
					type: 'payment-confirmed',
					amount: tokenAmount,
					status: 'confirmed',
					action: 'reload'
				})
			);
		}

		// Clean up payment info
		userPaymentMap.delete(addr);
	}

	res.status(200).send('OK');
}

// === HTTP Routes ===
app.post('/create-payment', async (req, res) => {
	const { userId, amount } = req.body;

	if (!userId) return res.status(401).json({ error: 'User ID required' });
	if (!amount) return res.status(400).json({ error: 'Amount required' });

	try {
		console.log('Creating payment:', { userId, amount });

		// ✅ 1️⃣ Fetch latest token ratio from DB
		const { data: ratioData, error: ratioError } = await supabaseAdmin
			.from('settings')
			.select('value')
			.eq('key', 'token_ratio')
			.single();

		let currentRatio = tokenRatio; // fallback
		if (!ratioError && ratioData) {
			currentRatio = parseFloat(ratioData.value) || tokenRatio;
		}
		console.log('Using token ratio:', currentRatio);

		// ✅ 2️⃣ Get current BTC price in USD
		const btcPriceResponse = await axios.get(
			'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
		);
		const btcPrice = btcPriceResponse.data.bitcoin.usd;
		console.log('Current BTC price:', btcPrice);

		// ✅ 3️⃣ Calculate BTC amount (1% buffer for fees)
		const btcAmount = ((amount / btcPrice) * 1.01).toFixed(8);
		console.log('Calculated BTC amount:', btcAmount);

		// ✅ 4️⃣ Generate new Bitcoin address
		const response = await axios.post(
			`https://www.blockonomics.co/api/new_address?match_callback=callback&crypto=BTC&reset=1`,
			{},
			{
				headers: {
					Authorization: `Bearer ${apiKey}`
				}
			}
		);

		if (!response.data || !response.data.address) {
			throw new Error('No address received from Blockonomics');
		}

		const { address } = response.data;
		console.log('Generated address:', address);

		// ✅ 5️⃣ Calculate and store grey tokens using the current ratio
		const tokenAmount = amount * currentRatio;
		userPaymentMap.set(address, {
			userId,
			amount: btcAmount,
			tokenAmount,
			createdAt: new Date().toISOString()
		});

		console.log(
			'🪙 Created payment address:',
			address,
			'for user:',
			userId,
			'tokens:',
			tokenAmount
		);

		// ✅ 6️⃣ Send the response
		const responseData = {
			address,
			btcAmount: btcAmount.toString(),
			tokenAmount
		};
		console.log('Sending response:', responseData);
		res.json(responseData);
	} catch (err) {
		console.error(
			'❌ Failed to create payment address from Blockonomics:',
			err.response?.data || err
		);
		res.status(500).json({
			error: 'Failed to create address',
			details: err.response?.data || err.message
		});
	}
});
app.post('/test-payment', async (req, res) => {
	if (process.env.PUBLIC_TEST_MODE !== 'true') {
		return res.status(403).json({ error: 'Forbidden' });
	}

	const { userId, amount } = req.body; // ✅ Get amount dynamically

	if (!userId || !amount) {
		return res.status(400).json({ error: 'Missing userId or amount' });
	}

	console.log('🧪 Starting test payment for user:', userId, 'with amount:', amount);

	try {
		// 3️⃣ Create payment for the actual user with the dynamic amount
		const createResp = await axios.post(
			'http://localhost:8080/create-payment',
			{ userId, amount },
			{ headers: { 'Content-Type': 'application/json' } }
		);
		const { address, btcAmount } = createResp.data;
		console.log('✅ Created payment:', address);

		// 4️⃣ Grey tokens callback
		const greyResp = await axios.get('http://localhost:8080/callback', {
			params: {
				secret: 'myblockonomicssecret123',
				addr: address,
				status: '1',
				crypto: 'BTC',
				txid: 'TestTx123',
				value: '18503'
			}
		});
		console.log('✅ Grey tokens callback:', greyResp.data);

		// 5️⃣ Confirmed callback
		const confirmResp = await axios.get('http://localhost:8080/callback', {
			params: {
				secret: 'myblockonomicssecret123',
				addr: address,
				status: '2',
				crypto: 'BTC',
				txid: 'TestTx123',
				value: '18503',
				confirmations: '2'
			}
		});
		console.log('✅ Confirmed callback:', confirmResp.data);

		// 6️⃣ All done!
		res.json({
			success: true,
			message: 'Test payment flow completed!',
			address,
			btcAmount
		});
	} catch (err) {
		console.error('❌ Test payment error:', err.response?.data || err.message);
		res.status(500).json({
			error: 'Test payment failed',
			details: err.response?.data || err.message
		});
	}
});

// Add endpoint to get/set token ratio
app.get('/token-ratio', async (req, res) => {
	res.json({ ratio: tokenRatio });
});

app.post('/token-ratio', async (req, res) => {
	const { ratio } = req.body;
	if (!ratio || isNaN(ratio) || ratio <= 0) {
		return res.status(400).json({ error: 'Invalid ratio' });
	}

	const success = await setTokenRatio(parseFloat(ratio));
	if (success) {
		res.json({ ratio: tokenRatio });
	} else {
		res.status(500).json({ error: 'Failed to update ratio' });
	}
});

app.get('/callback', handleBlockonomicsCallback);
app.get('/', handleBlockonomicsCallback);

// // === WebSocket Integration ===
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

async function getUserTokens(userId) {
	const { data, error } = await supabaseAdmin
		.from('tokens')
		.select('tokens')
		.eq('user_id', userId)
		.single();

	if (error) {
		console.error('Error fetching tokens:', error);
		return 0;
	}

	return data?.tokens || 0;
}

const getTokenCount = async (userId) => {
	const { data, error } = await supabaseAdmin.rpc('get_token_count', {
		uid: userId
	});
	return data.token_count;
};

class Client {
	constructor(socket, username, userId) {
		this.socket = socket;
		this.username = username;
		this.userId = userId;
		this.tokens = null;
		this.pvpEnabled = false;
		this.wager = 0;
		this.pvpReady = false;
		this.hasChallenge = false;
		this.challenger = null;
		this.gameChoice = null;
		this.opponent = null;
		this.init();
	}

	async init() {
		const { data, error } = await supabaseAdmin
			.from('tokens')
			.select('tokens')
			.eq('user_id', this.userId)
			.single();

		if (error) {
			console.error(`❌ Failed to load tokens for ${this.username}:`, error.message);
		} else {
			this.tokens = data.tokens;
		}
	}

	sendChallenge(challenger) {
		this.socket.send(JSON.stringify({ type: 'challenge', challenger }));
	}

	sendWager(wager) {
		this.socket.send(JSON.stringify({ type: 'wager', wager }));
	}

	acceptChallenge(challenger) {
		this.socket.send(JSON.stringify({ type: 'accept-challenge', challenger }));
	}

	rejectChallenge(challenger) {
		this.socket.send(JSON.stringify({ type: 'reject-challenge', challenger }));
	}

	determineWinner(opponentChoice) {
		if (!this.gameChoice || !opponentChoice) return null;

		const choices = ['rock', 'paper', 'scissors'];
		const thisIndex = choices.indexOf(this.gameChoice);
		const opponentIndex = choices.indexOf(opponentChoice);

		// Same choice means tie
		if (thisIndex === opponentIndex) return 'tie';

		// Rock beats scissors, scissors beats paper, paper beats rock
		if ((thisIndex + 1) % 3 === opponentIndex) {
			return 'opponent';
		} else {
			return 'this';
		}
	}
}

const clients = new Map(); // Map<socket, Client>
wss.on('connection', async (socket, req) => {
	const url = new URL(req.url, `http://${req.headers.host}`);
	if (url.pathname !== '/rowshambo') return;

	const token = url.searchParams.get('token');
	if (!token) {
		console.warn('❌ No token provided, closing socket');
		socket.close();
		return;
	}

	let user;
	try {
		const { data, error } = await supabaseAdmin.auth.getUser(token);
		if (error || !data?.user) throw new Error(error?.message || 'Invalid token');
		user = data.user;
	} catch (err) {
		console.error('❌ Failed to authenticate user from token:', err.message);
		socket.close();
		return;
	}

	const userId = user.id;
	const username = user.user_metadata?.username || user.email || 'Unknown';

	const client = new Client(socket, username, userId);
	await client.init(); // or however you're loading tokens
	clients.set(socket, client);
	console.log(`🧠 ${username} (${userId}) & ${client.tokens} tokens joined Rowshambo`);

	// Send join message with token count
	const msg = {
		type: 'join',
		tokens: client.tokens,
		userId: client.userId
	};
	client.socket.send(JSON.stringify(msg));
	broadcastUserList();

	socket.on('message', (data) => {
		let parsed;
		console.log('📨 Received raw message:', data);
		try {
			parsed = JSON.parse(data.toString());
		} catch (err) {
			console.error('❌ Invalid message format:', err);
			return;
		}
		console.log(parsed);

		if (parsed.type === 'chat') {
			const outgoing = JSON.stringify({
				type: 'chat',
				user: username,
				text: parsed.text,
				timestamp: Date.now()
			});

			for (const [ws, client] of clients.entries()) {
				if (ws.readyState === ws.OPEN) {
					ws.send(outgoing);
				}
			}
		}

		if (parsed.type === 'challenge') {
			const targetId = parsed.targetId;
			const targetClient = [...clients.values()].find((client) => client.userId === targetId);

			if (targetClient && targetClient.socket.readyState === targetClient.socket.OPEN) {
				const challengeData = {
					type: 'challenge-request',
					challenger: {
						username,
						userId,
						wager: parsed.wager
					}
				};
				targetClient.socket.send(JSON.stringify(challengeData));
			}
		}

		if (parsed.type === 'challenge-accept') {
			console.log('🎮 Challenge accept received:', {
				fromUserId: userId,
				targetId: parsed.targetId,
				wager: parsed.wager
			});

			const targetId = parsed.targetId;
			const challenger = [...clients.values()].find((client) => client.userId === userId);
			const target = [...clients.values()].find((client) => client.userId === targetId);

			if (
				challenger &&
				target &&
				challenger.socket.readyState === challenger.socket.OPEN &&
				target.socket.readyState === target.socket.OPEN
			) {
				// Set up opponent relationship
				challenger.opponent = target;
				target.opponent = challenger;
				challenger.wager = parsed.wager;
				target.wager = parsed.wager;

				console.log('👥 Setting up opponent relationship:', {
					challenger: challenger.username,
					target: target.username,
					wager: parsed.wager
				});

				// Send game-start to challenger
				const challengerMsg = {
					type: 'game-start',
					isChallenger: true,
					opponent: {
						username: target.username
					},
					wager: parsed.wager
				};
				console.log('📤 Sending to challenger:', challengerMsg);
				challenger.socket.send(JSON.stringify(challengerMsg));

				// Send game-start to target
				const targetMsg = {
					type: 'game-start',
					isChallenger: false,
					opponent: {
						username: challenger.username
					},
					wager: parsed.wager
				};
				console.log('📤 Sending to target:', targetMsg);
				target.socket.send(JSON.stringify(targetMsg));
			} else {
				console.error('❌ Could not send game-start:', {
					challengerFound: !!challenger,
					targetFound: !!target,
					challengerSocketOpen: challenger?.socket.readyState === challenger?.socket.OPEN,
					targetSocketOpen: target?.socket.readyState === target?.socket.OPEN
				});
			}
		}
		console.log(parsed, 'parsed');
		if (parsed.type === 'challenge-decline') {
			const targetId = parsed.targetId;
			console.log(targetId, 'targetI asdasdasdasd');
			const challenger = [...clients.values()].find((client) => client.userId === userId);
			const targetClient = [...clients.values()].find((client) => client.userId === targetId);
			console.log(targetClient, 'targetClient');
			console.log(targetClient.username, 'targetClient.username');
			console.log(challenger.username, 'challenger.username');
			if (targetClient.socket.readyState === targetClient.socket.OPEN) {
				targetClient.socket.send(
					JSON.stringify({
						type: 'challenge-response',
						username: challenger.username,
						response: 'decline',
						targetId: targetId
					})
				);
				console.log('challenge-decline sent to socket');
			}
		}
		if (parsed.type === 'challenge-response') {
			const targetClient = [...clients.values()].find((client) => client.userId === parsed.targetId);
			if (targetClient.socket.readyState === targetClient.socket.OPEN) {
				targetClient.socket.send(
					JSON.stringify({
						type: 'challenge-response',
						username: targetClient.username,
						response: parsed.response,
						targetId: client.userId
					})
				);
				console.log('challenge-response sent to socket');
			}
		}

		if (parsed.type === 'play-choice') {
			const client = clients.get(socket);
			if (!client) {
				console.error('❌ No client found for socket');
				return;
			}

			if (!client.opponent) {
				console.error('❌ No opponent found for', client.username);
				return;
			}

			client.gameChoice = parsed.choice;
			console.log(`🎮 ${client.username} chose ${parsed.choice}`);

			// If both players have made their choices, determine the winner
			if (client.opponent.gameChoice) {
				console.log('🎯 Both players have chosen:', {
					player1: {
						username: client.username,
						choice: client.gameChoice
					},
					player2: {
						username: client.opponent.username,
						choice: client.opponent.gameChoice
					}
				});

				const result = client.determineWinner(client.opponent.gameChoice);
				const wager = client.wager;

				console.log('🏆 Game result:', {
					result,
					wager,
					winner: result === 'this' ? client.username : client.opponent.username
				});

				if (result === 'tie') {
					// No token transfer for ties
					const tieMessage = {
						type: 'game-result',
						result: `It's a tie! Both players chose ${client.gameChoice}.`
					};
					console.log('🤝 Sending tie message to both players');
					client.socket.send(JSON.stringify(tieMessage));
					client.opponent.socket.send(JSON.stringify(tieMessage));
				} else {
					const winner = result === 'this' ? client : client.opponent;
					const loser = result === 'this' ? client.opponent : client;

					console.log('💰 Updating token balances:', {
						winner: winner.username,
						loser: loser.username,
						amount: wager
					});

					// Update token balances in the database
					(async () => {
						try {
							// Store references before resetting game state
							const winnerSocket = winner.socket;
							const loserSocket = loser.socket;
							const winnerUsername = winner.username;
							const loserUsername = loser.username;
							const winnerChoice = winner.gameChoice;
							const loserChoice = loser.gameChoice;

							// Reset game state first
							console.log('🔄 Resetting game state');
							client.gameChoice = null;
							client.opponent.gameChoice = null;
							client.opponent = null;
							client.opponent = null;

							// Subtract from loser
							console.log('💸 Subtracting tokens from loser:', {
								userId: loser.userId,
								amount: -wager
							});
							const { error: loseError } = await supabaseAdmin.rpc('update_tokens', {
								uid: loser.userId,
								amount: -wager
							});
							if (loseError) {
								console.error('❌ Failed to subtract tokens:', loseError);
								throw loseError;
							}

							// Add to winner
							console.log('💰 Adding tokens to winner:', {
								userId: winner.userId,
								amount: wager
							});
							const { error: winError } = await supabaseAdmin.rpc('update_tokens', {
								uid: winner.userId,
								amount: wager
							});
							if (winError) {
								console.error('❌ Failed to add tokens:', winError);
								throw winError;
							}

							console.log('✅ Token updates successful');

							// Update local token counts
							winner.tokens += wager;
							loser.tokens -= wager;

							// Send results to both players
							const resultMessage = {
								type: 'game-result',
								result: `${winnerUsername} wins ${wager} tokens! ${winnerUsername} chose ${winnerChoice} and ${loserUsername} chose ${loserChoice}.`,
								winner: {
									username: winnerUsername,
									userId: winner.userId,
									choice: winnerChoice
								},
								loser: {
									username: loserUsername,
									userId: loser.userId,
									choice: loserChoice
								}
							};

							// Send updated token counts
							const winnerUpdate = {
								type: 'tokens-update',
								tokens: winner.tokens,
								message: `Your new balance is ${winner.tokens} tokens`
							};
							const loserUpdate = {
								type: 'tokens-update',
								tokens: loser.tokens,
								message: `Your new balance is ${loser.tokens} tokens`
							};

							console.log('📤 Sending structured results to players:', {
								winner: winnerUpdate,
								loser: loserUpdate,
								result: resultMessage
							});

							// Send results to both players
							winnerSocket.send(JSON.stringify(resultMessage));
							winnerSocket.send(JSON.stringify(winnerUpdate));
							loserSocket.send(JSON.stringify(resultMessage));
							loserSocket.send(JSON.stringify(loserUpdate));
						} catch (err) {
							console.error('❌ Error updating tokens:', err);
							// Notify both players of the error
							const errorMessage = {
								type: 'game-result',
								result: 'Error updating tokens. Please contact support.'
							};
							client.socket.send(JSON.stringify(errorMessage));
							if (client.opponent) {
								client.opponent.socket.send(JSON.stringify(errorMessage));
							}
						}
					})();
				}
			} else {
				console.log('⏳ Waiting for opponent to choose');
			}
		}
	});

	socket.on('close', () => {
		console.log(`❌ ${username} disconnected`);
		clients.delete(socket);
		broadcastUserList();
	});
});

function broadcastUserList() {
	const allUsers = [...clients.values()].map((client) => ({
		username: client.username,
		userId: client.userId,
		tokens: client.tokens
	}));

	// Send filtered list to each client
	for (const [socket, client] of clients.entries()) {
		if (socket.readyState === socket.OPEN) {
			const filteredUsers = allUsers.filter((user) => user.userId !== client.userId);
			const msg = JSON.stringify({ type: 'users', users: filteredUsers });
			socket.send(msg);
		}
	}
}

const PORT = 8080; // Or any port you prefer
server.listen(PORT, () => {
	console.log(`🚀 Server and WebSocket listening on http://0.0.0.0:${PORT}`);
});
