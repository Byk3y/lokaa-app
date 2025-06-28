/**
 * 📱 Simple Mobile Status Component
 * 
 * Simplified replacement for Phase1MobileRecovery that shows
 * essential mobile status using SimpleMobileManager
 */

import React from 'react';
import { useSimpleMobile } from '@/hooks/useSimpleMobile';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface StatusMessage {
  text: string;
  type: 'info' | 'success' | 'warning';
  icon: React.ReactNode;
}

export function SimpleMobileStatus() {
  const { isBackground, needsSessionCheck, isRefreshing, isMobile } = useSimpleMobile();
  
  // Only show on mobile devices
  if (!isMobile) {
    return null;
  }
  
  // Determine status message
  let status: StatusMessage | null = null;
  
  if (isRefreshing) {
    status = {
      text: 'Refreshing session...',
      type: 'info',
      icon: <Loader2 className="w-4 h-4 animate-spin" />
    };
  } else if (needsSessionCheck) {
    status = {
      text: 'Validating session...',
      type: 'warning',
      icon: <AlertCircle className="w-4 h-4" />
    };
  } else if (isBackground) {
    status = {
      text: 'App in background',
      type: 'info',
      icon: <AlertCircle className="w-4 h-4" />
    };
  }
  
  // Don't render if no status to show
  if (!status) {
    return null;
  }
  
  const getBackgroundColor = () => {
    switch (status!.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };
  
  return (
    <div 
      className={`
        fixed top-4 left-1/2 transform -translate-x-1/2 z-50
        ${getBackgroundColor()}
        border rounded-lg px-3 py-2 shadow-sm
        flex items-center gap-2 text-sm font-medium
        transition-all duration-300 ease-in-out
        animate-in slide-in-from-top-2
      `}
    >
      {status.icon}
      <span>{status.text}</span>
    </div>
  );
}

export default SimpleMobileStatus; 