// Example: How to integrate tournament status into the leaderboard page
// This demonstrates the practical usage of the new tournament status system

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { Card, CardHeader, CardContent, LoadingSpinner, Badge, Button } from '@/components/ui';
import { TournamentStatusComponent, BettingControl } from '@/components/ui/TournamentStatus';
import { isBettingAllowed, shouldCalculateResults } from '@/lib/tournament-status';
import { Trophy, RefreshCw, Plus, Check, X, Users, AlertTriangle } from 'lucide-react';
import { LeaderboardData } from '@/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function EnhancedLeaderboardPage() {
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
  
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Tournament status from API
  const tournamentStatus = data?.tournamentStatus;
  const statusMessage = data?.statusMessage;

  // Determine UI behavior based on tournament status
  const bettingAllowed = tournamentStatus ? isBettingAllowed(tournamentStatus) : false;
  const showResults = tournamentStatus ? shouldCalculateResults(tournamentStatus) : false;

  const handleBetSubmit = async () => {
    if (!bettingAllowed || selectedPlayers.length !== 5) return;
    
    try {
      setIsUpdating(true);
      
      // Submit bet to API
      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          players: selectedPlayers,
          tournament_name: 'Current Tournament'
        })
      });

      if (response.ok) {
        // Clear selections after successful bet
        setSelectedPlayers([]);
        alert('Bet submitted successfully!');
      } else {
        alert('Failed to submit bet. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting bet:', error);
      alert('Error submitting bet. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner className="py-8" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Tournament Data</h2>
            <p className="text-gray-600 mb-4">Unable to fetch current tournament information.</p>
            <Button onClick={() => mutate()} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tournament Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Tournament Leaderboard</h1>
                {data && (
                  <p className="text-sm text-slate-600">
                    Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
                  </p>
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
        </CardHeader>
      </Card>

      {/* Tournament Status Display */}
      {tournamentStatus && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Tournament Status</h2>
          </CardHeader>
          <CardContent>
            <TournamentStatusComponent 
              tournamentStatus={tournamentStatus} 
              statusMessage={statusMessage}
            />
          </CardContent>
        </Card>
      )}

      {/* Betting Interface (only shown if betting is allowed) */}
      {session && bettingAllowed && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">
              Select Your Players ({selectedPlayers.length}/5)
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedPlayers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedPlayers.map((player, index) => (
                    <Badge key={index} variant="primary" className="px-3 py-1">
                      {player}
                      <button
                        onClick={() => setSelectedPlayers(prev => prev.filter(p => p !== player))}
                        className="ml-2 text-primary-600 hover:text-primary-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
                             {tournamentStatus && (
                 <BettingControl
                   tournamentStatus={tournamentStatus}
                   onBetSubmit={handleBetSubmit}
                   disabled={selectedPlayers.length !== 5 || isUpdating}
                 />
               )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tournament Results Notice */}
      {!bettingAllowed && showResults && (
        <Card>
          <CardContent className="text-center py-6">
            <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Tournament In Progress</h2>
            <p className="text-gray-600">
              The tournament has started. Betting is now closed, but you can view live results below.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Leaderboard */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Current Standings</h2>
        </CardHeader>
        <CardContent>
          {data?.players && data.players.length > 0 ? (
            <div className="space-y-2">
              {data.players.map((player, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    selectedPlayers.includes(player.Player) && bettingAllowed
                      ? 'bg-primary-50 border border-primary-200'
                      : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-300 shadow-sm">
                      <span className="text-sm font-bold text-slate-900">
                        {player.Rank}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">{player.Player}</h3>
                      <div className="flex items-center space-x-3 text-sm text-slate-600">
                        <span>Today: {player.Today}</span>
                        <span>Total: {player['Total Score']}</span>
                        {player['Round Scores'] && player['Round Scores'] !== 'N/A' && (
                          <span>Rounds: {player['Round Scores']}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Player selection button (only during betting phase) */}
                  {bettingAllowed && session && (
                    <button
                      onClick={() => {
                        if (selectedPlayers.includes(player.Player)) {
                          setSelectedPlayers(prev => prev.filter(p => p !== player.Player));
                        } else if (selectedPlayers.length < 5) {
                          setSelectedPlayers(prev => [...prev, player.Player]);
                        }
                      }}
                      disabled={!selectedPlayers.includes(player.Player) && selectedPlayers.length >= 5}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        selectedPlayers.includes(player.Player)
                          ? 'bg-primary-600 text-white hover:bg-primary-700'
                          : selectedPlayers.length >= 5
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
                      }`}
                    >
                      {selectedPlayers.includes(player.Player) ? (
                        <>
                          <Check className="w-4 h-4 inline mr-1" />
                          Selected
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 inline mr-1" />
                          Select
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4" />
              <p>No tournament data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 