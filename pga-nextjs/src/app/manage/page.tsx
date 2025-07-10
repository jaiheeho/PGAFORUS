'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, Button } from '@/components/ui'
import { GoogleLoginForm } from '@/components/auth/GoogleLoginForm'
import { Crown, Trophy, TrendingUp, Plus, Search, X, Check, Target } from 'lucide-react'
import { Player } from '@/types'

interface Bet {
  id: string
  players: string[]
  tournament_name: string
  created_at: string
  updated_at: string
}

export default function ManagePage() {
  const { data: session, status } = useSession()
  const [bets, setBets] = useState<Bet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showBetCreator, setShowBetCreator] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState<Player[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [isCreatingBet, setIsCreatingBet] = useState(false)
  const [loadingPlayers, setLoadingPlayers] = useState(false)

  useEffect(() => {
    if (session) {
      fetchBets()
      fetchLeaderboard()
      loadSavedSelection() // Load any saved partial selection
    } else {
      setIsLoading(false)
    }
  }, [session])

  const loadSavedSelection = async () => {
    try {
      const response = await fetch('/api/draft-bet')
      if (response.ok) {
        const data = await response.json()
        if (data && data.players && data.players.length > 0) {
          setSelectedPlayers(data.players)
          setShowBetCreator(true) // Auto-show bet creator if draft has players
        }
      }
    } catch (error) {
      console.error('Error loading saved selection:', error)
    }
  }

  const saveDraftBet = async (players: string[]) => {
    if (players.length === 0) {
      // Delete draft if no players selected
      try {
        await fetch('/api/draft-bet', { method: 'DELETE' })
      } catch (error) {
        console.error('Error deleting draft:', error)
      }
      return
    }

    try {
      await fetch('/api/draft-bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          players,
          tournament_name: 'Current Tournament'
        })
      })
    } catch (error) {
      console.error('Error saving draft:', error)
    }
  }

  const fetchBets = async () => {
    try {
      const response = await fetch('/api/bets')

      if (response.ok) {
        const data = await response.json()
        setBets(data || [])
      } else {
        console.error('Failed to fetch bets')
      }
    } catch (error) {
      console.error('Error fetching bets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLeaderboard = async () => {
    setLoadingPlayers(true)
    try {
      const response = await fetch('/api/leaderboard')
      if (response.ok) {
        const data = await response.json()
        setLeaderboardData(data.players || [])
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoadingPlayers(false)
    }
  }

  const filteredPlayers = leaderboardData.filter(player =>
    player.Player.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handlePlayerSelect = async (playerName: string) => {
    let newSelectedPlayers: string[]
    
    if (selectedPlayers.includes(playerName)) {
      // Remove player
      newSelectedPlayers = selectedPlayers.filter(p => p !== playerName)
      setSelectedPlayers(newSelectedPlayers)
    } else if (selectedPlayers.length < 5) {
      // Add player
      newSelectedPlayers = [...selectedPlayers, playerName]
      setSelectedPlayers(newSelectedPlayers)
    } else {
      return // Can't add more than 5 players
    }

    // Auto-save the draft
    await saveDraftBet(newSelectedPlayers)
  }

  const handleReleaseBet = async () => {
    if (selectedPlayers.length !== 5) {
      alert('Please select exactly 5 players before releasing your bet')
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to release this bet?\n\nSelected players:\n${selectedPlayers.join('\n')}\n\nOnce released, this bet will be final and visible on the betting results page.`
    )

    if (!confirmed) return

    setIsCreatingBet(true)
    try {
      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          players: selectedPlayers,
          tournament_name: 'Current Tournament'
        })
      })

      if (response.ok) {
        // Clear the draft and selection
        setSelectedPlayers([])
        setShowBetCreator(false)
        setSearchQuery('')
        await saveDraftBet([]) // Clear the saved draft
        fetchBets() // Refresh bets list
        alert('Bet released successfully! You can now view it on the betting results page.')
      } else {
        alert('Failed to release bet')
      }
    } catch (error) {
      console.error('Error releasing bet:', error)
      alert('Error releasing bet')
    } finally {
      setIsCreatingBet(false)
    }
  }

  const handleDeleteBet = async (betId: string) => {
    if (!confirm('Are you sure you want to delete this bet?')) {
      return
    }

    try {
      const response = await fetch(`/api/bets?id=${betId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchBets() // Refresh bets list
        alert('Bet deleted successfully!')
      } else {
        alert('Failed to delete bet')
      }
    } catch (error) {
      console.error('Error deleting bet:', error)
      alert('Error deleting bet')
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Manage Your Bets
        </h1>
        <GoogleLoginForm />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Manage Your Bets
        </h1>
        <p className="text-gray-600">
          Welcome back, {session.user?.name}! Here are your current tournament picks.
        </p>
      </div>

      {/* User Info Card */}
      <div className="mb-8">
        <GoogleLoginForm />
      </div>

      {/* Create New Bet Button */}
      <div className="mb-6">
        <Button
          onClick={() => setShowBetCreator(!showBetCreator)}
          className="flex items-center space-x-2 text-black"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Bet</span>
        </Button>
      </div>

      {/* Bet Creator */}
      {showBetCreator && (
        <Card className="mb-8">
          <CardContent>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create New Bet - Select 5 Players
            </h3>

            {/* Selected Players */}
            {selectedPlayers.length > 0 && (
              <div className="mb-4 p-4 bg-blue-50 rounded-xl">
                <h4 className="font-medium text-gray-900 mb-2">
                  Selected Players ({selectedPlayers.length}/5)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPlayers.map((player) => (
                    <div
                      key={player}
                      className="flex items-center space-x-2 bg-white px-3 py-1 rounded-lg border"
                    >
                      <span className="text-sm text-black">{player}</span>
                      <button
                        onClick={() => handlePlayerSelect(player)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 bg-white"
                />
              </div>
            </div>

            {/* Players List */}
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
              {loadingPlayers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                filteredPlayers.map((player) => {
                  const isSelected = selectedPlayers.includes(player.Player)
                  const isDisabled = !isSelected && selectedPlayers.length >= 5

                  return (
                    <div
                      key={player.Player}
                      className={`flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 ${
                        isDisabled ? 'opacity-50' : 'hover:bg-gray-50'
                      } ${isSelected ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{player.Player}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePlayerSelect(player.Player)}
                        disabled={isDisabled}
                        className={`p-2 rounded-lg ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : isDisabled
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            {/* Release Bet Button */}
            <div className="mt-4 flex space-x-3">
              <Button
                onClick={handleReleaseBet}
                disabled={selectedPlayers.length !== 5 || isCreatingBet}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {isCreatingBet ? 'Releasing...' : `Release Bet (${selectedPlayers.length}/5)`}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowBetCreator(false)
                  // Don't clear selected players - they should persist
                }}
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Bets */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Your Current Bets</h2>
        
        {bets.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No bets yet. Create your first bet above!</p>
            </CardContent>
          </Card>
        ) : (
          bets.map((bet) => (
            <Card key={bet.id}>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {bet.tournament_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Created: {new Date(bet.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleDeleteBet(bet.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  {bet.players.map((player, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 rounded-lg text-center"
                    >
                      <p className="font-medium text-gray-900 text-sm">{player}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
} 