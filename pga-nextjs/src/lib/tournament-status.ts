export interface TournamentStatus {
  phase: 'pre-tournament' | 'active' | 'completed' | 'unknown';
  currentRound: number;
  totalRounds: number;
  hasStarted: boolean;
  isComplete: boolean;
  confidence: number; // 0-1 confidence score
  indicators: {
    hasScoreData: boolean;
    hasRoundScores: boolean;
    hasMovement: boolean;
    hasPositions: boolean;
    cutMade: boolean;
  };
  metadata: {
    playersWithScores: number;
    playersMadeCut: number;
    playersTotal: number;
    lastUpdated: Date;
  };
}

export interface PlayerStatusData {
  player: string;
  rank: string;
  today: string;
  total: string;
  rounds: string;
  hasCutData: boolean;
  hasScoreData: boolean;
  hasRoundData: boolean;
}

/**
 * Analyzes tournament data to determine comprehensive tournament status
 */
export function analyzeTournamentStatus(players: any[]): TournamentStatus {
  const playerData: PlayerStatusData[] = players.map(p => ({
    player: p.Player,
    rank: p.Rank,
    today: p.Today,
    total: p['Total Score'],
    rounds: p['Round Scores'],
    hasCutData: ['CUT', 'WD', 'DQ'].includes(p.Rank),
    hasScoreData: (p.Today !== 'E' && p.Today !== '') || (p['Total Score'] !== 'E' && p['Total Score'] !== ''),
    hasRoundData: p['Round Scores'] && 
                  p['Round Scores'] !== 'Tournament hasn\'t started' && 
                  p['Round Scores'] !== 'N/A' &&
                  p['Round Scores'] !== '-, -, -, -' &&
                  !p['Round Scores'].match(/^[-, ]+$/)
  }));

  const indicators = {
    hasScoreData: playerData.some(p => p.hasScoreData),
    hasRoundScores: playerData.some(p => p.hasRoundData),
    hasMovement: playerData.some(p => p.today !== 'E' && p.today !== ''),
    hasPositions: playerData.some(p => p.rank !== '-' && !isNaN(parseInt(p.rank))),
    cutMade: playerData.some(p => p.hasCutData)
  };

  const metadata = {
    playersWithScores: playerData.filter(p => p.hasScoreData).length,
    playersMadeCut: playerData.filter(p => p.hasCutData).length,
    playersTotal: playerData.length,
    lastUpdated: new Date()
  };

  // Calculate current round based on round scores
  const currentRound = calculateCurrentRound(playerData);
  const totalRounds = 4; // Standard PGA tournament

  // Determine tournament phase
  let phase: TournamentStatus['phase'] = 'unknown';
  let confidence = 0;

  // Check for strong pre-tournament indicators
  const allPlayersHaveEScores = playerData.every(p => p.today === 'E' && p.total === 'E');
  const allPlayersHaveDashRounds = playerData.every(p => !p.hasRoundData);
  const allPlayersHaveDashRank = playerData.every(p => p.rank === '-');

  if ((!indicators.hasScoreData && !indicators.hasRoundScores) || 
      (allPlayersHaveEScores && allPlayersHaveDashRounds && allPlayersHaveDashRank)) {
    phase = 'pre-tournament';
    confidence = 0.95;
  } else if (indicators.hasScoreData && !indicators.cutMade && currentRound < totalRounds) {
    phase = 'active';
    confidence = 0.8;
  } else if (indicators.cutMade && currentRound >= 2) {
    phase = 'active';
    confidence = 0.85;
  } else if (currentRound >= totalRounds && indicators.hasScoreData) {
    phase = 'completed';
    confidence = 0.9;
  } else if (!indicators.hasScoreData && !indicators.hasMovement && !indicators.hasPositions) {
    // Additional fallback for pre-tournament when data is unclear
    phase = 'pre-tournament';
    confidence = 0.7;
  } else {
    phase = 'unknown';
    confidence = 0.3;
  }

  // Adjust confidence based on data quality
  if (metadata.playersWithScores / metadata.playersTotal > 0.8) {
    confidence = Math.min(1, confidence + 0.1);
  }

  return {
    phase,
    currentRound,
    totalRounds,
    hasStarted: phase !== 'pre-tournament',
    isComplete: phase === 'completed',
    confidence,
    indicators,
    metadata
  };
}

/**
 * Calculates the current round based on round scores data
 */
function calculateCurrentRound(playerData: PlayerStatusData[]): number {
  const roundCounts = playerData
    .filter(p => p.hasRoundData)
    .map(p => {
      const rounds = p.rounds.split(',').map(s => s.trim()).filter(s => s && s !== '-');
      return rounds.length;
    });

  if (roundCounts.length === 0) return 0;

  // Return the mode (most common round count)
  const roundCountMap = roundCounts.reduce((acc, count) => {
    acc[count] = (acc[count] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const maxRounds = Math.max(...Object.keys(roundCountMap).map(Number));
  return maxRounds;
}

/**
 * Determines if betting should be allowed based on tournament status
 */
export function isBettingAllowed(status: TournamentStatus): boolean {
  // Allow betting only before tournament starts
  return status.phase === 'pre-tournament' && status.confidence > 0.7;
}

/**
 * Determines if results should be calculated based on tournament status
 */
export function shouldCalculateResults(status: TournamentStatus): boolean {
  // Calculate results during active tournament or when completed
  return (status.phase === 'active' || status.phase === 'completed') && 
         status.confidence > 0.5;
}

/**
 * Gets human-readable tournament status message
 */
export function getTournamentStatusMessage(status: TournamentStatus): string {
  switch (status.phase) {
    case 'pre-tournament':
      return `Tournament hasn't started yet. Betting is open!`;
    case 'active':
      return `Tournament is active (Round ${status.currentRound} of ${status.totalRounds})`;
    case 'completed':
      return `Tournament completed (${status.totalRounds} rounds)`;
    default:
      return 'Tournament status unknown';
  }
}

/**
 * Simple tournament status check (backwards compatibility)
 */
export function isTournamentStarted(players: any[]): boolean {
  const status = analyzeTournamentStatus(players);
  return status.hasStarted && status.confidence > 0.6;
} 