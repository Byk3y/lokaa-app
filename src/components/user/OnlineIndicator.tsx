import React from 'react';
import { cn } from '@/lib/utils';

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  pulseAnimation?: boolean;
}

export function OnlineIndicator({
  isOnline,
  size = 'md',
  className,
  pulseAnimation = true
}: OnlineIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };
  
  return (
    <div 
      className={cn(
        'rounded-full',
        isOnline ? 'bg-green-500' : 'bg-gray-400',
        isOnline && pulseAnimation ? 'animate-pulse' : '',
        sizeClasses[size],
        className
      )}
      title={isOnline ? 'Online' : 'Offline'}
      aria-label={isOnline ? 'User is online' : 'User is offline'}
    />
  );
} 