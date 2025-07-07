-- Create read_posts table to track which posts users have read
CREATE TABLE IF NOT EXISTS public.read_posts (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    post_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- Enable Row Level Security
ALTER TABLE public.read_posts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own read_posts
CREATE POLICY "Users can view their own read_posts"
    ON public.read_posts
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own read_posts
CREATE POLICY "Users can insert their own read_posts"
    ON public.read_posts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to delete their own read_posts
CREATE POLICY "Users can delete their own read_posts"
    ON public.read_posts
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to get all read posts for a user
CREATE OR REPLACE FUNCTION public.get_read_posts(uid UUID)
RETURNS TABLE (
    post_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT rp.post_id
    FROM public.read_posts rp
    WHERE rp.user_id = uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT SELECT, INSERT, DELETE ON public.read_posts TO authenticated;
GRANT USAGE ON SEQUENCE public.read_posts_id_seq TO authenticated; 