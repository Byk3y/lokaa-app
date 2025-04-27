import React from 'react';
import { Loader2 } from 'lucide-react';

type LoadingIndicatorProps = {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  nonBlocking?: boolean;
};

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  size = 'medium',
  className = '',
  nonBlocking = true
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <Loader2 
      className={`animate-spin ${nonBlocking ? 'text-gray-400' : 'text-teal-600'} ${sizeClasses[size]} ${className}`}
      aria-label="Loading"
    />
  );
};

export default LoadingIndicator; 