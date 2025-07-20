import React, { useState, useEffect } from 'react';
import { searchPerformanceMonitor } from '../utils/searchPerformance';
import type { SearchPerformanceStats } from '../utils/searchPerformance';
import { devLogger } from '@/utils/developmentLogger';

export function SearchPerformanceDashboard() {
  const [stats, setStats] = useState<SearchPerformanceStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      setStats(searchPerformanceMonitor.getStats());
    };

    // Update stats every 5 seconds
    const interval = setInterval(updateStats, 5000);
    updateStats(); // Initial load

    return () => clearInterval(interval);
  }, []);

  if (!import.meta.env.DEV) {
    return null; // Only show in development
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg z-50 text-sm"
      >
        🔍 Search Stats
      </button>
    );
  }

  if (!stats) {
    return (
      <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 max-w-sm">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-sm">Search Performance</h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-gray-600">No data available</p>
      </div>
    );
  }

  const insights = searchPerformanceMonitor.getInsights();

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 max-w-sm max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-sm">🔍 Search Performance</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {/* Key Metrics */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs">
          <span>Total Searches:</span>
          <span className="font-mono">{stats.totalSearches}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Avg Response:</span>
          <span className="font-mono">{stats.averageResponseTime.toFixed(0)}ms</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Cache Hit Rate:</span>
          <span className="font-mono">{(stats.cacheHitRate * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Error Rate:</span>
          <span className="font-mono">{(stats.errorRate * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-xs mb-2">Insights:</h4>
          <div className="space-y-1">
            {insights.map((insight, index) => (
              <div key={index} className="text-xs text-gray-600">
                {insight}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popular Queries */}
      {stats.popularQueries.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-xs mb-2">Popular Queries:</h4>
          <div className="space-y-1">
            {stats.popularQueries.slice(0, 5).map((item, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="truncate">{item.query}</span>
                <span className="font-mono ml-2">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slow Queries */}
      {stats.slowQueries.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-xs mb-2 text-orange-600">Slow Queries:</h4>
          <div className="space-y-1">
            {stats.slowQueries.slice(0, 3).map((item, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="truncate">{item.query}</span>
                <span className="font-mono ml-2 text-orange-600">{item.duration.toFixed(0)}ms</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-2 text-xs">
        <button
          onClick={() => {
            searchPerformanceMonitor.clear();
            setStats(searchPerformanceMonitor.getStats());
          }}
          className="bg-red-500 text-white px-2 py-1 rounded"
        >
          Clear
        </button>
        <button
          onClick={() => {
            const data = searchPerformanceMonitor.exportMetrics();
            devLogger.log('SearchPerformance', 'Search Performance Data:', data);
          }}
          className="bg-gray-500 text-white px-2 py-1 rounded"
        >
          Export
        </button>
      </div>
    </div>
  );
} 