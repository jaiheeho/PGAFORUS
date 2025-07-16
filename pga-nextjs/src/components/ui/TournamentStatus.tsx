'use client';

import React, { useState } from 'react';
import { Badge } from './Badge';
import { BadgeVariant } from '@/types';
import { TournamentStatus } from '@/lib/tournament-status';
import { Trophy, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { TournamentAISummary } from './TournamentAISummary';

interface TournamentStatusProps {
  tournamentStatus: TournamentStatus;
  statusMessage?: string;
  tournamentName?: string;
  className?: string;
}

export function TournamentStatusComponent({ tournamentStatus, statusMessage, tournamentName, className = '' }: TournamentStatusProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [aiSummary, setAiSummary] = useState<string>('');

  const getStatusVariant = (phase: TournamentStatus['phase']): BadgeVariant => {
    switch (phase) {
      case 'pre-tournament':
        return 'primary';
      case 'active':
        return 'warning';
      case 'completed':
        return 'success';
      default:
        return 'neutral';
    }
  };

  const getStatusIcon = (phase: TournamentStatus['phase']) => {
    switch (phase) {
      case 'pre-tournament':
        return <Clock className="w-4 h-4" />;
      case 'active':
        return <Trophy className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleSummaryGenerated = (summary: string) => {
    setAiSummary(summary);
  };

  return (
    <div className={`tournament-status ${className}`}>
      {/* Header with Toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {/* Tournament Name Display */}
          {tournamentName && (
            <h3 className="text-lg font-semibold text-gray-900">{tournamentName}</h3>
          )}
          
          <div className="flex items-center space-x-2">
            {getStatusIcon(tournamentStatus.phase)}
            <Badge variant={getStatusVariant(tournamentStatus.phase)}>
              {statusMessage || tournamentStatus.phase.toUpperCase()}
            </Badge>
          </div>
          
          {tournamentStatus.phase === 'active' && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Round {tournamentStatus.currentRound} of {tournamentStatus.totalRounds}</span>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <button
          onClick={toggleExpanded}
          className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <span>{isExpanded ? 'Hide' : 'Show'} Details</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="space-y-4">
          {/* AI Tournament Summary with Integrated Chat */}
          <TournamentAISummary 
            tournamentName={tournamentName}
            onSummaryGenerated={handleSummaryGenerated}
          />

          {/* Tournament Status Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Tournament Status Details</h4>
            
            {/* Detailed status information */}
            <div className="text-xs text-gray-500 mb-3">
              <div className="flex items-center space-x-4">
                <span>Players: {tournamentStatus.metadata.playersTotal}</span>
                <span>With Scores: {tournamentStatus.metadata.playersWithScores}</span>
                {tournamentStatus.metadata.playersMadeCut > 0 && (
                  <span>Made Cut: {tournamentStatus.metadata.playersMadeCut}</span>
                )}
                <span>Updated: {new Date(tournamentStatus.metadata.lastUpdated).toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Tournament phase indicators */}
            <div className="flex items-center space-x-4 text-xs">
              <div className={`flex items-center space-x-1 ${tournamentStatus.indicators.hasScoreData ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-2 h-2 rounded-full ${tournamentStatus.indicators.hasScoreData ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Scores</span>
              </div>
              <div className={`flex items-center space-x-1 ${tournamentStatus.indicators.hasRoundScores ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-2 h-2 rounded-full ${tournamentStatus.indicators.hasRoundScores ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Rounds</span>
              </div>
              <div className={`flex items-center space-x-1 ${tournamentStatus.indicators.hasMovement ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-2 h-2 rounded-full ${tournamentStatus.indicators.hasMovement ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Movement</span>
              </div>
              <div className={`flex items-center space-x-1 ${tournamentStatus.indicators.cutMade ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-2 h-2 rounded-full ${tournamentStatus.indicators.cutMade ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Cut</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Betting control component
interface BettingControlProps {
  tournamentStatus: TournamentStatus;
  onBetSubmit: () => void;
  disabled?: boolean;
}

export function BettingControl({ tournamentStatus, onBetSubmit, disabled = false }: BettingControlProps) {
  const isBettingAllowed = tournamentStatus.phase === 'pre-tournament' && tournamentStatus.confidence > 0.7;
  
  return (
    <div className="betting-control">
      <button
        onClick={onBetSubmit}
        disabled={disabled || !isBettingAllowed}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          isBettingAllowed && !disabled
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isBettingAllowed ? 'Submit Bet' : 'Betting Closed'}
      </button>
      
      {!isBettingAllowed && (
        <p className="mt-2 text-sm text-gray-500">
          {tournamentStatus.phase === 'pre-tournament' 
            ? 'Waiting for tournament status confirmation...'
            : 'Tournament has started. Betting is closed.'}
        </p>
      )}
    </div>
  );
} 