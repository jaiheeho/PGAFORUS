import React from 'react';
import { cn } from '@/lib/utils';
import { BadgeVariant } from '@/types';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const badgeVariants = {
  primary: 'bg-primary-100 text-primary-800',
  success: 'bg-success-100 text-success-800',
  error: 'bg-error-100 text-error-800',
  warning: 'bg-warning-100 text-warning-800',
  neutral: 'bg-gray-100 text-gray-800',
};

export function Badge({ variant = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
} 