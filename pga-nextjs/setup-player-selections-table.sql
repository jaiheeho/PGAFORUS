-- Create player_selections table for tracking individual player selections
CREATE TABLE IF NOT EXISTS public.player_selections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_nickname VARCHAR(20) NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('add', 'remove')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.player_selections ENABLE ROW LEVEL SECURITY;

-- Create policies for player_selections table
CREATE POLICY "Users can view their own player selections" ON public.player_selections
    FOR SELECT USING (user_id IN (
        SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'
    ));

CREATE POLICY "Users can insert their own player selections" ON public.player_selections
    FOR INSERT WITH CHECK (user_id IN (
        SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'
    ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_player_selections_user_id ON public.player_selections(user_id);
CREATE INDEX IF NOT EXISTS idx_player_selections_created_at ON public.player_selections(created_at);
CREATE INDEX IF NOT EXISTS idx_player_selections_player_name ON public.player_selections(player_name);
CREATE INDEX IF NOT EXISTS idx_player_selections_action ON public.player_selections(action); 