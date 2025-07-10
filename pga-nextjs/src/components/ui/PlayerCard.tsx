import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from './Badge';
import { getPointsBadgeVariant } from '@/lib/utils';
import { PlayerResult } from '@/types';

interface PlayerCardProps {
  player: PlayerResult;
  className?: string;
}

export function PlayerCard({ player, className }: PlayerCardProps) {
  const badgeVariant = getPointsBadgeVariant(player.Points);

  return (
    <div className={cn('flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100', className)}>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-medium text-gray-900 truncate">
          {player.Player}
        </h3>
        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
          <span>Rank: {player.Rank}</span>
          <span>Total: {player.Total_Score}</span>
          <span>Today: {player.Today}</span>
        </div>
        {player.Round_Scores && (
          <p className="text-xs text-gray-400 mt-1">
            Rounds: {player.Round_Scores}
          </p>
        )}
      </div>
      
      <div className="ml-4 flex-shrink-0">
        <Badge variant={badgeVariant}>
          {player.Points > 0 ? '+' : ''}{player.Points} pts
        </Badge>
      </div>
    </div>
  );
} 