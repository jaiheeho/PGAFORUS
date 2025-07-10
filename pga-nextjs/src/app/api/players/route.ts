import { NextResponse } from 'next/server';
import { DetailedPlayer } from '@/types';

// Mock detailed players data
const mockPlayers: DetailedPlayer[] = [
  { 
    id: '1', 
    name: 'Scottie Scheffler', 
    country: 'USA', 
    ranking: 1, 
    age: 27, 
    total_earnings: 15420000, 
    career_wins: 12, 
    majors_won: 2 
  },
  { 
    id: '2', 
    name: 'Rory McIlroy', 
    country: 'NIR', 
    ranking: 2, 
    age: 34, 
    total_earnings: 45680000, 
    career_wins: 23, 
    majors_won: 4 
  },
  { 
    id: '3', 
    name: 'Jon Rahm', 
    country: 'ESP', 
    ranking: 3, 
    age: 29, 
    total_earnings: 28950000, 
    career_wins: 10, 
    majors_won: 2 
  },
  { 
    id: '4', 
    name: 'Tiger Woods', 
    country: 'USA', 
    ranking: 45, 
    age: 48, 
    total_earnings: 120850000, 
    career_wins: 82, 
    majors_won: 15 
  },
  { 
    id: '5', 
    name: 'Brooks Koepka', 
    country: 'USA', 
    ranking: 12, 
    age: 33, 
    total_earnings: 38420000, 
    career_wins: 9, 
    majors_won: 5 
  },
  { 
    id: '6', 
    name: 'Jordan Spieth', 
    country: 'USA', 
    ranking: 18, 
    age: 30, 
    total_earnings: 46720000, 
    career_wins: 13, 
    majors_won: 3 
  },
  { 
    id: '7', 
    name: 'Justin Thomas', 
    country: 'USA', 
    ranking: 15, 
    age: 30, 
    total_earnings: 42350000, 
    career_wins: 15, 
    majors_won: 2 
  },
  { 
    id: '8', 
    name: 'Xander Schauffele', 
    country: 'USA', 
    ranking: 5, 
    age: 30, 
    total_earnings: 28640000, 
    career_wins: 7, 
    majors_won: 1 
  },
  { 
    id: '9', 
    name: 'Collin Morikawa', 
    country: 'USA', 
    ranking: 8, 
    age: 26, 
    total_earnings: 18750000, 
    career_wins: 6, 
    majors_won: 2 
  },
  { 
    id: '10', 
    name: 'Viktor Hovland', 
    country: 'NOR', 
    ranking: 6, 
    age: 26, 
    total_earnings: 15320000, 
    career_wins: 4, 
    majors_won: 0 
  },
  { 
    id: '11', 
    name: 'Patrick Cantlay', 
    country: 'USA', 
    ranking: 7, 
    age: 31, 
    total_earnings: 32180000, 
    career_wins: 8, 
    majors_won: 0 
  },
  { 
    id: '12', 
    name: 'Dustin Johnson', 
    country: 'USA', 
    ranking: 22, 
    age: 39, 
    total_earnings: 74250000, 
    career_wins: 24, 
    majors_won: 2 
  },
  { 
    id: '13', 
    name: 'Tony Finau', 
    country: 'USA', 
    ranking: 16, 
    age: 34, 
    total_earnings: 25430000, 
    career_wins: 3, 
    majors_won: 0 
  },
  { 
    id: '14', 
    name: 'Max Homa', 
    country: 'USA', 
    ranking: 11, 
    age: 32, 
    total_earnings: 18960000, 
    career_wins: 6, 
    majors_won: 0 
  },
  { 
    id: '15', 
    name: 'Will Zalatoris', 
    country: 'USA', 
    ranking: 34, 
    age: 27, 
    total_earnings: 12750000, 
    career_wins: 1, 
    majors_won: 0 
  },
  { 
    id: '16', 
    name: 'Hideki Matsuyama', 
    country: 'JPN', 
    ranking: 9, 
    age: 31, 
    total_earnings: 35420000, 
    career_wins: 9, 
    majors_won: 1 
  },
  { 
    id: '17', 
    name: 'Cameron Smith', 
    country: 'AUS', 
    ranking: 28, 
    age: 30, 
    total_earnings: 24680000, 
    career_wins: 6, 
    majors_won: 1 
  },
  { 
    id: '18', 
    name: 'Matt Fitzpatrick', 
    country: 'ENG', 
    ranking: 13, 
    age: 29, 
    total_earnings: 19540000, 
    career_wins: 9, 
    majors_won: 1 
  }
];

export async function GET() {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return NextResponse.json(mockPlayers);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
} 