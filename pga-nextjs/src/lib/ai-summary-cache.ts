import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface CachedSummary {
  id: number;
  tournament_name: string;
  tournament_status: string;
  current_round: number;
  total_rounds: number;
  summary_content: string;
  tournament_data: any;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface SummaryData {
  summary: string;
  tournamentData: {
    name: string;
    status: string;
    round: string;
    lastUpdated: string;
  };
}

/**
 * Get cached AI summary if it exists and is not expired
 */
export async function getCachedSummary(
  tournamentName: string,
  tournamentStatus: string,
  currentRound: number
): Promise<SummaryData | null> {
  try {
    const { data, error } = await supabase
      .from('ai_tournament_summaries')
      .select('*')
      .eq('tournament_name', tournamentName)
      .eq('tournament_status', tournamentStatus)
      .eq('current_round', currentRound)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.log('No cached summary found or error:', error.message);
      return null;
    }

    if (data) {
      console.log('✅ Found cached AI summary');
      return {
        summary: data.summary_content,
        tournamentData: data.tournament_data
      };
    }

    return null;
  } catch (error) {
    console.error('Error retrieving cached summary:', error);
    return null;
  }
}

/**
 * Save AI summary to cache with expiration
 */
export async function saveSummaryToCache(
  tournamentName: string,
  tournamentStatus: string,
  currentRound: number,
  totalRounds: number,
  summaryContent: string,
  tournamentData: any,
  cacheMinutes: number = 30
): Promise<boolean> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (cacheMinutes * 60 * 1000));

    const { error } = await supabase
      .from('ai_tournament_summaries')
      .upsert({
        tournament_name: tournamentName,
        tournament_status: tournamentStatus,
        current_round: currentRound,
        total_rounds: totalRounds,
        summary_content: summaryContent,
        tournament_data: tournamentData,
        updated_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      }, {
        onConflict: 'tournament_name,tournament_status,current_round'
      });

    if (error) {
      console.error('Error saving summary to cache:', error);
      return false;
    }

    console.log('✅ AI summary saved to cache');
    return true;
  } catch (error) {
    console.error('Error saving summary to cache:', error);
    return false;
  }
}

/**
 * Clean up expired summaries (can be called periodically)
 */
export async function cleanupExpiredSummaries(): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('cleanup_expired_ai_summaries');

    if (error) {
      console.error('Error cleaning up expired summaries:', error);
      return 0;
    }

    console.log(`🧹 Cleaned up ${data} expired summaries`);
    return data || 0;
  } catch (error) {
    console.error('Error cleaning up expired summaries:', error);
    return 0;
  }
}

/**
 * Force refresh - delete existing cache for a tournament
 */
export async function invalidateSummaryCache(
  tournamentName: string,
  tournamentStatus: string,
  currentRound: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ai_tournament_summaries')
      .delete()
      .eq('tournament_name', tournamentName)
      .eq('tournament_status', tournamentStatus)
      .eq('current_round', currentRound);

    if (error) {
      console.error('Error invalidating cache:', error);
      return false;
    }

    console.log('🗑️ Cache invalidated for tournament');
    return true;
  } catch (error) {
    console.error('Error invalidating cache:', error);
    return false;
  }
} 