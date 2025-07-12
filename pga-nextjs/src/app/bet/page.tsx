'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Card, CardHeader, CardContent, LoadingSpinner, Badge, PlayerCard, Button } from '@/components/ui';
import { BarChart3, Trophy, Medal, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { BetResult } from '@/types';
import { getPointsBadgeVariant } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Helper function to detect if tournament has started
const isTournamentStarted = (results: BetResult[]): boolean => {
  if (!results || results.length === 0) return false;
  
  // Check if any player has scoring data that indicates tournament has started
  return results.some(result => 
    result.details.some(player => 
      player.Today !== 'E' || 
      player.Total_Score !== 'E' || 
      (player.Round_Scores !== 'Tournament hasn\'t started' && player.Round_Scores !== 'N/A')
    )
  );
};

export default function BetPage() {
  const [expandedBets, setExpandedBets] = useState<Set<string>>(new Set());
  
  // SWR with auto-refresh and cache-busting
  const { data: results, error, isLoading, mutate } = useSWR<BetResult[]>(
    '/api/all-results', 
    (url) => fetch(`${url}?cb=${Date.now()}`).then(res => res.json()),
    {
      refreshInterval: 1800000, // Refresh every 30 minutes
      revalidateOnFocus: true, // Refresh when window gets focus
      revalidateOnReconnect: true, // Refresh when network reconnects
      dedupingInterval: 300000, // Prevent duplicate requests within 5 minutes
    }
  );

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

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-error-600">Failed to load betting results</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-success-100 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-success-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PGA Betting Results</h1>
            <p className="text-gray-600">All players' fantasy points and performance</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          disabled={isLoading}
          className="flex items-center space-x-2"
        >
          <BarChart3 className="w-4 h-4" />
          <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
        </Button>
      </div>

      {/* Current Standings with Dropdown Functionality */}
      {results && !isLoading && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Current Standings</h2>
                <p className="text-xs text-gray-500">Sorted by best tournament position, then by fantasy points</p>
              </div>
              <p className="text-xs text-gray-500">
                Auto-refreshes every 30 minutes • Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={result.owner} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-4 bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {index === 0 ? (
                          <Trophy className="w-6 h-6 text-yellow-500" />
                        ) : index === 1 ? (
                          <Medal className="w-6 h-6 text-gray-400" />
                        ) : index === 2 ? (
                          <Award className="w-6 h-6 text-orange-500" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">
                            {index + 1}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{result.owner}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>{result.details.length} players</span>
                          {result.best_position < 999 && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Best: #{result.best_rank} ({result.best_player})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant={getPointsBadgeVariant(result.total_points)} className="text-lg px-4 py-2">
                        {result.total_points > 0 ? '+' : ''}{result.total_points} pts
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleBetExpansion(result.owner)}
                        className="flex items-center space-x-1 px-2 py-1 text-xs h-6"
                      >
                        <span className="text-xs">{expandedBets.has(result.owner) ? 'Hide' : 'Show'}</span>
                        {expandedBets.has(result.owner) ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {expandedBets.has(result.owner) && (
                    <div className="p-4 bg-white border-t border-gray-200">
                      <div className="space-y-3">
                        {result.details.map((player, playerIndex) => (
                          <PlayerCard key={playerIndex} player={player} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent>
            <LoadingSpinner className="py-8" />
          </CardContent>
        </Card>
      )}

      {/* Scoring Guide */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Scoring System</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-xl bg-yellow-50 border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600 mb-1">+3</div>
              <div className="text-sm font-medium text-yellow-800">1st Place</div>
              <div className="text-xs text-yellow-600 mt-1">Winner takes all</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-green-50 border border-green-200">
              <div className="text-2xl font-bold text-green-600 mb-1">+1</div>
              <div className="text-sm font-medium text-green-800">Top 10</div>
              <div className="text-xs text-green-600 mt-1">Solid performance</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div className="text-2xl font-bold text-gray-600 mb-1">0</div>
              <div className="text-sm font-medium text-gray-800">11th-30th</div>
              <div className="text-xs text-gray-600 mt-1">No points awarded</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-red-50 border border-red-200">
              <div className="text-2xl font-bold text-red-600 mb-1">-1</div>
              <div className="text-sm font-medium text-red-800">31+ / Cut</div>
              <div className="text-xs text-red-600 mt-1">Poor performance</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 