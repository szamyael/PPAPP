-- Add author_id column to newsfeed_posts table
ALTER TABLE public.newsfeed_posts 
ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_newsfeed_posts_author_id ON public.newsfeed_posts(author_id);

-- Update existing posts to have author_id based on author_name matching profiles
-- This is a best-effort update for existing data
UPDATE public.newsfeed_posts 
SET author_id = p.id
FROM public.profiles p 
WHERE p.full_name = newsfeed_posts.author_name 
AND newsfeed_posts.author_id IS NULL;