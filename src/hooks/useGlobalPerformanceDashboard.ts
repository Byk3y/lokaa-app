import { log } from '@/utils/logger';
import { useState, useEffect } from 'react';
import globalPerformanceService from '@/services/GlobalPerformanceService';

interface GlobalPerformanceData {
  totalCodeReduction: number;
  overallPerformanceGain: number;
  systemsActive: number;
  healthScore: 'A+' | 'A' | 'B' | 'C' | 'D';
  optimization: {
    avatarSystem: any;
    spaceAssets: any;
    postsCache: any;
  };
}

interface UseGlobalPerformanceDashboard {
  isVisible: boolean;
  toggleDashboard: () => void;
  performanceData: GlobalPerformanceData | null;
  refreshMetrics: () => Promise<void>;
  isDevelopment: boolean;
  summaryText: string;
}

export const useGlobalPerformanceDashboard = (): UseGlobalPerformanceDashboard => {
  const [isVisible, setIsVisible] = useState(false);
  const [performanceData, setPerformanceData] = useState<GlobalPerformanceData | null>(null);
  const isDevelopment = import.meta.env.DEV;

  // Subscribe to performance data updates
  useEffect(() => {
    const unsubscribe = globalPerformanceService.subscribe((data) => {
      setPerformanceData(data);
    });

    // Initial data load
    setPerformanceData(globalPerformanceService.getPerformanceData());

    return unsubscribe;
  }, []);

  // Keyboard shortcut to toggle dashboard (Ctrl+Shift+P)
  useEffect(() => {
    if (!isDevelopment) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDevelopment]);

  // Expose dashboard controls to window for debugging
  useEffect(() => {
    if (!isDevelopment) return;

    (window as any).globalPerformanceDashboard = {
      show: () => setIsVisible(true),
      hide: () => setIsVisible(false),
      toggle: () => setIsVisible(prev => !prev),
      getMetrics: () => globalPerformanceService.getPerformanceData(),
      getSummary: () => globalPerformanceService.getSummary(),
      refreshMetrics: () => globalPerformanceService.refreshMetrics()
    };

    log.debug('Hook', `
🚀 Global Performance Dashboard Available!
   
📊 Controls:
• window.globalPerformanceDashboard.show() - Show dashboard
• window.globalPerformanceDashboard.hide() - Hide dashboard  
• window.globalPerformanceDashboard.toggle() - Toggle visibility
• Ctrl+Shift+P - Keyboard shortcut to toggle

📈 Data Access:
• window.globalPerformanceDashboard.getMetrics() - Get current metrics
• window.globalPerformanceDashboard.getSummary() - Get text summary
• window.globalPerformanceDashboard.refreshMetrics() - Force refresh

Current Status: ${performanceData?.totalCodeReduction || 0} lines eliminated, ${performanceData?.overallPerformanceGain || 0}% performance gain
    `);
  }, [isDevelopment, performanceData]);

  const toggleDashboard = () => {
    setIsVisible(prev => !prev);
  };

  const refreshMetrics = async () => {
    await globalPerformanceService.refreshMetrics();
  };

  const summaryText = globalPerformanceService.getSummary();

  return {
    isVisible,
    toggleDashboard,
    performanceData,
    refreshMetrics,
    isDevelopment,
    summaryText
  };
};

export default useGlobalPerformanceDashboard; 