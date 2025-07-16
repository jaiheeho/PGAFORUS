import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { fetchPGALeaderboard } from '@/lib/leaderboard-fetcher';
import { analyzeTournamentStatus } from '@/lib/tournament-status';
import { loadPrompt, formatPrompt } from '@/lib/prompt-loader';
import { getCachedSummary, saveSummaryToCache, invalidateSummaryCache } from '@/lib/ai-summary-cache';

// Check if OpenAI API key is available
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error('OPENAI_API_KEY not found in environment variables');
}

const openai = openaiApiKey ? new OpenAI({
  apiKey: openaiApiKey,
}) : null;

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
    
    // Prepare tournament data for AI
    const tournamentData = {
      name: tournament_name || 'Current Tournament',
      status: tournamentStatus,
      topPlayers: players.slice(0, 10),
      totalPlayers: players.length,
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

    // Format leaderboard data
    const leaderboardText = tournamentData.topPlayers.map((player: any, index: number) => 
      `${index + 1}. ${player.Player} - Rank: ${player.Rank}, Today: ${player.Today}, Total: ${player['Total Score']}`
    ).join('\n');

    // Format prompt with variables
    const prompt = formatPrompt(promptTemplate, {
      tournament_name: tournamentData.name,
      tournament_status: tournamentData.status.phase,
      current_round: tournamentData.status.currentRound.toString(),
      total_rounds: tournamentData.status.totalRounds.toString(),
      total_players: tournamentData.totalPlayers.toString(),
      has_started: tournamentData.status.hasStarted.toString(),
      leaderboard_data: leaderboardText
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

    // Save to cache (30 minutes expiration)
    await saveSummaryToCache(
      tournamentName,
      tournamentStatus,
      currentRound,
      totalRounds,
      summary,
      responseData.tournamentData,
      30 // Cache for 30 minutes
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