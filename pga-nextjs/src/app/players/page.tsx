'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Card, CardHeader, CardContent, LoadingSpinner } from '@/components/ui';
import { Search, Users, Filter } from 'lucide-react';
import { DetailedPlayer } from '@/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PlayersPage() {
  const { data: players, error, isLoading } = useSWR<DetailedPlayer[]>('/api/players', fetcher);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRanking, setSelectedRanking] = useState<string>('');

  const filteredPlayers = players?.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.country.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRanking = selectedRanking === '' || 
                          (selectedRanking === 'top10' && player.ranking <= 10) ||
                          (selectedRanking === 'top50' && player.ranking <= 50) ||
                          (selectedRanking === 'top100' && player.ranking <= 100);
    return matchesSearch && matchesRanking;
  });

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-error-600">Failed to load players</p>
      </div>
    );
  }

  const getRankingColor = (ranking: number) => {
    if (ranking <= 10) return 'text-success-600 bg-success-50 border-success-200';
    if (ranking <= 50) return 'text-primary-600 bg-primary-50 border-primary-200';
    if (ranking <= 100) return 'text-warning-600 bg-warning-50 border-warning-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
          <Users className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Players Database</h1>
          <p className="text-gray-600">Browse available players for future tournaments</p>
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search players by name or country..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
            
            {/* Ranking Filter */}
            <div className="relative sm:w-48">
              <Filter className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
              <select
                value={selectedRanking}
                onChange={(e) => setSelectedRanking(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors appearance-none bg-white"
              >
                <option value="">All Rankings</option>
                <option value="top10">Top 10</option>
                <option value="top50">Top 50</option>
                <option value="top100">Top 100</option>
              </select>
            </div>
          </div>
          
          {/* Results Count */}
          {!isLoading && filteredPlayers && (
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredPlayers.length} of {players?.length || 0} players
            </div>
          )}
        </CardContent>
      </Card>

      {/* Players Grid */}
      {isLoading ? (
        <Card>
          <CardContent>
            <LoadingSpinner className="py-8" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlayers?.map((player) => (
            <Card key={player.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">
                      {player.name}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span className="inline-flex items-center space-x-1">
                        <span>🏌️</span>
                        <span>{player.country}</span>
                      </span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getRankingColor(player.ranking)}`}>
                    #{player.ranking}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Age</span>
                    <span className="font-medium text-gray-900">{player.age}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Total Earnings</span>
                    <span className="font-medium text-gray-900">
                      ${player.total_earnings.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Career Wins</span>
                    <span className="font-medium text-gray-900">{player.career_wins}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Majors Won</span>
                    <span className="font-medium text-gray-900">{player.majors_won}</span>
                  </div>
                </div>

                {/* Recent Form Indicator */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Recent Form</span>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((_, i) => (
                        <div 
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < 3 ? 'bg-success-400' : 
                            i < 4 ? 'bg-warning-400' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredPlayers?.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No players found</h3>
            <p className="text-gray-600">
              Try adjusting your search terms or filter criteria
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Summary */}
      {!isLoading && players && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Database Overview</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-success-50 rounded-xl">
                <div className="text-2xl font-bold text-success-600 mb-1">
                  {players.filter(p => p.ranking <= 10).length}
                </div>
                <p className="text-sm font-medium text-gray-900">Top 10</p>
              </div>
              <div className="text-center p-4 bg-primary-50 rounded-xl">
                <div className="text-2xl font-bold text-primary-600 mb-1">
                  {players.filter(p => p.ranking <= 50).length}
                </div>
                <p className="text-sm font-medium text-gray-900">Top 50</p>
              </div>
              <div className="text-center p-4 bg-warning-50 rounded-xl">
                <div className="text-2xl font-bold text-warning-600 mb-1">
                  {players.filter(p => p.majors_won > 0).length}
                </div>
                <p className="text-sm font-medium text-gray-900">Major Winners</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-2xl font-bold text-gray-600 mb-1">
                  {players.length}
                </div>
                <p className="text-sm font-medium text-gray-900">Total Players</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 