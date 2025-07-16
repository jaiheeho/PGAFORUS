import { TournamentStatus } from '@/lib/tournament-status';

export interface Player {
  Player: string;
  Rank: string;
  Today: string;
  'Total Score': string;
  'Round Scores': string;
}

export interface DetailedPlayer {
  id: string;
  name: string;
  country: string;
  ranking: number;
  age: number;
  total_earnings: number;
  career_wins: number;
  majors_won: number;
}

export interface PlayerResult {
  Player: string;
  Rank: string;
  Today: string;
  Total_Score: string;
  Round_Scores: string;
  Points: number;
}

export interface BetResult {
  owner: string;
  total_points: number;
  details: PlayerResult[];
  best_position: number;
  best_player: string;
  best_rank: string;
}

export interface BetEntry {
  id: string;
  owner: string;
  playerName: string;
  players: string[];
  amount: number;
  betType: string;
  tournamentName: string;
  status: 'active' | 'won' | 'lost' | 'pending';
  hidden: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LeaderboardData {
  players: Player[];
  lastUpdated: Date;
  tournamentStatus?: TournamentStatus;
  statusMessage?: string;
  tournament_name?: string;
}

export interface UpcomingPlayer {
  Player: string;
  PlayerURL: string;
}

export type BadgeVariant = 'success' | 'error' | 'warning' | 'neutral' | 'primary';
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg'; 