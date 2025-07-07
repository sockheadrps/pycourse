import { json } from '@sveltejs/kit';

export const GET = async () => {
	try {
		const response = await fetch('https://www.blockonomics.co/api/price?currency=USD');
		const data = await response.json();
		return json(data);
	} catch (err) {
		console.error('Failed to fetch BTC price:', err);
		return json({ error: 'Failed to fetch BTC price' }, { status: 500 });
	}
};