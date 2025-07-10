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
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (userError) {
      console.error('Error fetching user profile:', userError)
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Fetch draft bet for this user
    const { data: draft, error } = await supabase
      .from('draft_bets')
      .select('*')
      .eq('user_id', userProfile.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No draft found
        return NextResponse.json(null)
      }
      console.error('Error fetching draft bet:', error)
      return NextResponse.json({ error: 'Failed to fetch draft bet' }, { status: 500 })
    }

    return NextResponse.json(draft)
  } catch (error) {
    console.error('Error in draft-bet GET API:', error)
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

    if (!players || !Array.isArray(players)) {
      return NextResponse.json({ error: 'Players array is required' }, { status: 400 })
    }

    if (players.length > 5) {
      return NextResponse.json({ error: 'Cannot select more than 5 players' }, { status: 400 })
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

    // Upsert draft bet (create or update)
    const { data: draft, error } = await supabase
      .from('draft_bets')
      .upsert({
        user_id: userProfile.id,
        user_nickname: userProfile.nickname,
        players,
        tournament_name: tournament_name || 'Current Tournament',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving draft bet:', error)
      return NextResponse.json({ error: 'Failed to save draft bet' }, { status: 500 })
    }

    return NextResponse.json(draft, { status: 201 })
  } catch (error) {
    console.error('Error in draft-bet POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Delete draft bet
    const { error } = await supabase
      .from('draft_bets')
      .delete()
      .eq('user_id', userProfile.id)

    if (error) {
      console.error('Error deleting draft bet:', error)
      return NextResponse.json({ error: 'Failed to delete draft bet' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Draft bet deleted successfully' })
  } catch (error) {
    console.error('Error in draft-bet DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 