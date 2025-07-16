-- Create table for caching AI tournament summaries
CREATE TABLE IF NOT EXISTS ai_tournament_summaries (
    id SERIAL PRIMARY KEY,
    tournament_name VARCHAR(255) NOT NULL,
    tournament_status VARCHAR(50) NOT NULL,
    current_round INTEGER NOT NULL,
    total_rounds INTEGER NOT NULL,
    summary_content TEXT NOT NULL,
    tournament_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(tournament_name, tournament_status, current_round)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_summaries_tournament_lookup 
ON ai_tournament_summaries(tournament_name, tournament_status, current_round);

-- Create index for cleanup of expired summaries
CREATE INDEX IF NOT EXISTS idx_ai_summaries_expires_at 
ON ai_tournament_summaries(expires_at);

-- Function to clean up expired summaries
CREATE OR REPLACE FUNCTION cleanup_expired_ai_summaries()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ai_tournament_summaries 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies if using Supabase
ALTER TABLE ai_tournament_summaries ENABLE ROW LEVEL SECURITY;

-- Policy to allow read access for all authenticated users
CREATE POLICY "Allow read access for all users" ON ai_tournament_summaries
    FOR SELECT USING (true);

-- Policy to allow insert/update for service role only
CREATE POLICY "Allow insert/update for service role" ON ai_tournament_summaries
    FOR ALL USING (auth.role() = 'service_role');

-- Comments for documentation
COMMENT ON TABLE ai_tournament_summaries IS 'Cache table for AI-generated tournament summaries';
COMMENT ON COLUMN ai_tournament_summaries.tournament_name IS 'Name of the tournament';
COMMENT ON COLUMN ai_tournament_summaries.tournament_status IS 'Current status (pre-tournament, active, completed)';
COMMENT ON COLUMN ai_tournament_summaries.current_round IS 'Current round number';
COMMENT ON COLUMN ai_tournament_summaries.summary_content IS 'AI-generated summary content';
COMMENT ON COLUMN ai_tournament_summaries.tournament_data IS 'Additional tournament metadata';
COMMENT ON COLUMN ai_tournament_summaries.expires_at IS 'When this summary expires and needs refresh'; 