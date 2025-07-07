-- Create the update_tokens function
CREATE OR REPLACE FUNCTION public.update_tokens(uid UUID, amount INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the tokens table for the given user
    UPDATE public.tokens
    SET tokens = tokens + amount
    WHERE user_id = uid;
    
    -- If no row was updated, insert a new row
    IF NOT FOUND THEN
        INSERT INTO public.tokens (user_id, tokens)
        VALUES (uid, amount);
    END IF;
END;
$$; 