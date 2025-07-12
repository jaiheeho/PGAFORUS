import { NextResponse } from 'next/server';
import { LeaderboardData } from '@/types';
import { fetchPGALeaderboard } from '@/lib/leaderboard-fetcher';

// Mock data as fallback
const mockLeaderboardData: LeaderboardData = {
  players: [
    {
      Player: "Scottie Scheffler",
      Rank: "1",
      Today: "-3",
      "Total Score": "-12",
      "Round Scores": "68, 67, 69"
    },
    {
      Player: "Rory McIlroy",
      Rank: "2", 
      Today: "-2",
      "Total Score": "-10",
      "Round Scores": "70, 66, 68"
    },
    {
      Player: "Jon Rahm",
      Rank: "3",
      Today: "-1", 
      "Total Score": "-8",
      "Round Scores": "69, 69, 68"
    },
    {
      Player: "Viktor Hovland",
      Rank: "4",
      Today: "E",
      "Total Score": "-7",
      "Round Scores": "71, 68, 67"
    },
    {
      Player: "Xander Schauffele", 
      Rank: "T5",
      Today: "+1",
      "Total Score": "-6",
      "Round Scores": "69, 70, 69"
    },
    {
      Player: "Patrick Cantlay",
      Rank: "T5", 
      Today: "-1",
      "Total Score": "-6",
      "Round Scores": "70, 69, 67"
    },
    {
      Player: "Collin Morikawa",
      Rank: "7",
      Today: "E",
      "Total Score": "-5", 
      "Round Scores": "72, 68, 67"
    },
    {
      Player: "Justin Thomas",
      Rank: "8",
      Today: "+2",
      "Total Score": "-4",
      "Round Scores": "69, 71, 68"
    },
    {
      Player: "Max Homa",
      Rank: "T9",
      Today: "-2",
      "Total Score": "-3",
      "Round Scores": "73, 69, 67"
    },
    {
      Player: "Tony Finau",
      Rank: "T9", 
      Today: "+1",
      "Total Score": "-3",
      "Round Scores": "70, 70, 69"
    }
  ],
  lastUpdated: new Date()
};

export async function GET() {
  try {
    console.log('🏌️ Attempting to fetch real-time PGA leaderboard...');
    
    // Try to fetch real-time data (always fresh, no cache)
    const liveData = await fetchPGALeaderboard();
    
    if (liveData && liveData.players.length > 0) {
      console.log(`✅ Real-time leaderboard data fetched successfully (${liveData.players.length} players)`);
      
      const transformedData: LeaderboardData = {
        players: liveData.players,
        lastUpdated: liveData.lastUpdated
      };
      
      const response = NextResponse.json(transformedData);
      // Add cache-busting headers to ensure fresh data
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }
    
    // Fallback to mock data
    console.log('⚠️ Live data unavailable, using mock data');
    const mockResponse = NextResponse.json(mockLeaderboardData);
    // Add cache-busting headers to ensure fresh data
    mockResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    mockResponse.headers.set('Pragma', 'no-cache');
    mockResponse.headers.set('Expires', '0');
    return mockResponse;
    
  } catch (error) {
    console.error('Error in leaderboard API:', error);
    
    // Return mock data as final fallback
    console.log('📝 Using mock leaderboard data due to error');
    const errorResponse = NextResponse.json(mockLeaderboardData);
    // Add cache-busting headers to ensure fresh data
    errorResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    errorResponse.headers.set('Pragma', 'no-cache');
    errorResponse.headers.set('Expires', '0');
    return errorResponse;
  }
} 