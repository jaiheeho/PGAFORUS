'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { Card, CardHeader, CardContent, LoadingSpinner, Badge, Button } from '@/components/ui';
import { Trophy, RefreshCw, Plus, Check, X, Users, Medal, Star } from 'lucide-react';
import { BetResult } from '@/types';
import { LeaderboardData } from '@/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface DraftBet {
  id: string;
  user_id: string;
  user_nickname: string;
  players: string[];
  tournament_name: string;
  created_at: string;
  updated_at: string;
}

export default function LeaderboardPage() {
  const { data: session, status } = useSession();
  const { data, error, isLoading, mutate } = useSWR<LeaderboardData>(
    '/api/leaderboard',
    (url) => fetch(`${url}?cb=${Date.now()}`).then(res => res.json()),
    {
      refreshInterval: 1800000, // Refresh every 30 minutes
      revalidateOnFocus: true, // Refresh when window gets focus
      revalidateOnReconnect: true, // Refresh when network reconnects
      dedupingInterval: 300000, // Prevent duplicate requests within 5 minutes
    }
  );
  
  const { data: standingsData, error: standingsError, isLoading: standingsLoading } = useSWR<BetResult[]>(
    '/api/all-results',
    fetcher,
    {
      refreshInterval: 1800000, // Refresh every 30 minutes
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );
  const { data: draftBet, mutate: mutateDraft } = useSWR<DraftBet | null>(
    session ? '/api/draft-bet' : null,
    fetcher
  );
  
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Update local state when draft bet changes
  useEffect(() => {
    if (draftBet?.players) {
      setSelectedPlayers(draftBet.players);
    } else {
      setSelectedPlayers([]);
    }
  }, [draftBet]);

  const handlePlayerToggle = async (playerName: string) => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      let newSelectedPlayers: string[];
      
      if (selectedPlayers.includes(playerName)) {
        // Remove player
        newSelectedPlayers = selectedPlayers.filter(p => p !== playerName);
      } else if (selectedPlayers.length < 5) {
        // Add player
        newSelectedPlayers = [...selectedPlayers, playerName];
      } else {
        setIsUpdating(false);
        return; // Can't add more than 5 players
      }

      // Update local state immediately for better UX
      setSelectedPlayers(newSelectedPlayers);

      // Save to draft bet
      await fetch('/api/draft-bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          players: newSelectedPlayers,
          tournament_name: 'Current Tournament'
        })
      });

      // Refresh draft bet data
      mutateDraft();
    } catch (error) {
      console.error('Error updating player selection:', error);
      // Revert local state on error
      if (draftBet?.players) {
        setSelectedPlayers(draftBet.players);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearSelection = async () => {
    if (isUpdating || selectedPlayers.length === 0) return;

    setIsUpdating(true);
    try {
      // Clear local state
      setSelectedPlayers([]);

      // Delete draft bet
      await fetch('/api/draft-bet', {
        method: 'DELETE'
      });

      // Refresh draft bet data
      mutateDraft();
    } catch (error) {
      console.error('Error clearing selection:', error);
      // Revert local state on error
      if (draftBet?.players) {
        setSelectedPlayers(draftBet.players);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const getRankColor = (rank: string) => {
    if (rank === 'CUT' || rank === 'WD') return 'text-error-600';
    return 'text-black'; // All ranking numbers are now black
  };

  const getTodayColor = (today: string) => {
    return 'text-black';
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-error-600">Failed to load leaderboard</p>
      </div>
    );
  }

  const isPlayerSelected = (playerName: string) => selectedPlayers.includes(playerName);
  const canAddPlayers = selectedPlayers.length < 5;
  const isLoggedIn = status === 'authenticated' && session;

  return (
    <div className="space-y-6">
      {/* Current Standings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
              <Medal className="w-4 h-4 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-black">Current Standings</h2>
          </div>
        </CardHeader>
        <CardContent>
          {standingsLoading ? (
            <LoadingSpinner className="py-8" />
          ) : standingsError ? (
            <div className="text-center py-4">
              <p className="text-error-600">Failed to load standings</p>
            </div>
          ) : standingsData && standingsData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-medium text-black">Rank</th>
                  <th className="px-4 py-3 text-left font-medium text-black">Player</th>
                  <th className="px-4 py-3 text-left font-medium text-black">Best Golfer</th>
                  <th className="px-4 py-3 text-center font-medium text-black">Best Position</th>
                  <th className="px-4 py-3 text-center font-medium text-black">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {standingsData.map((result, index) => (
                    <tr 
                      key={index} 
                      className={`border-b border-slate-100 ${index < 3 ? 'bg-primary-50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          {index === 0 && (
                            <div className="w-6 h-6 mr-2 rounded-full bg-yellow-100 flex items-center justify-center">
                              <Trophy className="w-3 h-3 text-yellow-600" />
                            </div>
                          )}
                          {index === 1 && (
                            <div className="w-6 h-6 mr-2 rounded-full bg-slate-200 flex items-center justify-center">
                              <Medal className="w-3 h-3 text-slate-600" />
                            </div>
                          )}
                          {index === 2 && (
                            <div className="w-6 h-6 mr-2 rounded-full bg-amber-100 flex items-center justify-center">
                              <Star className="w-3 h-3 text-amber-600" />
                            </div>
                          )}
                          <span className={`font-medium ${index < 3 ? 'text-primary-900' : 'text-black'}`}>
                            {index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-black">{result.owner}</td>
                      <td className="px-4 py-3 text-black">{result.best_player}</td>
                      <td className="px-4 py-3 text-center font-medium">
                        <span className={`px-2 py-1 rounded-md ${result.best_position <= 10 ? 'bg-success-100 text-success-800' : 'bg-slate-100 text-slate-800'}`}>
                          {result.best_rank}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-medium ${result.total_points > 0 ? 'text-success-700' : result.total_points < 0 ? 'text-error-700' : 'text-black'}`}>
                          {result.total_points > 0 ? `+${result.total_points}` : result.total_points}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-black">No standings data available yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-black">Tournament Leaderboard</h1>
            {data && (
              <div className="space-y-1">
                <p className="text-sm text-black">
                  Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
                </p>
                <p className="text-xs text-black">
                  Auto-refreshes every 30 minutes
                </p>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => mutate()}
          disabled={isLoading}
          className="flex items-center space-x-2 px-4 py-2 text-sm text-black hover:text-black transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Selected Players Summary (only shown when logged in and have selections) */}
      {isLoggedIn && selectedPlayers.length > 0 && (
        <Card className="border-primary-200 bg-primary-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-semibold text-black">
                  Your Selected Players ({selectedPlayers.length}/5)
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
                disabled={isUpdating}
                className="text-black border-slate-400 hover:bg-slate-100 font-medium"
              >
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedPlayers.map((player, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 px-3 py-2 bg-white rounded-lg border border-primary-200 shadow-sm"
                >
                  <Check className="w-4 h-4 text-success-600" />
                  <span className="font-medium text-black">{player}</span>
                  <button
                    onClick={() => handlePlayerToggle(player)}
                    disabled={isUpdating}
                    className="text-slate-600 hover:text-error-600 transition-colors font-medium"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {selectedPlayers.length === 5 && (
              <div className="mt-3 p-3 bg-success-50 rounded-lg border border-success-200">
                <p className="text-success-800 text-sm font-medium">
                  ✅ You've selected all 5 players! Go to the Manage Bets page to submit your final bet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Login prompt (only shown when not logged in) */}
      {!isLoggedIn && status !== 'loading' && (
        <Card className="border-warning-200 bg-warning-50">
          <CardContent className="text-center py-6">
            <p className="text-warning-800">
              <strong>Sign in to pick players!</strong> Log in to select your favorite players directly from the leaderboard.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
              <Trophy className="w-4 h-4 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-black">Tournament Leaderboard</h2>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner className="py-8" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-medium text-black">Rank</th>
                    <th className="px-4 py-3 text-left font-medium text-black">Player</th>
                    <th className="px-4 py-3 text-center font-medium text-black">Today</th>
                    <th className="px-4 py-3 text-center font-medium text-black">Total</th>
                    {isLoggedIn && (
                      <th className="px-4 py-3 text-center font-medium text-black">Select</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data?.players.map((player, index) => (
                    <tr 
                      key={index} 
                      className={`border-b border-slate-100 ${
                        isPlayerSelected(player.Player)
                          ? 'bg-primary-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-white rounded-lg border border-slate-300 shadow-sm mx-auto">
                          <span className={`text-sm font-bold ${getRankColor(player.Rank)}`}>
                            {player.Rank}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-black">{player.Player}</p>
                          {isPlayerSelected(player.Player) && (
                            <div className="flex items-center space-x-1 mt-1">
                              <Check className="w-4 h-4 text-success-600" />
                              <span className="text-xs font-medium text-success-700">Selected</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${getTodayColor(player.Today)}`}>
                          {player.Today}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-black">
                        {player['Total Score']}
                      </td>
                      {isLoggedIn && (
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant={isPlayerSelected(player.Player) ? "outline" : "primary"}
                            size="sm"
                            onClick={() => handlePlayerToggle(player.Player)}
                            disabled={isUpdating || (!isPlayerSelected(player.Player) && !canAddPlayers)}
                            className={`transition-all font-medium w-8 h-8 p-1 ${
                              isPlayerSelected(player.Player)
                                ? 'text-red-700 border-red-400 hover:bg-red-50 bg-white'
                                : !canAddPlayers
                                ? 'opacity-60 cursor-not-allowed bg-slate-600 text-white border-slate-600'
                                : ''
                            }`}
                          >
                            {isUpdating ? (
                              <div className="w-3 h-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : isPlayerSelected(player.Player) ? (
                              <X className="w-3 h-3 text-red-700" />
                            ) : (
                              <Plus className="w-3 h-3 text-black" />
                            )}
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scoring Guide */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-black">Fantasy Scoring</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-success-50 rounded-xl">
              <Badge variant="success" className="mb-2">+3 pts</Badge>
              <p className="text-sm text-black">1st Place</p>
            </div>
            <div className="text-center p-3 bg-primary-50 rounded-xl">
              <Badge variant="primary" className="mb-2">+1 pt</Badge>
              <p className="text-sm text-black">Top 10</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <Badge variant="neutral" className="mb-2">0 pts</Badge>
              <p className="text-sm text-black">11th-30th</p>
            </div>
            <div className="text-center p-3 bg-error-50 rounded-xl">
              <Badge variant="error" className="mb-2">-1 pt</Badge>
              <p className="text-sm text-black">31+ / Cut</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 