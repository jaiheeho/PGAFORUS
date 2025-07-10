-- Create draft_bets table to store partial bet selections
CREATE TABLE IF NOT EXISTS draft_bets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_nickname TEXT NOT NULL,
    players TEXT[] NOT NULL DEFAULT '{}',
    tournament_name TEXT NOT NULL DEFAULT 'Current Tournament',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id) -- Only one draft per user
);

-- Create RLS policies for draft_bets
ALTER TABLE draft_bets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own draft bets
CREATE POLICY "Users can view their own draft bets" ON draft_bets
    FOR SELECT USING (auth.uid()::text IN (
        SELECT id::text FROM users WHERE email = auth.jwt() ->> 'email'
    ));

-- Policy: Users can insert their own draft bets
CREATE POLICY "Users can insert their own draft bets" ON draft_bets
    FOR INSERT WITH CHECK (auth.uid()::text IN (
        SELECT id::text FROM users WHERE email = auth.jwt() ->> 'email'
    ));

-- Policy: Users can update their own draft bets
CREATE POLICY "Users can update their own draft bets" ON draft_bets
    FOR UPDATE USING (auth.uid()::text IN (
        SELECT id::text FROM users WHERE email = auth.jwt() ->> 'email'
    )) WITH CHECK (auth.uid()::text IN (
        SELECT id::text FROM users WHERE email = auth.jwt() ->> 'email'
    ));

-- Policy: Users can delete their own draft bets
CREATE POLICY "Users can delete their own draft bets" ON draft_bets
    FOR DELETE USING (auth.uid()::text IN (
        SELECT id::text FROM users WHERE email = auth.jwt() ->> 'email'
    ));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_draft_bets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_draft_bets_updated_at
    BEFORE UPDATE ON draft_bets
    FOR EACH ROW
    EXECUTE FUNCTION update_draft_bets_updated_at(); 