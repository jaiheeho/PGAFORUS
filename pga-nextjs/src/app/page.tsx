'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, Button } from '@/components/ui';
import { Trophy, BarChart3, Settings, TrendingUp, Users, Target } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
          PGA FOR US
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          AI-Powered Golf Betting Insights for Everyone
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Bets</p>
              <p className="text-2xl font-bold text-gray-900">2</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Leader</p>
              <p className="text-lg font-semibold text-gray-900">Scottie Scheffler</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tournament Status</p>
              <p className="text-lg font-semibold text-gray-900">Round 4</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/leaderboard">
          <Card className="hover:shadow-medium transition-shadow cursor-pointer group">
            <CardContent className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                <Trophy className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Leaderboard</h3>
                <p className="text-gray-600">View current tournament standings</p>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                View Leaderboard
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/bet">
          <Card className="hover:shadow-medium transition-shadow cursor-pointer group">
            <CardContent className="text-center space-y-4">
              <div className="w-16 h-16 bg-success-100 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                <BarChart3 className="w-8 h-8 text-success-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Betting Results</h3>
                <p className="text-gray-600">Check your fantasy points and rankings</p>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                View Results
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/manage">
          <Card className="hover:shadow-medium transition-shadow cursor-pointer group">
            <CardContent className="text-center space-y-4">
              <div className="w-16 h-16 bg-warning-100 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                <Settings className="w-8 h-8 text-warning-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Bets</h3>
                <p className="text-gray-600">Add, edit, or remove your player picks</p>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                Manage Bets
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* How It Works */}
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto text-sm font-bold">
                1
              </div>
              <h3 className="font-semibold text-gray-900">Pick 5 Players</h3>
              <p className="text-sm text-gray-600">Select your fantasy team from the tournament field</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto text-sm font-bold">
                2
              </div>
              <h3 className="font-semibold text-gray-900">Earn Points</h3>
              <p className="text-sm text-gray-600">1st place = 3pts, Top 10 = 1pt, 31+ = -1pt, Cut = -1pt</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto text-sm font-bold">
                3
              </div>
              <h3 className="font-semibold text-gray-900">Track Progress</h3>
              <p className="text-sm text-gray-600">Follow real-time updates and see your ranking</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
