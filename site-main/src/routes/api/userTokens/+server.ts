import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function getUserTokens(userId: string): Promise<number> {
    const { data, error } = await supabase
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

wss.on('connection', async (ws, req) => {
    const token = new URL(req.url!, 'ws://localhost').searchParams.get('token');
    
    if (!token) {
        ws.close(1008, 'No token provided');
        return;
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            ws.close(1008, 'Invalid token');
            return;
        }

        const tokens = await getUserTokens(user.id);
        ws.send(JSON.stringify({ type: 'tokens', tokens }));

        // ... rest of your connection handling code ...
    } catch (error) {
        console.error('Error during connection:', error);
        ws.close(1011, 'Internal server error');
    }
}); 