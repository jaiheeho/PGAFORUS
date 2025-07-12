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
    <div className={cn('flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100', className)}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {player.Player}
          </h3>
          <div className="ml-2 flex-shrink-0">
            <Badge variant={badgeVariant} className="text-xs">
              {player.Points > 0 ? '+' : ''}{player.Points}
            </Badge>
          </div>
        </div>
        <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
          <span>#{player.Rank}</span>
          <span>Total: {player.Total_Score}</span>
          <span>Today: {player.Today}</span>
          {player.Round_Scores && 
           player.Round_Scores !== 'Tournament hasn\'t started' && 
           player.Round_Scores !== 'N/A' && (
            <span className="truncate">Rounds: {player.Round_Scores}</span>
          )}
        </div>
      </div>
    </div>
  );
} 