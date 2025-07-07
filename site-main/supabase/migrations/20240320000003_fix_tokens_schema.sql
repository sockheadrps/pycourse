-- Drop the existing unique constraint
ALTER TABLE public.tokens DROP CONSTRAINT IF EXISTS tokens_username_key;

-- Change the username column type from bigint to text
ALTER TABLE public.tokens 
    ALTER COLUMN username TYPE text USING username::text;

-- Add back the unique constraint
ALTER TABLE public.tokens ADD CONSTRAINT tokens_username_key UNIQUE (username); 