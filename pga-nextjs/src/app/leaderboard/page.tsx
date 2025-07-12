'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { Card, CardHeader, CardContent, LoadingSpinner, Badge, Button } from '@/components/ui';
import { Trophy, RefreshCw, Plus, Check, X, Users } from 'lucide-react';
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
    return 'text-slate-900'; // All ranking numbers are now black
  };

  const getTodayColor = (today: string) => {
    if (today.includes('-')) return 'text-success-600';
    if (today.includes('+')) return 'text-error-600';
    return 'text-slate-700';
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tournament Leaderboard</h1>
            {data && (
              <div className="space-y-1">
                <p className="text-sm text-slate-600">
                  Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
                </p>
                <p className="text-xs text-slate-500">
                  Auto-refreshes every 30 minutes
                </p>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => mutate()}
          disabled={isLoading}
          className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
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
                <h3 className="text-lg font-semibold text-slate-900">
                  Your Selected Players ({selectedPlayers.length}/5)
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
                disabled={isUpdating}
                className="text-slate-900 border-slate-400 hover:bg-slate-100 font-medium"
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
                  <span className="font-medium text-slate-900">{player}</span>
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
          <h2 className="text-lg font-semibold text-slate-900">Current Standings</h2>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner className="py-8" />
          ) : (
            <div className="space-y-2">
              {data?.players.map((player, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    isPlayerSelected(player.Player)
                      ? 'bg-primary-50 border border-primary-200'
                      : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-300 shadow-sm">
                      <span className={`text-sm font-bold ${getRankColor(player.Rank)}`}>
                        {player.Rank}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div>
                        <h3 className="font-medium text-slate-900">{player.Player}</h3>
                        {isPlayerSelected(player.Player) && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Check className="w-4 h-4 text-success-600" />
                            <span className="text-sm font-medium text-success-700">Selected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-3 text-right">
                      <div>
                        <p className="text-xs text-slate-600 font-medium">Total</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {player['Total Score']}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-medium">Today</p>
                        <p className={`text-sm font-semibold ${getTodayColor(player.Today)}`}>
                          {player.Today}
                        </p>
                      </div>
                    </div>
                    
                    {/* Add/Remove Player Button (only for logged-in users) */}
                    {isLoggedIn && (
                      <Button
                        variant={isPlayerSelected(player.Player) ? "outline" : "primary"}
                        size="sm"
                        onClick={() => handlePlayerToggle(player.Player)}
                        disabled={isUpdating || (!isPlayerSelected(player.Player) && !canAddPlayers)}
                        className={`ml-4 transition-all font-medium w-8 h-8 p-1 ${
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
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scoring Guide */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Fantasy Scoring</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-success-50 rounded-xl">
              <Badge variant="success" className="mb-2">+3 pts</Badge>
              <p className="text-sm text-slate-600">1st Place</p>
            </div>
            <div className="text-center p-3 bg-primary-50 rounded-xl">
              <Badge variant="primary" className="mb-2">+1 pt</Badge>
              <p className="text-sm text-slate-600">Top 10</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <Badge variant="neutral" className="mb-2">0 pts</Badge>
              <p className="text-sm text-slate-600">11th-30th</p>
            </div>
            <div className="text-center p-3 bg-error-50 rounded-xl">
              <Badge variant="error" className="mb-2">-1 pt</Badge>
              <p className="text-sm text-slate-600">31+ / Cut</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 