'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import { Button, Card, CardContent } from '@/components/ui'
import { LogIn, LogOut, User, Edit } from 'lucide-react'
import Image from 'next/image'
import { useState, useEffect } from 'react'

interface UserProfile {
  id: string
  email: string
  nickname: string
}

export function GoogleLoginForm() {
  const { data: session, status } = useSession()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isSettingNickname, setIsSettingNickname] = useState(false)
  const [nickname, setNickname] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Fetch user profile when session is available
  useEffect(() => {
    if (session?.user?.email) {
      fetchUserProfile()
    }
  }, [session])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const profile = await response.json()
        setUserProfile(profile)
      } else if (response.status === 404) {
        // User doesn't have a profile yet, show nickname setup
        setIsSettingNickname(true)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setIsSettingNickname(true)
    }
  }

  const handleNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickname.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname: nickname.trim() }),
      })

      if (response.ok) {
        const profile = await response.json()
        setUserProfile(profile)
        setIsSettingNickname(false)
        setNickname('')
      } else {
        alert('Failed to save nickname. Please try again.')
      }
    } catch (error) {
      console.error('Error saving nickname:', error)
      alert('Error saving nickname. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (session) {
    // Show nickname setup if user needs to set one
    if (isSettingNickname) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Edit className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Choose Your Nickname</h3>
              <p className="text-gray-600 mb-4">
                Pick a nickname that will be displayed on the leaderboard
              </p>
            </div>

            <form onSubmit={handleNicknameSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter your nickname"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  maxLength={20}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Max 20 characters</p>
              </div>
              <Button 
                type="submit"
                disabled={!nickname.trim() || isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isLoading ? 'Saving...' : 'Save Nickname'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )
    }

    // Show user profile with nickname
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            {session.user?.image && (
              <Image
                src={session.user.image}
                alt={userProfile?.nickname || session.user.name || 'User'}
                width={40}
                height={40}
                className="rounded-full"
              />
            )}
            <div className="flex-1">
              <p className="font-medium text-gray-900">{userProfile?.nickname || 'Loading...'}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline"
                onClick={() => setIsSettingNickname(true)}
                className="flex items-center space-x-1 text-xs"
              >
                <Edit className="w-3 h-3" />
                <span>Edit</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => signOut()}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sign In Required</h3>
          <p className="text-gray-600 mb-4">
            Please sign in with Google to manage your bets and view your picks.
          </p>
        </div>

        <Button 
          onClick={() => signIn('google')}
          className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          <LogIn className="w-4 h-4" />
          <span>Sign in with Google</span>
        </Button>
      </CardContent>
    </Card>
  )
} 