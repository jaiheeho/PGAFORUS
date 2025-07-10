-- Complete database setup for PGA FOR US application
-- This script safely creates all necessary tables and policies

-- 1. Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create bets table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.bets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    user_nickname VARCHAR(20) NOT NULL,
    players TEXT[] NOT NULL,
    tournament_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create draft_bets table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.draft_bets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    user_nickname TEXT NOT NULL,
    players TEXT[] NOT NULL DEFAULT '{}',
    tournament_name TEXT NOT NULL DEFAULT 'Current Tournament',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 4. Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    -- Check if foreign key constraint exists for bets.user_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name='bets_user_id_fkey' AND table_name='bets'
    ) THEN
        ALTER TABLE public.bets ADD CONSTRAINT bets_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Check if foreign key constraint exists for draft_bets.user_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name='draft_bets_user_id_fkey' AND table_name='draft_bets'
    ) THEN
        ALTER TABLE public.draft_bets ADD CONSTRAINT draft_bets_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_bets ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own bets" ON public.bets;
DROP POLICY IF EXISTS "Users can insert their own bets" ON public.bets;
DROP POLICY IF EXISTS "Users can update their own bets" ON public.bets;
DROP POLICY IF EXISTS "Users can delete their own bets" ON public.bets;
DROP POLICY IF EXISTS "Users can view their own draft bets" ON public.draft_bets;
DROP POLICY IF EXISTS "Users can insert their own draft bets" ON public.draft_bets;
DROP POLICY IF EXISTS "Users can update their own draft bets" ON public.draft_bets;
DROP POLICY IF EXISTS "Users can delete their own draft bets" ON public.draft_bets;
DROP POLICY IF EXISTS "Allow all operations on users" ON public.users;
DROP POLICY IF EXISTS "Allow all operations on bets" ON public.bets;
DROP POLICY IF EXISTS "Allow all operations on draft_bets" ON public.draft_bets;

-- 7. Create permissive policies for NextAuth integration
-- Since we're using NextAuth server-side API routes, we handle authorization there
-- rather than relying on RLS policies that expect Supabase auth tokens

CREATE POLICY "Allow all operations on users" ON public.users
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on bets" ON public.bets
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on draft_bets" ON public.draft_bets
    FOR ALL USING (true) WITH CHECK (true);

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON public.users(nickname);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON public.bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON public.bets(created_at);
CREATE INDEX IF NOT EXISTS idx_draft_bets_user_id ON public.draft_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_draft_bets_updated_at ON public.draft_bets(updated_at);

-- 9. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bets_updated_at ON public.bets;
CREATE TRIGGER update_bets_updated_at BEFORE UPDATE ON public.bets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_draft_bets_updated_at ON public.draft_bets;
CREATE TRIGGER update_draft_bets_updated_at BEFORE UPDATE ON public.draft_bets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Done! Database setup complete
-- You should now be able to:
-- 1. Sign in with Google OAuth (auto-creates user record)
-- 2. Select players on leaderboard (saves to draft_bets)
-- 3. Create final bets (saves to bets table) 