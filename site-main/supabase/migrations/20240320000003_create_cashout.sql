-- Create a table for cashout settings
CREATE TABLE IF NOT EXISTS public.cashout_settings (
    id SERIAL PRIMARY KEY,
    fee_percentage DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    min_cashout_tokens INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.cashout_settings (fee_percentage, min_cashout_tokens)
VALUES (5.00, 100)
ON CONFLICT DO NOTHING;

-- Create a table for cashout requests
CREATE TABLE IF NOT EXISTS public.cashout_requests (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    bitcoin_address TEXT NOT NULL,
    token_amount INTEGER NOT NULL,
    fee_amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to get cashout settings
CREATE OR REPLACE FUNCTION public.get_cashout_settings()
RETURNS TABLE (
    fee_percentage DECIMAL(5,2),
    min_cashout_tokens INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT cs.fee_percentage, cs.min_cashout_tokens
    FROM public.cashout_settings cs
    ORDER BY cs.id DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a cashout request
CREATE OR REPLACE FUNCTION public.create_cashout_request(
    uid UUID,
    bitcoin_address TEXT,
    token_amount INTEGER
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    fee_amount INTEGER
) AS $$
DECLARE
    settings RECORD;
    fee_amount INTEGER;
    current_tokens INTEGER;
BEGIN
    -- Get current settings
    SELECT * INTO settings FROM public.get_cashout_settings();
    
    -- Get user's current token balance
    SELECT tokens INTO current_tokens
    FROM public.tokens
    WHERE user_id = uid;
    
    -- Validate minimum amount
    IF token_amount < settings.min_cashout_tokens THEN
        RETURN QUERY SELECT 
            FALSE,
            'Minimum cashout amount is ' || settings.min_cashout_tokens || ' tokens',
            0;
        RETURN;
    END IF;
    
    -- Validate sufficient balance
    IF token_amount > current_tokens THEN
        RETURN QUERY SELECT 
            FALSE,
            'Insufficient token balance',
            0;
        RETURN;
    END IF;
    
    -- Calculate fee
    fee_amount := CEIL(token_amount * (settings.fee_percentage / 100));
    
    -- Create cashout request
    INSERT INTO public.cashout_requests (
        user_id,
        bitcoin_address,
        token_amount,
        fee_amount
    ) VALUES (
        uid,
        bitcoin_address,
        token_amount,
        fee_amount
    );
    
    -- Deduct tokens from user
    UPDATE public.tokens
    SET tokens = tokens - token_amount
    WHERE user_id = uid;
    
    RETURN QUERY SELECT 
        TRUE,
        'Cashout request created successfully',
        fee_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 