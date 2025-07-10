import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { createClient } from '@/lib/supabase'
import { authOptions } from '@/lib/auth-options'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { player_name, action } = body

    if (!player_name || !action) {
      return NextResponse.json({ error: 'Player name and action are required' }, { status: 400 })
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

    // Save player selection to database
    const { data: selection, error } = await supabase
      .from('player_selections')
      .insert({
        user_id: userProfile.id,
        user_nickname: userProfile.nickname,
        player_name,
        action,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving player selection:', error)
      return NextResponse.json({ error: 'Failed to save player selection' }, { status: 500 })
    }

    return NextResponse.json(selection, { status: 201 })
  } catch (error) {
    console.error('Error in player-selections API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { player_name, action } = body

    if (!player_name || !action) {
      return NextResponse.json({ error: 'Player name and action are required' }, { status: 400 })
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

    // Save player removal to database
    const { data: selection, error } = await supabase
      .from('player_selections')
      .insert({
        user_id: userProfile.id,
        user_nickname: userProfile.nickname,
        player_name,
        action,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving player removal:', error)
      return NextResponse.json({ error: 'Failed to save player removal' }, { status: 500 })
    }

    return NextResponse.json(selection, { status: 201 })
  } catch (error) {
    console.error('Error in player-selections DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    // Fetch all player selections for this user
    const { data: selections, error } = await supabase
      .from('player_selections')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching player selections:', error)
      return NextResponse.json({ error: 'Failed to fetch player selections' }, { status: 500 })
    }

    return NextResponse.json(selections || [])
  } catch (error) {
    console.error('Error in player-selections GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 