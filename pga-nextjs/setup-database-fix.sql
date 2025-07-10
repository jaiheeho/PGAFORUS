-- Create users table (this is what's missing)
CREATE TABLE public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Check if user_nickname column exists in bets table, add if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bets' AND column_name='user_nickname') THEN
        ALTER TABLE public.bets ADD COLUMN user_nickname VARCHAR(20);
    END IF;
END $$;

-- Check if user_id column exists and is correct type, update if needed
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='bets' AND column_name='user_id' AND data_type='text') THEN
        -- If user_id is text type, we need to convert it to UUID
        ALTER TABLE public.bets ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bets' AND column_name='user_id') THEN
        -- If user_id doesn't exist at all, add it
        ALTER TABLE public.bets ADD COLUMN user_id UUID;
    END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name='bets_user_id_fkey' AND table_name='bets') THEN
        ALTER TABLE public.bets ADD CONSTRAINT bets_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable Row Level Security on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on bets table if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c 
                   JOIN pg_namespace n ON n.oid = c.relnamespace 
                   WHERE n.nspname = 'public' AND c.relname = 'bets' AND c.relrowsecurity = true) THEN
        ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = email);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.jwt() ->> 'email' = email);

-- Drop existing policies on bets table and recreate them
DROP POLICY IF EXISTS "Users can view their own bets" ON public.bets;
DROP POLICY IF EXISTS "Users can insert their own bets" ON public.bets;
DROP POLICY IF EXISTS "Users can update their own bets" ON public.bets;
DROP POLICY IF EXISTS "Users can delete their own bets" ON public.bets;

-- Create new policies for bets table
CREATE POLICY "Users can view their own bets" ON public.bets
    FOR SELECT USING (user_id IN (
        SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'
    ));

CREATE POLICY "Users can insert their own bets" ON public.bets
    FOR INSERT WITH CHECK (user_id IN (
        SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'
    ));

CREATE POLICY "Users can update their own bets" ON public.bets
    FOR UPDATE USING (user_id IN (
        SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'
    ));

CREATE POLICY "Users can delete their own bets" ON public.bets
    FOR DELETE USING (user_id IN (
        SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'
    ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON public.users(nickname);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON public.bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON public.bets(created_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Only add trigger to bets table if updated_at column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='bets' AND column_name='updated_at') THEN
        DROP TRIGGER IF EXISTS update_bets_updated_at ON public.bets;
        CREATE TRIGGER update_bets_updated_at BEFORE UPDATE ON public.bets
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$; 