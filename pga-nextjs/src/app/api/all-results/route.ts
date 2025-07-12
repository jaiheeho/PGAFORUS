import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { BetResult, PlayerResult, Player } from '@/types'

// Type for leaderboard response
interface LeaderboardResponse {
  players: Player[]
  lastUpdated?: string
}

// Calculate points based on ranking
function calculatePoints(rank: string): number {
  if (rank === 'CUT' || rank === 'WD' || rank === 'DQ') {
    return -1;
  }
  
  // Handle tied ranks by removing the 'T' prefix
  let rankStr = rank;
  if (rankStr.startsWith('T')) {
    rankStr = rankStr.substring(1);
  }
  
  const numericRank = parseInt(rankStr);
  if (isNaN(numericRank)) {
    return 0;
  }
  
  if (numericRank === 1) return 3; // Winner takes all
  if (numericRank <= 10) return 1; // Top 10 - Solid performance
  if (numericRank <= 30) return 0; // 11th-30th - No points awarded
  
  return -1; // 31+ - Poor performance
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Fetch all bets from Supabase (no authentication required)
    const { data: allBets, error: betsError } = await supabase
      .from('bets')
      .select('*')
      .order('created_at', { ascending: false })

    if (betsError) {
      console.error('Error fetching bets:', betsError)
      return NextResponse.json({ error: 'Failed to fetch bets' }, { status: 500 })
    }

    // Fetch current leaderboard data
    let leaderboardData: LeaderboardResponse | null = null;
    try {
      const leaderboardResponse = await fetch(`${request.nextUrl.origin}/api/leaderboard`);
      if (leaderboardResponse.ok) {
        leaderboardData = await leaderboardResponse.json();
      }
    } catch (error) {
      console.log('Could not fetch leaderboard data:', error);
    }

    // Helper function to get numeric rank for sorting
    const getNumericRank = (rank: string): number => {
      if (rank === 'CUT' || rank === 'WD' || rank === 'DQ') {
        return 999; // Put cut players at the bottom
      }
      
      let rankStr = rank;
      if (rankStr.startsWith('T')) {
        rankStr = rankStr.substring(1);
      }
      
      const numericRank = parseInt(rankStr);
      return isNaN(numericRank) ? 999 : numericRank;
    };

    // Calculate results for each bet
    const results: BetResult[] = (allBets || []).map((bet, index) => {
      const playerResults: PlayerResult[] = bet.players.map((playerName: string) => {
        // Find player in leaderboard
        const leaderboardPlayer = leaderboardData?.players?.find(
          (p: Player) => p.Player.toLowerCase().includes(playerName.toLowerCase()) || 
                        playerName.toLowerCase().includes(p.Player.toLowerCase())
        );

        const rank = leaderboardPlayer?.Rank || 'CUT';
        const today = leaderboardPlayer?.Today || 'E';
        const totalScore = leaderboardPlayer?.['Total Score'] || 'E';
        const roundScores = leaderboardPlayer?.['Round Scores'] || 'N/A';
        const points = calculatePoints(rank);

        return {
          Player: playerName,
          Rank: rank,
          Today: today,
          Total_Score: totalScore,
          Round_Scores: roundScores,
          Points: points
        };
      });

      const totalPoints = playerResults.reduce((sum, player) => sum + player.Points, 0);
      
      // Find the best current tournament position for this team
      const bestPosition = Math.min(...playerResults.map(p => getNumericRank(p.Rank)));
      
      // Find the best performing player name for display
      const bestPlayer = playerResults.find(p => getNumericRank(p.Rank) === bestPosition);

      return {
        owner: bet.user_nickname || `Player #${index + 1}`,
        total_points: totalPoints,
        details: playerResults,
        best_position: bestPosition,
        best_player: bestPlayer?.Player || '',
        best_rank: bestPlayer?.Rank || 'CUT'
      };
    });

    // Sort by current tournament position first (best position = lowest rank), then by points
    results.sort((a, b) => {
      // Primary sort: best tournament position (lower rank number = better)
      if (a.best_position !== b.best_position) {
        return a.best_position - b.best_position;
      }
      // Secondary sort: total fantasy points (higher = better)
      return b.total_points - a.total_points;
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in all-results API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 