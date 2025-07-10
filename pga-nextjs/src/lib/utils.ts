import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatNumber(number: number): string {
  return new Intl.NumberFormat('en-US').format(number);
}

export function getPointsColor(points: number): string {
  if (points > 0) return 'text-success-600';
  if (points < 0) return 'text-error-600';
  return 'text-gray-600';
}

export function getPointsBadgeVariant(points: number): 'success' | 'error' | 'neutral' {
  if (points > 0) return 'success';
  if (points < 0) return 'error';
  return 'neutral';
} 