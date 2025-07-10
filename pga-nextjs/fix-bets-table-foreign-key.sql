-- Fix bets table foreign key constraint
-- Current: user_id REFERENCES auth.users(id) 
-- Should be: user_id REFERENCES public.users(id)

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE bets DROP CONSTRAINT IF EXISTS bets_user_id_fkey;

-- Step 2: Add the correct foreign key constraint pointing to public.users
ALTER TABLE bets ADD CONSTRAINT bets_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Step 3: Fix RLS policies to work with NextAuth (not Supabase auth)
DROP POLICY IF EXISTS "Users can view own bets" ON bets;
DROP POLICY IF EXISTS "Users can insert own bets" ON bets;
DROP POLICY IF EXISTS "Users can update own bets" ON bets;
DROP POLICY IF EXISTS "Users can delete own bets" ON bets;

-- Create permissive policies since we handle auth in NextAuth API routes
CREATE POLICY "Allow all operations on bets" ON bets
    FOR ALL USING (true) WITH CHECK (true);

-- Note: The issue was that your bets table was trying to reference 
-- auth.users (Supabase's built-in auth) but your app uses 
-- public.users (custom table with NextAuth) 