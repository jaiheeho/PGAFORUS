import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { createClient } from '@/lib/supabase'
import { authOptions } from '@/lib/auth-options'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    // Get user profile first
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id, nickname')
      .eq('email', session.user.email)
      .single()

    if (userError) {
      console.error('Error fetching user profile:', userError)
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Fetch bets for this user
    const { data: bets, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching bets:', error)
      return NextResponse.json({ error: 'Failed to fetch bets' }, { status: 500 })
    }

    return NextResponse.json(bets || [])
  } catch (error) {
    console.error('Error in bets API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { players, tournament_name } = body

    // Validate input
    if (!players || !Array.isArray(players) || players.length !== 5) {
      return NextResponse.json({ error: 'Must select exactly 5 players' }, { status: 400 })
    }

    if (!tournament_name) {
      return NextResponse.json({ error: 'Tournament name is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get user profile first
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id, nickname')
      .eq('email', session.user.email)
      .single()

    if (userError) {
      console.error('Error fetching user profile:', userError)
      return NextResponse.json({ error: 'User profile not found. Please set up your nickname first.' }, { status: 404 })
    }

    // Create new bet in Supabase
    const { data: bet, error } = await supabase
      .from('bets')
      .insert({
        user_id: userProfile.id,
        user_nickname: userProfile.nickname,
        players,
        tournament_name,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating bet:', error)
      return NextResponse.json({ error: 'Failed to create bet' }, { status: 500 })
    }

    return NextResponse.json(bet, { status: 201 })
  } catch (error) {
    console.error('Error in bets API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const betId = url.searchParams.get('id')

    if (!betId) {
      return NextResponse.json({ error: 'Bet ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get user profile first
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (userError) {
      console.error('Error fetching user profile:', userError)
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Delete the bet
    const { error: deleteError } = await supabase
      .from('bets')
      .delete()
      .eq('id', betId)
      .eq('user_id', userProfile.id)

    if (deleteError) {
      console.error('Error deleting bet:', deleteError)
      return NextResponse.json({ error: 'Failed to delete bet' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Bet deleted successfully' })
  } catch (error) {
    console.error('Error in delete bets API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 