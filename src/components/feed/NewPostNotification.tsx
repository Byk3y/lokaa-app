import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ChevronUp } from 'lucide-react';

interface NewPostNotificationProps {
  newPostCount: number;
  isLoading: boolean;
  isVisible: boolean;
  onLoadPosts: () => void;
  onDismiss?: () => void; // Optional since we're not using it in the UI
  autoHideDelay?: number; // Auto-hide after X milliseconds
}

export const NewPostNotification: React.FC<NewPostNotificationProps> = ({
  newPostCount,
  isLoading,
  isVisible,
  onLoadPosts,
  onDismiss,
  autoHideDelay = 0, // Disabled - stay persistent until user action
}) => {
  const [shouldPulse, setShouldPulse] = useState(false);
  const [progress, setProgress] = useState(100);

  // Auto-hide functionality
  useEffect(() => {
    if (!isVisible || isLoading || autoHideDelay <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, autoHideDelay - elapsed);
      const newProgress = (remaining / autoHideDelay) * 100;
      
      setProgress(newProgress);
      
      if (remaining <= 0) {
        onDismiss();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible, isLoading, autoHideDelay, onDismiss]);

  // Pulse effect when count increases
  useEffect(() => {
    if (newPostCount > 0) {
      setShouldPulse(true);
      const timer = setTimeout(() => setShouldPulse(false), 600);
      return () => clearTimeout(timer);
    }
  }, [newPostCount]);

  const getMessage = () => {
    if (newPostCount === 1) return 'Load 1 new post';
    return `Load ${newPostCount} new posts`;
  };

  const getProgressColor = () => {
    if (progress > 66) return 'bg-green-400';
    if (progress > 33) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  return (
    <AnimatePresence>
      {isVisible && newPostCount > 0 && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ 
            type: 'spring', 
            stiffness: 400, 
            damping: 25,
            duration: 0.3 
          }}
          className="mb-4 z-10 relative w-full max-w-[768px]"
        >
          <motion.div
            animate={shouldPulse ? { scale: [1, 1.01, 1] } : {}}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg shadow-sm overflow-hidden relative"
          >
            <div 
              className="px-4 py-2 flex items-center space-x-2 cursor-pointer hover:bg-blue-200/30 transition-colors"
              onClick={onLoadPosts}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              ) : (
                <ChevronUp className="h-4 w-4 text-blue-600" />
              )}
              
              <span className="text-blue-800 text-sm font-medium">
                {isLoading ? 'Loading new posts...' : getMessage()}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 