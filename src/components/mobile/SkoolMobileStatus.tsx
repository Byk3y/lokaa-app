/**
 * 🍎 Skool-Style Mobile Status Indicator
 * 
 * Shows subtle mobile status like Skool:
 * - Small "glitch" indicator during network restoration
 * - No aggressive loading spinners or recovery messages
 * - Minimal, elegant feedback
 */

import React from 'react';
import { useSkoolMobile } from '@/hooks/useSkoolMobile';
import { Wifi, WifiOff } from 'lucide-react';

export function SkoolMobileStatus() {
  const mobile = useSkoolMobile();

  // Only show on mobile devices
  if (!mobile.isMobile) {
    return null;
  }

  // Only show during specific states (like Skool's subtle approach)
  const shouldShow = mobile.isBackground || 
                    (!mobile.networkRestored && mobile.backgroundDuration > 5000) ||
                    mobile.shouldDelayRequests;

  if (!shouldShow) {
    return null;
  }

  const getIndicator = () => {
    if (mobile.isBackground) {
      return {
        icon: <WifiOff className="w-3 h-3 text-gray-400" />,
        text: '',
        bg: 'bg-gray-50/80',
        border: 'border-gray-200'
      };
    }

    if (!mobile.networkRestored) {
      return {
        icon: <Wifi className="w-3 h-3 text-blue-400 animate-pulse" />,
        text: '',
        bg: 'bg-blue-50/80',
        border: 'border-blue-200'
      };
    }

    return null;
  };

  const indicator = getIndicator();
  if (!indicator) return null;

  return (
    <div className={`
      fixed top-4 right-4 z-[9999]
      ${indicator.bg} ${indicator.border}
      border rounded-full p-2
      backdrop-blur-sm
      transition-all duration-300 ease-in-out
      animate-in fade-in-0 slide-in-from-top-2
    `}>
      {indicator.icon}
      {indicator.text && (
        <span className="text-xs text-gray-600 ml-1">{indicator.text}</span>
      )}
    </div>
  );
}

/**
 * Development Debug Panel (only in dev mode)
 */
export function SkoolMobileDebugPanel() {
  const mobile = useSkoolMobile();

  if (process.env.NODE_ENV !== 'development' || !mobile.isMobile) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9999] bg-black/80 text-white text-xs p-3 rounded-lg backdrop-blur-sm max-w-xs">
      <div className="font-bold mb-2">🍎 Skool Mobile Debug</div>
      <div className="space-y-1">
        <div>Status: <span className="text-blue-300">{mobile.status}</span></div>
        <div>Background: <span className={mobile.isBackground ? 'text-red-300' : 'text-green-300'}>
          {mobile.isBackground ? 'Yes' : 'No'}
        </span></div>
        {mobile.backgroundDuration > 0 && (
          <div>Duration: <span className="text-yellow-300">{Math.round(mobile.backgroundDuration/1000)}s</span></div>
        )}
        <div>Cache First: <span className={mobile.shouldUseCacheFirst ? 'text-yellow-300' : 'text-gray-400'}>
          {mobile.shouldUseCacheFirst ? 'Yes' : 'No'}
        </span></div>
        <div>Network: <span className={mobile.networkRestored ? 'text-green-300' : 'text-red-300'}>
          {mobile.networkRestored ? 'Restored' : 'Restoring'}
        </span></div>
      </div>
      
      <button 
        onClick={mobile.simulateBackgroundReturn}
        className="mt-2 px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-500"
      >
        Test Background Return
      </button>
    </div>
  );
} 