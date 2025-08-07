import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { fetchPGALeaderboard } from '@/lib/leaderboard-fetcher';
import { analyzeTournamentStatus } from '@/lib/tournament-status';
import { loadPrompt, formatPrompt } from '@/lib/prompt-loader';
import { getCachedSummary, saveSummaryToCache, invalidateSummaryCache } from '@/lib/ai-summary-cache';
import { createClient } from '@/lib/supabase';
import { BetResult, PlayerResult } from '@/types';

// Check if OpenAI API key is available
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error('OPENAI_API_KEY not found in environment variables');
}

const openai = openaiApiKey ? new OpenAI({
  apiKey: openaiApiKey,
}) : null;

// Helper function to calculate points based on ranking
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

// Fetch current betting results
async function fetchBettingResults(leaderboardData: any) {
  try {
    const supabase = createClient();
    
    // Fetch all bets from Supabase
    const { data: allBets, error: betsError } = await supabase
      .from('bets')
      .select('*')
      .order('created_at', { ascending: false });

    if (betsError) {
      console.error('Error fetching bets:', betsError);
      return [];
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
          (p: any) => p.Player.toLowerCase().includes(playerName.toLowerCase()) || 
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

    return results;
  } catch (error) {
    console.error('Error in fetchBettingResults:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI is configured
    if (!openai) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.' 
      }, { status: 500 });
    }

    const { type, message, context, forceRefresh } = await request.json();
    
    // Fetch current tournament data
    const leaderboardData = await fetchPGALeaderboard();
    if (!leaderboardData || !leaderboardData.players || leaderboardData.players.length === 0) {
      return NextResponse.json({ 
        error: 'Unable to fetch tournament data. Please try again later.' 
      }, { status: 500 });
    }
    
    const { players, tournament_name } = leaderboardData;
    const tournamentStatus = analyzeTournamentStatus(players);
    
    // Fetch betting results and extract bet players
    const bettingResults = await fetchBettingResults(leaderboardData);
    
    // Extract all unique players from bets
    const betPlayers = new Set<string>();
    bettingResults.forEach(bet => {
      bet.details.forEach(playerResult => {
        betPlayers.add(playerResult.Player);
      });
    });
    
    // Filter leaderboard to focus on bet players, then add top performers
    const focusPlayers = players.filter(player => 
      Array.from(betPlayers).some(betPlayer => 
        player.Player.toLowerCase().includes(betPlayer.toLowerCase()) || 
        betPlayer.toLowerCase().includes(player.Player.toLowerCase())
      )
    );
    
    // Add top 5 players if not already included
    const topPlayers = players.slice(0, 5);
    topPlayers.forEach(topPlayer => {
      if (!focusPlayers.find(fp => fp.Player === topPlayer.Player)) {
        focusPlayers.push(topPlayer);
      }
    });
    
    // Prepare tournament data for AI
    const tournamentData = {
      name: tournament_name || 'Current Tournament',
      status: tournamentStatus,
      topPlayers: players.slice(0, 10),
      focusPlayers: focusPlayers,
      bettingResults: bettingResults,
      totalPlayers: players.length,
      totalBets: bettingResults.length,
      lastUpdated: new Date().toISOString()
    };
    
    if (type === 'summary') {
      return await generateTournamentSummary(tournamentData, forceRefresh);
    } else if (type === 'chat') {
      return await handleChatMessage(message, tournamentData, context);
    }
    
    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
  } catch (error) {
    console.error('Tournament AI API error:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred. Please try again later.' 
    }, { status: 500 });
  }
}

async function generateTournamentSummary(tournamentData: any, forceRefresh: boolean = false) {
  try {
    if (!openai) {
      throw new Error('OpenAI not configured');
    }

    const tournamentName = tournamentData.name;
    const tournamentStatus = tournamentData.status.phase;
    const currentRound = tournamentData.status.currentRound;
    const totalRounds = tournamentData.status.totalRounds;

    // If force refresh is requested, invalidate cache first
    if (forceRefresh) {
      await invalidateSummaryCache(tournamentName, tournamentStatus, currentRound);
      console.log('🔄 Force refresh requested, cache invalidated');
    }

    // Check for cached summary first (unless force refresh)
    if (!forceRefresh) {
      const cachedSummary = await getCachedSummary(tournamentName, tournamentStatus, currentRound);
      if (cachedSummary) {
        console.log('⚡ Returning cached AI summary');
        return NextResponse.json(cachedSummary);
      }
    }

    // Generate new summary
    console.log('🤖 Generating new AI summary');

    // Load prompt template
    const promptTemplate = loadPrompt('tournament-summary.txt');
    if (!promptTemplate) {
      throw new Error('Failed to load prompt template');
    }

    // Format leaderboard data (focus on bet players)
    const focusPlayersText = tournamentData.focusPlayers.map((player: any, index: number) => 
      `${index + 1}. ${player.Player} - Rank: ${player.Rank}, Today: ${player.Today}, Total: ${player['Total Score']}`
    ).join('\n');
    
    // Format top leaderboard for context
    const leaderboardText = tournamentData.topPlayers.map((player: any, index: number) => 
      `${index + 1}. ${player.Player} - Rank: ${player.Rank}, Today: ${player.Today}, Total: ${player['Total Score']}`
    ).join('\n');
    
    // Format betting results for AI analysis
    const bettingAnalysisText = tournamentData.bettingResults.slice(0, 10).map((bet: BetResult, index: number) => {
      const playerDetails = bet.details.map(p => `${p.Player} (${p.Rank}, ${p.Points}pts)`).join(', ');
      return `${index + 1}. ${bet.owner}: ${bet.total_points}pts - Players: ${playerDetails} - Best: ${bet.best_player} (${bet.best_rank})`;
    }).join('\n');

    // Create complete list of all players in all bets
    const allBetPlayersText = tournamentData.bettingResults.map((bet: BetResult) => {
      const playerNames = bet.details.map(p => p.Player).join(', ');
      return `• ${bet.owner}: ${playerNames}`;
    }).join('\n');

    // Format prompt with variables
    const prompt = formatPrompt(promptTemplate, {
      tournament_name: tournamentData.name,
      tournament_status: tournamentData.status.phase,
      current_round: tournamentData.status.currentRound.toString(),
      total_rounds: tournamentData.status.totalRounds.toString(),
      total_players: tournamentData.totalPlayers.toString(),
      total_bets: tournamentData.totalBets.toString(),
      has_started: tournamentData.status.hasStarted.toString(),
      leaderboard_data: leaderboardText,
      focus_players_data: focusPlayersText,
      betting_results_data: bettingAnalysisText,
      all_bet_players_list: allBetPlayersText
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a knowledgeable PGA Tour analyst who provides insightful tournament summaries and analysis. Be conversational but professional, and focus on the most interesting aspects of the tournament."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    const summary = completion.choices[0]?.message?.content || 'Unable to generate summary';
    
    const responseData = {
      summary,
      tournamentData: {
        name: tournamentData.name,
        status: tournamentData.status.phase,
        round: `${tournamentData.status.currentRound}/${tournamentData.status.totalRounds}`,
        lastUpdated: tournamentData.lastUpdated
      }
    };

    // Save to cache - 3 minutes for started tournaments, 30 minutes for pre-tournament
    const isStarted = tournamentData.status.hasStarted;
    const cacheMinutes = isStarted ? 3 : 30;
    
    await saveSummaryToCache(
      tournamentName,
      tournamentStatus,
      currentRound,
      totalRounds,
      summary,
      responseData.tournamentData,
      cacheMinutes // Cache for 3 minutes if started, 30 minutes if not started
    );

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error generating tournament summary:', error);
    return NextResponse.json({ 
      error: 'Failed to generate summary. Please check your API configuration.' 
    }, { status: 500 });
  }
}

async function handleChatMessage(message: string, tournamentData: any, context: any) {
  try {
    if (!openai) {
      throw new Error('OpenAI not configured');
    }

    // Load system prompt template
    const systemPromptTemplate = loadPrompt('tournament-chat-system.txt');
    if (!systemPromptTemplate) {
      throw new Error('Failed to load system prompt template');
    }

    let contextData = '';
    if (context?.summary) {
      // Load context template
      const contextTemplate = loadPrompt('tournament-chat-context.txt');
      if (contextTemplate) {
        // Format leaderboard data
        const leaderboardText = tournamentData.topPlayers.map((player: any, index: number) => 
          `${index + 1}. ${player.Player} - Rank: ${player.Rank}, Today: ${player.Today}, Total: ${player['Total Score']}`
        ).join('\n');

        contextData = formatPrompt(contextTemplate, {
          summary: context.summary,
          tournament_name: tournamentData.name,
          tournament_status: tournamentData.status.phase,
          current_round: tournamentData.status.currentRound.toString(),
          total_rounds: tournamentData.status.totalRounds.toString(),
          total_players: tournamentData.totalPlayers.toString(),
          leaderboard_data: leaderboardText
        });
      }
    }

    // Format system prompt
    const systemPrompt = formatPrompt(systemPromptTemplate, {
      context_data: contextData
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const response = completion.choices[0]?.message?.content || 'Unable to process your question';
    
    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error handling chat message:', error);
    return NextResponse.json({ 
      error: 'Failed to process message. Please check your API configuration.' 
    }, { status: 500 });
  }
} 