-- Create users table
CREATE TABLE public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bets table (updated structure)
CREATE TABLE public.bets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_nickname VARCHAR(20) NOT NULL,
    players TEXT[] NOT NULL,
    tournament_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = email);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.jwt() ->> 'email' = email);

-- Create policies for bets table
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
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_nickname ON public.users(nickname);
CREATE INDEX idx_bets_user_id ON public.bets(user_id);
CREATE INDEX idx_bets_created_at ON public.bets(created_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bets_updated_at BEFORE UPDATE ON public.bets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 