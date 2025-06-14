/**
 * 🚀 Smart Space Loader - Next Level Loading UX
 * Progressive loading states that make space redirects feel instant
 */

import React, { useState, useEffect } from 'react';
import { Loader2, Zap, Target, Rocket } from 'lucide-react';

interface SmartSpaceLoaderProps {
  expectedSpaceName?: string;
  strategy?: string;
  stage?: 'detecting' | 'loading' | 'redirecting' | 'complete';
}

interface LoadingStage {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  duration: number;
}

export default function SmartSpaceLoader({ 
  expectedSpaceName, 
  strategy, 
  stage = 'detecting' 
}: SmartSpaceLoaderProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  const getLoadingStages = (): LoadingStage[] => {
    const spaceName = expectedSpaceName || 'your space';
    
    switch (strategy) {
      case 'instant-cache':
        return [
          {
            icon: <Zap className="h-8 w-8 text-green-500" />,
            title: `Taking you to ${spaceName}`,
            subtitle: 'Using cached space info ⚡',
            duration: 200
          }
        ];
        
      case 'owned-space-found':
        return [
          {
            icon: <Target className="h-6 w-6 text-blue-500" />,
            title: 'Finding your spaces',
            subtitle: 'Checking owned spaces...',
            duration: 500
          },
          {
            icon: <Rocket className="h-8 w-8 text-green-500" />,
            title: `Welcome back to ${spaceName}`,
            subtitle: 'Taking you to your space 🚀',
            duration: 300
          }
        ];
        
      case 'recent-member-space':
        return [
          {
            icon: <Target className="h-6 w-6 text-blue-500" />,
            title: 'Finding your spaces',
            subtitle: 'Checking recent activity...',
            duration: 700
          },
          {
            icon: <Rocket className="h-8 w-8 text-green-500" />,
            title: `Back to ${spaceName}`,
            subtitle: 'Loading your space 🎯',
            duration: 300
          }
        ];
        
      default:
        return [
          {
            icon: <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />,
            title: 'Detecting your spaces',
            subtitle: 'This should be quick...',
            duration: 800
          },
          {
            icon: <Rocket className="h-8 w-8 text-green-500" />,
            title: `Found ${spaceName}!`,
            subtitle: 'Taking you there now 🚀',
            duration: 400
          }
        ];
    }
  };

  const stages = getLoadingStages();

  useEffect(() => {
    if (stages.length === 0) return;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 2;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return newProgress;
      });
    }, 20);

    const stageTimeout = setTimeout(() => {
      if (currentStage < stages.length - 1) {
        setCurrentStage(prev => prev + 1);
        setProgress(0);
      }
    }, stages[currentStage]?.duration || 1000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(stageTimeout);
    };
  }, [currentStage, stages]);

  const currentStageData = stages[currentStage];

  if (!currentStageData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Loading...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-blue-50 to-green-50">
      <div className="text-center max-w-md">
        {/* Icon with animation */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            {currentStageData.icon}
            {strategy === 'instant-cache' && (
              <div className="absolute -inset-2 rounded-full border-2 border-green-300 animate-ping" />
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold mb-2 text-gray-800">
          {currentStageData.title}
        </h3>

        {/* Subtitle */}
        <p className="text-sm text-gray-600 mb-6">
          {currentStageData.subtitle}
        </p>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Strategy indicator (for debugging) */}
        {process.env.NODE_ENV === 'development' && strategy && (
          <div className="text-xs text-gray-400 mt-4">
            Strategy: {strategy}
          </div>
        )}

        {/* Stage indicator for multi-stage loads */}
        {stages.length > 1 && (
          <div className="flex justify-center space-x-2 mt-4">
            {stages.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  index === currentStage 
                    ? 'bg-blue-500' 
                    : index < currentStage 
                      ? 'bg-green-500' 
                      : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Hook to use with smart redirect events
export function useSmartSpaceLoader() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState<{
    expectedSpaceName?: string;
    strategy?: string;
    stage?: 'detecting' | 'loading' | 'redirecting' | 'complete';
  }>({});

  useEffect(() => {
    const handleRedirectProgress = (event: CustomEvent) => {
      const { message, stage, spaceName, strategy } = event.detail;
      
      setIsLoading(true);
      setLoadingInfo({
        expectedSpaceName: spaceName,
        strategy,
        stage: stage || 'loading'
      });
      
      // Auto-hide loading after redirect completes
      if (stage === 'complete') {
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }
    };

    window.addEventListener('smartRedirectProgress', handleRedirectProgress as EventListener);
    
    return () => {
      window.removeEventListener('smartRedirectProgress', handleRedirectProgress as EventListener);
    };
  }, []);

  return {
    isLoading,
    loadingInfo,
    showLoader: (info: typeof loadingInfo) => {
      setIsLoading(true);
      setLoadingInfo(info);
    },
    hideLoader: () => {
      setIsLoading(false);
      setLoadingInfo({});
    }
  };
} 