import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

export async function POST({ request }) {
	try {
		// ✅ Create Supabase client using the user's Authorization header
		const supabase = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
			global: {
				headers: {
					Authorization: request.headers.get('Authorization') || ''
				}
			}
		});

		// ✅ Get current user
		const {
			data: { user },
			error: userError
		} = await supabase.auth.getUser();
		if (!user || userError) {
			console.error('Unauthorized:', userError?.message || 'no user');
			return json({ success: false, message: 'Unauthorized' }, { status: 401 });
		}

		// ✅ Parse input
		const { bitcoin_address, token_amount } = await request.json();
		if (!bitcoin_address || !token_amount || token_amount <= 0) {
			return json({ success: false, message: 'Invalid request' }, { status: 400 });
		}

		// ✅ Load settings
		const { data: settingsData, error: settingsError } = await supabase
			.from('settings')
			.select('key, value')
			.in('key', ['cashout_minimum', 'cashout_fee']);

		if (settingsError) {
			console.error('Failed to load settings:', settingsError.message);
			return json({ success: false, message: 'Server error' }, { status: 500 });
		}

		const settings = settingsData.reduce(
			(acc, s) => {
				acc[s.key] = parseFloat(s.value);
				return acc;
			},
			{} as Record<string, number>
		);

		const minCashout = settings.cashout_minimum ?? 100;
		const feePercent = settings.cashout_fee ?? 0.05;

		// ✅ Validate minimum
		if (token_amount < minCashout) {
			return json(
				{ success: false, message: `Minimum cashout is ${minCashout} tokens.` },
				{ status: 400 }
			);
		}

		// ✅ Calculate fee & total
		const feeAmount = Math.ceil(token_amount * feePercent);
		const totalDeduction = token_amount + feeAmount;

		// ✅ Fetch user's token balance
		const { data: tokenData, error: tokenError } = await supabase
			.from('tokens')
			.select('tokens')
			.eq('user_id', user.id)
			.single();

		if (tokenError || !tokenData) {
			console.error('Failed to load tokens:', tokenError?.message);
			return json({ success: false, message: 'Failed to check tokens' }, { status: 500 });
		}

		if (totalDeduction > tokenData.tokens) {
			return json(
				{ success: false, message: 'Insufficient balance for cashout and fee.' },
				{ status: 400 }
			);
		}

		// ✅ Deduct tokens
        console.log(user.id)
        console.log(tokenData.tokens)
        console.log(totalDeduction)
		const { data: updateData, error: updateError } = await supabase
			.from('tokens')
			.update({ tokens: tokenData.tokens - totalDeduction })
			.eq('user_id', user.id)
			.select(); // <== select() will return the updated row!

		console.log('Update result:', updateData, updateError);
		if (updateError) {
			console.error('Failed to deduct tokens:', updateError.message);
			return json({ success: false, message: 'Failed to deduct tokens' }, { status: 500 });
		}

		// ✅ Log or send payout request to your payout system
		console.log(
			`✅ Cashout for ${user.id}: ${token_amount} tokens (fee: ${feeAmount}) to ${bitcoin_address}`
		);

		return json({
			success: true,
			message: 'Cashout request submitted!',
			fee: feeAmount
		});
	} catch (e) {
		console.error('Cashout error:', e);
		return json({ success: false, message: 'Server error' }, { status: 500 });
	}
}
