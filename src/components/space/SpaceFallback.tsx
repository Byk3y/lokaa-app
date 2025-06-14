import React from 'react';
import { Loader2, AlertCircle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface SpaceFallbackProps {
  type: 'loading' | 'error' | 'not-found';
  spaceName?: string;
  error?: string;
  onRetry?: () => void;
}

export default function SpaceFallback({ type, spaceName, error, onRetry }: SpaceFallbackProps) {
  const navigate = useNavigate();

  if (type === 'loading') {
    // Check if mobile
    const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // FIXED: Direct mobile loading screen without React.Suspense to prevent dual loading
      const message = spaceName ? `Loading ${spaceName}...` : 'Loading space...';
      
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md mx-auto text-center space-y-6">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-800">{message}</h2>
              <p className="text-gray-600 text-sm">Please wait while we load your space</p>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {spaceName ? `Loading ${spaceName}...` : 'Loading space...'}
          </h2>
          <p className="text-gray-500">Please wait while we load your space</p>
        </div>
      </div>
    );
  }

  if (type === 'not-found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-orange-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Space Not Found</h2>
          <p className="text-gray-600 mb-6">
            {spaceName 
              ? `We couldn't find the space "${spaceName}". It may have been moved or deleted.`
              : 'The space you\'re looking for doesn\'t exist or isn\'t available.'
            }
          </p>
          <div className="flex gap-3">
            <Button onClick={() => navigate('/discover')} className="bg-teal-600 hover:bg-teal-700">
              <Home className="h-4 w-4 mr-2" />
              Browse Spaces
            </Button>
            {onRetry && (
              <Button onClick={onRetry} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center max-w-md text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Space</h2>
        <p className="text-gray-600 mb-4">
          {spaceName 
            ? `There was a problem loading "${spaceName}".`
            : 'There was a problem loading this space.'
          }
        </p>
        {error && (
          <details className="mb-4 text-sm">
            <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
              Show error details
            </summary>
            <div className="mt-2 p-3 bg-gray-100 rounded text-left font-mono text-xs">
              {error}
            </div>
          </details>
        )}
        <div className="flex gap-3">
          <Button onClick={() => navigate('/discover')} className="bg-teal-600 hover:bg-teal-700">
            <Home className="h-4 w-4 mr-2" />
            Browse Spaces
          </Button>
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 