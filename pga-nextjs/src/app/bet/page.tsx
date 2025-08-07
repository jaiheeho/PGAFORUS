'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Card, CardHeader, CardContent, LoadingSpinner, Badge, PlayerCard, Button, TournamentAISummary } from '@/components/ui';
import { BarChart3, Trophy, Medal, Award, ChevronDown, ChevronUp, Clock, Eye, EyeOff } from 'lucide-react';
import { BetResult, LeaderboardData } from '@/types';
import { getPointsBadgeVariant } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function BetPage() {
  const [expandedBets, setExpandedBets] = useState<Set<string>>(new Set());
  
  // Fetch tournament status from leaderboard API first
  const { data: leaderboardData, error: leaderboardError, isLoading: leaderboardLoading } = useSWR<LeaderboardData>(
    '/api/leaderboard',
    (url) => fetch(`${url}?cb=${Date.now()}`).then(res => res.json()),
    {
      refreshInterval: 180000, // Refresh every 3 minutes for real-time updates
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute dedup for faster updates
    }
  );

  // Determine tournament status for dynamic refresh rates
  const tournamentStatus = leaderboardData?.tournamentStatus;
  const isStarted = tournamentStatus?.hasStarted;
  const fastRefreshInterval = isStarted ? 180000 : 1800000; // 3 minutes if started, 30 minutes if not
  const fastDedupInterval = isStarted ? 60000 : 300000; // 1 minute if started, 5 minutes if not

  // SWR with auto-refresh and cache-busting for bet results
  const { data: results, error, isLoading, mutate } = useSWR<BetResult[]>(
    '/api/all-results', 
    (url) => fetch(`${url}?cb=${Date.now()}`).then(res => res.json()),
    {
      refreshInterval: fastRefreshInterval,
      revalidateOnFocus: true, // Refresh when window gets focus
      revalidateOnReconnect: true, // Refresh when network reconnects
      dedupingInterval: fastDedupInterval,
    }
  );

  // Dynamic refresh interval for AI based on tournament status  
  const aiRefreshInterval = isStarted ? 180000 : 1800000; // 3 minutes if started, 30 minutes if not
  
  // Prefetch AI summary with dynamic refresh rate
  const shouldPrefetchAI = leaderboardData?.tournament_name && tournamentStatus;
  const { data: aiSummaryData, error: aiError, isLoading: aiLoading } = useSWR(
    shouldPrefetchAI ? `/api/tournament-ai-prefetch-${isStarted ? 'started' : 'waiting'}` : null,
    () => fetch('/api/tournament-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'summary', forceRefresh: false })
    }).then(res => res.json()),
    {
      refreshInterval: aiRefreshInterval,
      revalidateOnFocus: false, // Don't refetch on focus to avoid unnecessary API calls
      revalidateOnReconnect: true,
      dedupingInterval: isStarted ? 60000 : 300000, // 1 minute dedup if started, 5 minutes if not
      revalidateIfStale: true,
    }
  );
  // Hide bets during pre-tournament in /bet page
  const shouldHideBets = tournamentStatus ? !tournamentStatus.hasStarted : false;
  // Show results only after tournament has started
  const shouldShowResults = tournamentStatus ? tournamentStatus.hasStarted : false;

  // Auto-expand all dropdowns by default when data loads
  useEffect(() => {
    if (results && results.length > 0) {
      const allOwners = new Set(results.map(result => result.owner));
      setExpandedBets(allOwners);
    }
  }, [results]);

  const toggleBetExpansion = (owner: string) => {
    setExpandedBets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(owner)) {
        newSet.delete(owner);
      } else {
        newSet.add(owner);
      }
      return newSet;
    });
  };

  if (error || leaderboardError) {
    return (
      <div className="text-center py-12">
        <div className="space-y-4">
          <Trophy className="w-12 h-12 text-red-500 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Error Loading Data</h3>
            <p className="text-red-600 mt-2">
              {error ? 'Failed to load betting results' : 'Failed to load tournament status'}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                mutate();
                window.location.reload();
              }}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-success-100 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-success-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">PGA Betting Results</h1>
            <p className="text-sm sm:text-base text-gray-600 hidden sm:block">All players' fantasy points and performance</p>
            <p className="text-xs text-gray-600 sm:hidden">Fantasy points & performance</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            mutate();
            window.location.reload(); // Refresh leaderboard data too
          }}
          disabled={isLoading || leaderboardLoading}
          className="flex items-center space-x-1 sm:space-x-2 self-start sm:self-auto"
        >
          <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">{(isLoading || leaderboardLoading) ? 'Refreshing...' : 'Refresh'}</span>
        </Button>
      </div>

      {/* Tournament Name */}
      {leaderboardData?.tournament_name && (
        <div className="text-center">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">{leaderboardData.tournament_name}</h2>
        </div>
      )}

      {/* AI Tournament Analysis */}
      {tournamentStatus && (
        <TournamentAISummary 
          tournamentName={leaderboardData?.tournament_name}
          prefetchedData={aiSummaryData}
          isLoadingPrefetch={aiLoading}
          prefetchError={aiError}
        />
      )}

      {/* Pre-Tournament Message - Hide Bets */}
      {tournamentStatus && shouldHideBets && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <EyeOff className="w-8 h-8 text-blue-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900">Bets are Hidden</h3>
                <p className="text-gray-600 max-w-md">
                  All betting results are hidden until the tournament begins. This keeps the competition fair and exciting!
                </p>
                <div className="flex items-center justify-center space-x-2 mt-4">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-500">
                    Results will be visible once the first player gets a numeric position
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Standings with Dropdown Functionality - Show when tournament started */}
      {results && !isLoading && shouldShowResults && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Eye className="w-5 h-5 text-green-600" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Current Standings</h2>
                  <p className="text-xs text-gray-500">Sorted by best tournament position, then by fantasy points</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Auto-refreshes every 30 minutes • Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 md:space-y-4">
              {results.map((result, index) => (
                <div key={result.owner} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-2 md:p-4 bg-gray-50">
                    <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        {index === 0 ? (
                          <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />
                        ) : index === 1 ? (
                          <Medal className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                        ) : index === 2 ? (
                          <Award className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
                        ) : (
                          <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">
                            {index + 1}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm md:text-base truncate">{result.owner}</p>
                        <div className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm text-gray-600">
                          <span>{result.details.length} players</span>
                          {result.best_position < 999 && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-1 md:px-2 py-0.5 md:py-1 rounded truncate">
                              <span className="hidden sm:inline">Best: </span>#{result.best_rank}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 md:space-x-3 flex-shrink-0">
                      <Badge variant={getPointsBadgeVariant(result.total_points)} className="text-sm md:text-lg px-2 md:px-4 py-1 md:py-2">
                        {result.total_points > 0 ? '+' : ''}{result.total_points} pts
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleBetExpansion(result.owner)}
                        className="flex items-center space-x-0.5 md:space-x-1 px-1 md:px-2 py-1 text-xs h-6 md:h-8"
                      >
                        <span className="text-xs hidden sm:inline">{expandedBets.has(result.owner) ? 'Hide' : 'Show'}</span>
                        {expandedBets.has(result.owner) ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {expandedBets.has(result.owner) && (
                    <div className="bg-white border-t border-gray-200">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs md:text-sm">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="text-left py-2 px-3 font-medium text-gray-700">Player</th>
                              <th className="text-center py-2 px-2 font-medium text-gray-700">Rank</th>
                              <th className="text-center py-2 px-2 font-medium text-gray-700">Score</th>
                              <th className="text-center py-2 px-2 font-medium text-gray-700">Today</th>
                              <th className="text-center py-2 px-2 font-medium text-gray-700">Points</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.details.map((player, playerIndex) => (
                              <tr key={playerIndex} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-2 px-3 font-medium text-gray-900 truncate max-w-[120px]">
                                  {player.Player}
                                </td>
                                <td className="text-center py-2 px-2 text-gray-600">
                                  #{player.Rank}
                                </td>
                                <td className="text-center py-2 px-2 text-gray-600">
                                  {player.Total_Score}
                                </td>
                                <td className="text-center py-2 px-2 text-gray-600">
                                  {player.Today}
                                </td>
                                <td className="text-center py-2 px-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    player.Points > 0
                                      ? 'bg-green-100 text-green-800'
                                      : player.Points < 0
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {player.Points > 0 ? '+' : ''}{player.Points}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tournament Started but No Results Yet */}
      {shouldShowResults && (!results || results.length === 0) && !isLoading && (
        <Card>
          <CardContent className="text-center py-8">
            <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Tournament Started</h3>
            <p className="text-gray-600">
              The tournament has begun! Results will appear here as players are scored.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {(isLoading || leaderboardLoading) && (
        <Card>
          <CardContent>
            <div className="text-center py-8">
              <LoadingSpinner className="mx-auto mb-4" />
              <p className="text-gray-600">
                {isLoading && leaderboardLoading ? 'Loading tournament data and results...' :
                 isLoading ? 'Loading betting results...' : 'Loading tournament status...'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scoring Guide */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            Scoring System
            {shouldHideBets && <span className="text-sm font-normal text-gray-500 ml-2">(applies when tournament starts)</span>}
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            <div className="text-center p-3 md:p-4 rounded-xl bg-yellow-50 border border-yellow-200">
              <div className="text-xl md:text-2xl font-bold text-yellow-600 mb-1">+3</div>
              <div className="text-xs md:text-sm font-medium text-yellow-800">1st Place</div>
              <div className="text-xs text-yellow-600 mt-1 hidden sm:block">Winner takes all</div>
            </div>
            <div className="text-center p-3 md:p-4 rounded-xl bg-green-50 border border-green-200">
              <div className="text-xl md:text-2xl font-bold text-green-600 mb-1">+1</div>
              <div className="text-xs md:text-sm font-medium text-green-800">Top 10</div>
              <div className="text-xs text-green-600 mt-1 hidden sm:block">Solid performance</div>
            </div>
            <div className="text-center p-3 md:p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div className="text-xl md:text-2xl font-bold text-gray-600 mb-1">0</div>
              <div className="text-xs md:text-sm font-medium text-gray-800">11th-30th</div>
              <div className="text-xs text-gray-600 mt-1 hidden sm:block">No points awarded</div>
            </div>
            <div className="text-center p-3 md:p-4 rounded-xl bg-red-50 border border-red-200">
              <div className="text-xl md:text-2xl font-bold text-red-600 mb-1">-1</div>
              <div className="text-xs md:text-sm font-medium text-red-800">31+ / Cut</div>
              <div className="text-xs text-red-600 mt-1 hidden sm:block">Poor performance</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 