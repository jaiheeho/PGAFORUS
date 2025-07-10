-- Disable RLS temporarily on both tables to allow operations
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets DISABLE ROW LEVEL SECURITY;

-- Drop existing policies that don't work with NextAuth
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own bets" ON public.bets;
DROP POLICY IF EXISTS "Users can insert their own bets" ON public.bets;
DROP POLICY IF EXISTS "Users can update their own bets" ON public.bets;
DROP POLICY IF EXISTS "Users can delete their own bets" ON public.bets;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for users table (since we're using NextAuth server-side)
CREATE POLICY "Allow all operations on users" ON public.users
    FOR ALL USING (true) WITH CHECK (true);

-- Create permissive policies for bets table
CREATE POLICY "Allow all operations on bets" ON public.bets
    FOR ALL USING (true) WITH CHECK (true);

-- Note: Since we're using NextAuth with server-side API routes,
-- we handle authorization in the API routes themselves rather than
-- relying on RLS policies that expect Supabase auth tokens. 