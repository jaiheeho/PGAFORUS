-- Fix RLS policies for NextAuth integration
-- The current policies expect Supabase auth tokens, but we're using NextAuth
-- This script replaces them with permissive policies since we handle auth in API routes

-- Drop existing policies that don't work with NextAuth
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own bets" ON public.bets;
DROP POLICY IF EXISTS "Users can insert their own bets" ON public.bets;
DROP POLICY IF EXISTS "Users can update their own bets" ON public.bets;
DROP POLICY IF EXISTS "Users can delete their own bets" ON public.bets;

-- Create permissive policies for NextAuth integration
-- Since we're using NextAuth with server-side API routes, we handle authorization there
-- rather than relying on RLS policies that expect Supabase auth tokens

CREATE POLICY "Allow all operations on users" ON public.users
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on bets" ON public.bets
    FOR ALL USING (true) WITH CHECK (true);

-- Also create permissive policy for draft_bets if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'draft_bets') THEN
        DROP POLICY IF EXISTS "Users can view their own draft bets" ON public.draft_bets;
        DROP POLICY IF EXISTS "Users can insert their own draft bets" ON public.draft_bets;
        DROP POLICY IF EXISTS "Users can update their own draft bets" ON public.draft_bets;
        DROP POLICY IF EXISTS "Users can delete their own draft bets" ON public.draft_bets;
        
        CREATE POLICY "Allow all operations on draft_bets" ON public.draft_bets
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Note: Security is now handled in the NextAuth API routes:
-- - /api/user/profile checks session.user.email
-- - /api/bets checks session.user.email and fetches user profile
-- - /api/draft-bet checks session.user.email and fetches user profile 