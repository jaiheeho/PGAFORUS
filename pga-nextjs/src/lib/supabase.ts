import { createBrowserClient } from '@supabase/ssr'

// Client-side Supabase client
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Database types
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          nickname: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          nickname: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nickname?: string
          created_at?: string
          updated_at?: string
        }
      }
      bets: {
        Row: {
          id: string
          user_id: string
          user_nickname: string
          players: string[]
          tournament_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_nickname: string
          players: string[]
          tournament_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          user_nickname?: string
          players?: string[]
          tournament_name?: string
          created_at?: string
          updated_at?: string
        }
      }
      draft_bets: {
        Row: {
          id: string
          user_id: string
          user_nickname: string
          players: string[]
          tournament_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_nickname: string
          players: string[]
          tournament_name?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          user_nickname?: string
          players?: string[]
          tournament_name?: string
          created_at?: string
          updated_at?: string
        }
      }
      player_selections: {
        Row: {
          id: string
          user_id: string
          user_nickname: string
          player_name: string
          action: 'add' | 'remove'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_nickname: string
          player_name: string
          action: 'add' | 'remove'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          user_nickname?: string
          player_name?: string
          action?: 'add' | 'remove'
          created_at?: string
        }
      }
    }
  }
} 