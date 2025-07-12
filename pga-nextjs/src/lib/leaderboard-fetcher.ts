import * as cheerio from 'cheerio';
import { Player } from '@/types';

interface PGALeaderboardResponse {
  players: Player[];
  tournament_name?: string;
  lastUpdated: Date;
}

// Type for dehydrated state data
interface DehydratedStateData {
  queries?: Array<{
    state?: {
      data?: {
        leaderboard?: { players?: unknown[] }
        field?: { players?: unknown[] }
        players?: unknown[]
        participants?: unknown[]
        tournament?: { field?: unknown[] }
        data?: unknown[]
      }
    }
  }>
}

// Type for player data structures
interface PlayerDataStructure {
  player?: {
    displayName?: string
    name?: string
  }
  displayName?: string
  name?: string
  playerName?: string
  total?: number
  totalScore?: number
  scoringData?: {
    position?: number
    rank?: number
    score?: number
    today?: number
    total?: number
    totalScore?: number
    rounds?: string[]
    POS?: number | string
    pos?: number | string
  }
  score?: {
    position?: number
    rank?: number
    score?: number
    today?: number
    total?: number
    totalScore?: number
    rounds?: string[]
    POS?: number | string
    pos?: number | string
  }
  position?: number
  rank?: number
  POS?: number | string
  pos?: number | string
  currentPosition?: number
  tournamentPosition?: number
  leaderboardPosition?: number
  rounds?: string[]
}

export async function fetchPGALeaderboard(): Promise<PGALeaderboardResponse | null> {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    };

    // Try multiple URLs to get complete player data
    const cacheBuster = `?cb=${Date.now()}`;
    const urlsToTry = [
      `https://www.pgatour.com/leaderboard${cacheBuster}`,  // Try leaderboard page first
      `https://www.pgatour.com/${cacheBuster}`,             // Homepage as fallback
    ];

    for (const url of urlsToTry) {
      console.log(`🔍 Fetching PGA Tour data from: ${url}`);
      
      try {
        const response = await fetch(url, { headers });
        if (response.status !== 200) {
          console.log(`⚠️ Failed to fetch ${url}, status: ${response.status}`);
          continue;
        }

        const html = await response.text();
        const tournamentName = 'Current Tournament';

        // Try to find Next.js data in the page
        const $ = cheerio.load(html);
        const nextDataScript = $('script#__NEXT_DATA__').html();
        
        if (nextDataScript) {
          try {
            const jsonData = JSON.parse(nextDataScript);
            
            if (jsonData?.props?.pageProps?.dehydratedState) {
              console.log('🎯 Found dehydratedState in Next.js data');
              const players = extractPlayersFromDehydratedState(jsonData.props.pageProps.dehydratedState, tournamentName);
              if (players && players.length > 0) {
                console.log(`✅ Successfully extracted ${players.length} players from ${url}`);
                return {
                  players,
                  tournament_name: tournamentName,
                  lastUpdated: new Date()
                };
              }
            }
            
          } catch (parseError) {
            console.log(`⚠️ Could not parse tournament data from ${url}:`, parseError);
          }
        } else {
          console.log(`⚠️ No __NEXT_DATA__ script found in ${url}`);
        }
      } catch (fetchError) {
        console.log(`❌ Error fetching ${url}:`, fetchError);
      }
    }

    // Final fallback: Return null to use mock data
    console.log('📝 No real player data found from any URL, will use fallback mock data');
    return null;

  } catch (error) {
    console.error('❌ Error fetching PGA leaderboard:', error);
    return null;
  }
}

function extractPlayersFromDehydratedState(dehydratedState: DehydratedStateData, tournamentName: string): Player[] | null {
  try {
    console.log('🔍 Analyzing dehydratedState structure...');
    
    // Navigate through the dehydratedState to find player data
    const queries = dehydratedState?.queries || [];
    console.log(`📊 Found ${queries.length} queries in dehydratedState`);
    
    let allPlayersFound: Player[] = [];
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      const queryData = query?.state?.data;
      
      if (!queryData) continue;
      
      console.log(`🔍 Query ${i + 1}: Checking for player data...`);
      
      // Check for leaderboard data
      if (queryData?.leaderboard?.players) {
        console.log(`🎯 Found leaderboard players in query ${i + 1}: ${queryData.leaderboard.players.length} players`);
        const leaderboardPlayers = parsePlayersArray(queryData.leaderboard.players, tournamentName, false);
        if (leaderboardPlayers.length > allPlayersFound.length) {
          allPlayersFound = leaderboardPlayers;
        }
      }
      
      // Check for field data (complete tournament field)
      if (queryData?.field?.players) {
        console.log(`🎯 Found field players in query ${i + 1}: ${queryData.field.players.length} players`);
        const fieldPlayers = parsePlayersArray(queryData.field.players, tournamentName, false);
        if (fieldPlayers.length > allPlayersFound.length) {
          allPlayersFound = fieldPlayers;
        }
      }
      
      // Check for players array directly
      if (queryData?.players && Array.isArray(queryData.players)) {
        console.log(`🎯 Found players array in query ${i + 1}: ${queryData.players.length} players`);
        const players = parsePlayersArray(queryData.players, tournamentName, false);
        if (players.length > allPlayersFound.length) {
          allPlayersFound = players;
        }
      }
      
      // Check for tournament participants
      if (queryData?.participants && Array.isArray(queryData.participants)) {
        console.log(`🎯 Found participants in query ${i + 1}: ${queryData.participants.length} players`);
        const participants = parsePlayersArray(queryData.participants, tournamentName, false);
        if (participants.length > allPlayersFound.length) {
          allPlayersFound = participants;
        }
      }
      
      // Check for tournament field data
      if (queryData?.tournament?.field) {
        console.log(`🎯 Found tournament.field in query ${i + 1}`);
        if (Array.isArray(queryData.tournament.field)) {
          const tournamentField = parsePlayersArray(queryData.tournament.field, tournamentName, false);
          if (tournamentField.length > allPlayersFound.length) {
            allPlayersFound = tournamentField;
          }
        }
      }
      
      // Check for any other arrays that might contain player data
      if (queryData?.data && Array.isArray(queryData.data)) {
        console.log(`🎯 Found data array in query ${i + 1}: ${queryData.data.length} items`);
        const dataPlayers = parsePlayersArray(queryData.data, tournamentName, false);
        if (dataPlayers.length > allPlayersFound.length) {
          allPlayersFound = dataPlayers;
        }
      }
    }
    
    if (allPlayersFound.length > 0) {
      console.log(`✅ Best result: ${allPlayersFound.length} players found`);
      return allPlayersFound;
    }
    
    console.log('⚠️ No player data found in any query');
    return null;
  } catch (error) {
    console.error('Error extracting from dehydratedState:', error);
    return null;
  }
}

function parsePlayersArray(playersData: unknown[], tournamentName: string, isPreTournament: boolean): Player[] {
  const players: Player[] = [];
  
  for (let i = 0; i < playersData.length; i++) {
    const playerData = playersData[i] as PlayerDataStructure;
    
    // Try different possible player data structures
    const player = playerData?.player || playerData;
    const scoring = playerData?.scoringData || playerData?.score;
    
    const name = player?.displayName || 
                 player?.name || 
                 playerData?.displayName || 
                 playerData?.name ||
                 playerData?.playerName;
    
    if (!name || name === 'Unknown') continue;
    
    // Debug logging for first few players to understand data structure
    if (i < 3) {
      console.log(`🔍 Player ${i + 1} (${name}) data structure:`, {
        playerData_keys: Object.keys(playerData || {}),
        scoring_keys: Object.keys(scoring || {}),
        score_values: {
          'scoring.score': scoring?.score,
          'scoring.today': scoring?.today,
          'scoring.total': scoring?.total,
          'scoring.totalScore': scoring?.totalScore,
          'playerData.total': playerData?.total,
          'playerData.totalScore': playerData?.totalScore,
        },
        POS_values: {
          'scoring.POS': (scoring as any)?.POS,
          'scoring.pos': (scoring as any)?.pos,
          'playerData.POS': playerData?.POS,
          'playerData.pos': playerData?.pos,
          'scoring.position': scoring?.position,
          'scoring.rank': scoring?.rank,
          'playerData.position': playerData?.position,
          'playerData.rank': playerData?.rank,
          'playerData.currentPosition': playerData?.currentPosition,
          'playerData.tournamentPosition': playerData?.tournamentPosition,
          'playerData.leaderboardPosition': playerData?.leaderboardPosition
        }
      });
    }
    
    // Look for position/ranking in multiple possible fields
    const rank = String(
      (scoring as any)?.POS || 
      (scoring as any)?.pos || 
      playerData?.POS || 
      playerData?.pos || 
      scoring?.position || 
      scoring?.rank || 
      playerData?.position || 
      playerData?.rank ||
      playerData?.currentPosition ||
      playerData?.tournamentPosition ||
      playerData?.leaderboardPosition ||
      (isPreTournament ? i + 1 : '-')  // Only use array index as last resort
    );
    
    // Check if tournament has actually started by looking for score data
    const hasScoreData = scoring?.score !== undefined || 
                        scoring?.today !== undefined || 
                        scoring?.total !== undefined || 
                        scoring?.totalScore !== undefined ||
                        playerData?.total !== undefined ||
                        playerData?.totalScore !== undefined;
    
    const actuallyStarted = hasScoreData && !isPreTournament;
    
    const today = actuallyStarted ? formatScore(scoring?.score || scoring?.today || 0) : 'E';
    const total = actuallyStarted ? formatScore(scoring?.total || scoring?.totalScore || playerData?.total || playerData?.totalScore || 0) : 'E';
    const rounds = actuallyStarted ? 
                   (scoring?.rounds || playerData?.rounds || []).join(', ') || 'N/A' :
                   'Tournament hasn\'t started';
    
    players.push({
      Player: name,
      Rank: rank,
      Today: today,
      'Total Score': total,
      'Round Scores': rounds
    });
  }
  
  return players;
}

function formatScore(score: number | string): string {
  if (typeof score === 'string') return score;
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : `${score}`;
} 