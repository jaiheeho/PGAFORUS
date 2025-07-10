import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { createClient } from '@/lib/supabase'
import { BetResult, PlayerResult, Player } from '@/types'
import { authOptions } from '@/lib/auth-options'

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
  
  const numericRank = parseInt(rank);
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    // Fetch all bets from Supabase and filter
    const { data: allBets, error: betsError } = await supabase
      .from('bets')
      .select('*')
      .order('created_at', { ascending: false })

    if (betsError) {
      console.error('Error fetching bets:', betsError)
      return NextResponse.json({ error: 'Failed to fetch bets' }, { status: 500 })
    }

    // Filter bets for current user
    const bets = allBets?.filter(bet => {
      return bet.user_email === session.user?.email || 
             bet.user_name === session.user?.name ||
             bet.owner === session.user?.name ||
             bet.owner === session.user?.email ||
             bet.user_id === `user_${Buffer.from(session.user?.email || '').toString('base64').slice(0, 8)}`
    }) || []

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

    // Calculate results for each bet
    const results: BetResult[] = (bets || []).map((bet, index) => {
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

      return {
        owner: bet.user_name || bet.owner || session.user?.name || `Bet #${index + 1}`,
        total_points: totalPoints,
        details: playerResults
      };
    });

    // Sort by total points (highest first)
    results.sort((a, b) => b.total_points - a.total_points);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in results API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 