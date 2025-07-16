# PGA Tournament Status Detection Analysis

## Overview
This document analyzes the current PGA official leaderboard parsing logic and provides recommendations for determining tournament status (pre-tournament, active, completed).

## Current System Architecture

### 1. Data Source & Parsing (`/src/lib/leaderboard-fetcher.ts`)

**Data Sources (in priority order):**
```typescript
const urlsToTry = [
  'https://www.pgatour.com/leaderboard',  // Primary leaderboard
  'https://www.pgatour.com/',             // Homepage fallback
];
```

**Parsing Strategy:**
- Scrapes HTML from PGA Tour website
- Extracts `__NEXT_DATA__` script tag (Next.js hydration data)
- Parses `dehydratedState` for tournament/player data
- Handles multiple data structures (leaderboard, field, participants)

**Key Data Structures Found:**
```typescript
// Possible data locations in dehydratedState
- queryData?.leaderboard?.players
- queryData?.field?.players
- queryData?.players
- queryData?.participants
- queryData?.tournament?.field
```

### 2. Tournament Status Detection Logic

**Current Implementation:**
```typescript
const hasScoreData = scoring?.score !== undefined || 
                    scoring?.today !== undefined || 
                    scoring?.total !== undefined || 
                    scoring?.totalScore !== undefined ||
                    playerData?.total !== undefined ||
                    playerData?.totalScore !== undefined;

const actuallyStarted = hasScoreData && !isPreTournament;
```

**Status Indicators:**
- **Pre-Tournament**: `Today: 'E'`, `Total: 'E'`, `Rounds: 'Tournament hasn\'t started'`
- **Active**: Real scores, position changes, round data
- **Completed**: Final scores, cut data, all rounds complete

### 3. Current Usage Patterns

**Betting Availability (`/src/app/bet/page.tsx`):**
```typescript
const isTournamentStarted = (results: BetResult[]): boolean => {
  return results.some(result => 
    result.details.some(player => 
      player.Today !== 'E' || 
      player.Total_Score !== 'E' || 
      (player.Round_Scores !== 'Tournament hasn\'t started' && player.Round_Scores !== 'N/A')
    )
  );
};
```

## Tournament Status Detection Indicators

### 1. **Pre-Tournament Phase**
- ✅ No score data (`Today: 'E'`, `Total: 'E'`)
- ✅ Round scores show "Tournament hasn't started"
- ✅ Player rankings may be based on world rankings or alphabetical
- ✅ No cut data (`CUT`, `WD`, `DQ` status)

### 2. **Active Tournament Phase**
- ✅ Players have daily scores (`Today: "-2"`, `"+1"`)
- ✅ Cumulative scores exist (`Total: "-8"`, `"+3"`)
- ✅ Round scores show actual scores (`"68, 67, 69"`)
- ✅ Position changes occur
- ✅ Cut data appears after Round 2

### 3. **Completed Tournament Phase**
- ✅ All 4 rounds completed
- ✅ Final leaderboard with winners
- ✅ Cut data for missed players
- ✅ No more position changes

## Improved Tournament Status System

### New Implementation (`/src/lib/tournament-status.ts`)

**Enhanced Status Detection:**
```typescript
interface TournamentStatus {
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
```

**Key Improvements:**
1. **Confidence Scoring**: Reliability measure for status determination
2. **Round Tracking**: Determines current round based on score data
3. **Multiple Indicators**: Combines various data points for better accuracy
4. **Metadata**: Provides context about data quality and tournament progress

## Recommendations for Implementation

### 1. **Integrate Enhanced Status Detection**

Update leaderboard API to include tournament status:
```typescript
// In /src/app/api/leaderboard/route.ts
import { analyzeTournamentStatus } from '@/lib/tournament-status';

const liveData = await fetchPGALeaderboard();
const tournamentStatus = analyzeTournamentStatus(liveData.players);

return NextResponse.json({
  players: liveData.players,
  tournamentStatus,
  lastUpdated: liveData.lastUpdated
});
```

### 2. **Update Betting Logic**

Use new status system for betting controls:
```typescript
// In betting components
import { isBettingAllowed, shouldCalculateResults } from '@/lib/tournament-status';

const bettingAllowed = isBettingAllowed(tournamentStatus);
const showResults = shouldCalculateResults(tournamentStatus);
```

### 3. **Enhanced User Experience**

Add tournament status indicators to UI:
```typescript
// Display tournament phase and round information
<div className="tournament-status">
  <Badge variant={getStatusVariant(tournamentStatus.phase)}>
    {getTournamentStatusMessage(tournamentStatus)}
  </Badge>
  {tournamentStatus.phase === 'active' && (
    <span>Round {tournamentStatus.currentRound} of {tournamentStatus.totalRounds}</span>
  )}
</div>
```

### 4. **Robustness Improvements**

Add fallback mechanisms:
```typescript
// Multiple data validation layers
const status = analyzeTournamentStatus(players);

// Fallback to time-based checks if confidence is low
if (status.confidence < 0.5) {
  status = await checkTournamentSchedule(); // API call to tournament schedule
}

// Final fallback to manual override
if (status.phase === 'unknown') {
  status = getManualTournamentStatus(); // Admin-configurable override
}
```

## Data Quality Considerations

### 1. **Score Data Validation**
- Validate score formats (`+1`, `-2`, `E`)
- Check for valid round scores (`65-85` range)
- Ensure position consistency

### 2. **Cut Data Recognition**
- Detect `CUT`, `WD`, `DQ` status
- Understand tied positions (`T5`, `T10`)
- Handle late withdrawals

### 3. **Round Progression**
- Track round completion timing
- Handle delayed rounds due to weather
- Detect playoff scenarios

## Testing Strategy

### 1. **Mock Data Testing**
Create test data for different tournament phases:
```typescript
// Test data for different scenarios
const preTournamentData = { /* players with 'E' scores */ };
const activeTournamentData = { /* players with real scores */ };
const completedTournamentData = { /* final leaderboard */ };
```

### 2. **Integration Testing**
Test with real PGA Tour data:
- Monitor during actual tournaments
- Validate status transitions
- Check confidence scores

### 3. **Edge Case Testing**
- Delayed tournaments
- Weather interruptions
- Playoff scenarios
- Data inconsistencies

## Future Enhancements

### 1. **Official PGA Tour API**
- Investigate official API access
- Reduce scraping dependency
- Improve data reliability

### 2. **Real-time Updates**
- WebSocket connections for live data
- Push notifications for status changes
- Real-time betting restrictions

### 3. **Tournament Scheduling**
- Pre-load tournament schedules
- Automatic tournament detection
- Multi-tournament support

### 4. **Historical Data**
- Store tournament status history
- Analyze pattern recognition
- Improve prediction accuracy

## Implementation Priority

### **High Priority** 🔴
1. Implement enhanced tournament status detection
2. Update betting logic to use new status system
3. Add UI indicators for tournament phase

### **Medium Priority** 🟡
1. Add confidence scoring validation
2. Implement round tracking
3. Create admin override system

### **Low Priority** 🟢
1. Historical data analysis
2. Official API integration
3. Real-time WebSocket updates

## Conclusion

The current PGA leaderboard parsing logic provides a solid foundation for tournament status detection. The proposed enhancements will significantly improve reliability, user experience, and system robustness. The new tournament status system provides comprehensive information while maintaining backward compatibility with existing code.

Key benefits of the enhanced system:
- **Improved Accuracy**: Multiple indicators and confidence scoring
- **Better UX**: Clear tournament phase communication
- **Robustness**: Fallback mechanisms and validation
- **Extensibility**: Easy to add new tournament types and features 