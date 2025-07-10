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

    // Fetch user profile
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // User not found
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      }
      console.error('Error fetching user profile:', error)
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error in user profile API:', error)
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
    const { nickname } = body

    // Validate nickname
    if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
      return NextResponse.json({ error: 'Nickname is required' }, { status: 400 })
    }

    if (nickname.trim().length > 20) {
      return NextResponse.json({ error: 'Nickname must be 20 characters or less' }, { status: 400 })
    }

    const trimmedNickname = nickname.trim()
    const supabase = createClient()

    // Check if nickname is already taken
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('nickname', trimmedNickname)
      .neq('email', session.user.email)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'Nickname is already taken' }, { status: 409 })
    }

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking nickname:', checkError)
      return NextResponse.json({ error: 'Failed to validate nickname' }, { status: 500 })
    }

    // Create or update user profile
    const { data: user, error } = await supabase
      .from('users')
      .upsert({
        email: session.user.email,
        nickname: trimmedNickname,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'email'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving user profile:', error)
      return NextResponse.json({ error: 'Failed to save nickname' }, { status: 500 })
    }

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error in user profile API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 