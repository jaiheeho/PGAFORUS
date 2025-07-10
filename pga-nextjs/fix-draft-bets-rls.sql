-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own draft bets" ON draft_bets;
DROP POLICY IF EXISTS "Users can insert their own draft bets" ON draft_bets;
DROP POLICY IF EXISTS "Users can update their own draft bets" ON draft_bets;
DROP POLICY IF EXISTS "Users can delete their own draft bets" ON draft_bets;

-- Disable RLS temporarily to allow service role access
ALTER TABLE draft_bets DISABLE ROW LEVEL SECURITY;

-- For now, let's disable RLS on draft_bets since we're using service role authentication
-- and handling permissions in the API layer

-- Alternative: If you want to re-enable RLS later with proper policies, uncomment below:
-- ALTER TABLE draft_bets ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Allow service role full access" ON draft_bets
--     FOR ALL USING (true);
-- 
-- CREATE POLICY "Allow authenticated users full access" ON draft_bets
--     FOR ALL USING (auth.role() = 'authenticated'); 