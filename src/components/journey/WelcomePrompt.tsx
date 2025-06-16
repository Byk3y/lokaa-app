import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomePromptProps {
  message: string;
  onDismiss?: () => void;
  onAction?: (action: string) => void;
  duration?: number;
  className?: string;
  spaceName?: string;
  memberCount?: number;
}

export const WelcomePrompt: React.FC<WelcomePromptProps> = ({
  message,
  onDismiss,
  onAction,
  duration = 10000,
  className,
  spaceName,
  memberCount
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  };

  const handleAction = (action: string) => {
    onAction?.(action);
    // Keep prompt open for action feedback
  };

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 w-80 max-w-sm",
        "transform transition-all duration-300 ease-out",
        isVisible && !isClosing 
          ? "translate-x-0 opacity-100 scale-100" 
          : "translate-x-full opacity-0 scale-95",
        className
      )}
    >
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-lg shadow-lg border border-blue-200 dark:border-blue-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-indigo-500">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-white" />
            <span className="text-white font-semibold text-sm">
              Welcome to {spaceName || 'this space'}!
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start space-x-3 mb-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                {message}
              </p>
              {memberCount && (
                <div className="flex items-center space-x-1 mt-2 text-xs text-gray-600 dark:text-gray-400">
                  <Users className="h-3 w-3" />
                  <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => handleAction('create_post')}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs py-2 px-3 rounded-md font-medium transition-colors"
            >
              Share Something
            </button>
            <button
              onClick={() => handleAction('explore')}
              className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs py-2 px-3 rounded-md font-medium transition-colors"
            >
              Explore
            </button>
          </div>
        </div>

        {/* Progress Bar (if duration is set) */}
        {duration > 0 && (
          <div className="h-1 bg-gray-200 dark:bg-gray-700">
            <div 
              className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all ease-linear"
              style={{
                animation: `shrink ${duration}ms linear`,
                transformOrigin: 'left'
              }}
            />
          </div>
        )}
      </div>

      {/* Custom CSS for progress bar animation */}
      <style jsx>{`
        @keyframes shrink {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default WelcomePrompt; 