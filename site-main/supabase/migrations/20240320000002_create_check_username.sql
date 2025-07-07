-- Create function to check if username is available
CREATE OR REPLACE FUNCTION public.is_username_available(username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE raw_user_meta_data->>'username' = username
    );
END;
$$;

-- Create function to set username
CREATE OR REPLACE FUNCTION public.set_username(uid UUID, new_username TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if username is available
    IF NOT public.is_username_available(new_username) THEN
        RAISE EXCEPTION 'Username is already taken';
    END IF;

    -- Update the user's metadata
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('username', new_username)
    WHERE id = uid;
END;
$$;

-- Create function to update tokens
CREATE OR REPLACE FUNCTION public.update_tokens(uid UUID, amount INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_username TEXT;
BEGIN
    -- Get the username from user metadata
    SELECT raw_user_meta_data->>'username' INTO user_username
    FROM auth.users
    WHERE id = uid;

    -- Update the tokens table for the given user
    UPDATE public.tokens
    SET tokens = tokens + amount,
        username = user_username
    WHERE user_id = uid;
    
    -- If no row was updated, insert a new row
    IF NOT FOUND THEN
        INSERT INTO public.tokens (user_id, tokens, username)
        VALUES (uid, amount, user_username);
    END IF;
END;
$$; 