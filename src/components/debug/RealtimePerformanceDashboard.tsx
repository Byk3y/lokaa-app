/**
 * 🚀 Phase 2B: Real-time Performance Dashboard
 * 
 * Comprehensive monitoring dashboard for unified real-time system:
 * - Live connection health monitoring
 * - Performance metrics visualization
 * - Adaptive optimization insights
 * - Connection quality analysis
 * - Real-time debugging tools
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { unifiedRealtimeSystem } from '@/utils/unifiedRealtimeSystem';
import { devLogger } from '@/utils/developmentLogger';

interface RealtimeMetrics {
  isEnabled: boolean;
  performanceMode: 'performance' | 'standard' | 'battery';
  backgroundOptimizationActive: boolean;
  activeChannels: number;
  activeSubscriptions: number;
  connectionHealth: Record<string, any>;
  subscriptionDetails: Array<{
    id: string;
    spaceId: string;
    table: string;
    event: string;
    priority: string;
    isActive: boolean;
    lastActivity: string;
    retryCount: number;
  }>;
  performanceMetrics: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalChannels: number;
    totalPacketsReceived: number;
    totalPacketsLost: number;
    packetLossRate: number;
    avgConnectionQuality: number;
    performanceMode: string;
    backgroundOptimizationActive: boolean;
  };
}

const RealtimePerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(1000);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 🚫 PREVENT WHITE CAST: Only show when explicitly enabled
  const isDevelopment = import.meta.env.DEV;
  const isExplicitlyEnabled = (window as any).__ENABLE_REALTIME_DASHBOARD__ === true;
  const shouldRender = isDevelopment && isExplicitlyEnabled && isVisible;

  /**
   * Fetch real-time metrics
   */
  const fetchMetrics = useCallback(() => {
    if (!shouldRender) return; // Don't fetch if not rendering
    
    try {
      const debugInfo = unifiedRealtimeSystem.getDebugInfo();
      setMetrics(debugInfo as RealtimeMetrics);
    } catch (error) {
      devLogger.log('RealtimeDashboard', 'Failed to fetch metrics:', error);
    }
  }, []);

  /**
   * Auto-refresh metrics
   */
  useEffect(() => {
    if (!autoRefresh || !isVisible) return;

    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchMetrics, refreshInterval, autoRefresh, isVisible]);

  /**
   * Initial fetch when component becomes visible
   */
  useEffect(() => {
    if (isVisible) {
      fetchMetrics();
    }
  }, [isVisible, fetchMetrics]);

  // 🚫 CRITICAL FIX: Don't render anything unless debug mode is explicitly enabled
  if (!shouldRender) {
    return null;
  }

  /**
   * Get connection quality color
   */
  const getQualityColor = (quality: string): string => {
    switch (quality) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  /**
   * Get performance mode badge variant
   */
  const getPerformanceModeVariant = (mode: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (mode) {
      case 'performance': return 'default';
      case 'standard': return 'secondary';
      case 'battery': return 'outline';
      default: return 'secondary';
    }
  };

  /**
   * Calculate overall system health
   */
  const calculateOverallHealth = (metrics: RealtimeMetrics): {
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    issues: string[];
  } => {
    const issues: string[] = [];
    let score = 100;

    // Check packet loss rate
    if (metrics.performanceMetrics.packetLossRate > 0.1) {
      score -= 30;
      issues.push('High packet loss rate');
    } else if (metrics.performanceMetrics.packetLossRate > 0.05) {
      score -= 15;
      issues.push('Moderate packet loss');
    }

    // Check connection quality
    if (metrics.performanceMetrics.avgConnectionQuality < 2) {
      score -= 25;
      issues.push('Poor average connection quality');
    } else if (metrics.performanceMetrics.avgConnectionQuality < 3) {
      score -= 10;
      issues.push('Below average connection quality');
    }

    // Check if system is enabled
    if (!metrics.isEnabled) {
      score -= 50;
      issues.push('Real-time system disabled');
    }

    // Check for failed connections
    const failedConnections = Object.values(metrics.connectionHealth).filter(
      (conn: any) => conn.status === 'error'
    ).length;
    
    if (failedConnections > 0) {
      score -= failedConnections * 10;
      issues.push(`${failedConnections} failed connection(s)`);
    }

    // Determine status
    let status: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90) status = 'excellent';
    else if (score >= 75) status = 'good';
    else if (score >= 60) status = 'fair';
    else status = 'poor';

    return { score: Math.max(0, score), status, issues };
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur-sm"
        >
          📡 Real-time Dashboard
        </Button>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="fixed inset-4 z-50 bg-background/95 backdrop-blur-sm rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Real-time Performance Dashboard</h2>
          <Button onClick={() => setIsVisible(false)} variant="ghost" size="sm">
            ✕
          </Button>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading metrics...</div>
        </div>
      </div>
    );
  }

  const overallHealth = calculateOverallHealth(metrics);

  return (
    <div className="fixed inset-4 z-50 bg-background/95 backdrop-blur-sm rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">📡 Real-time Performance Dashboard</h2>
          <Badge variant={getPerformanceModeVariant(metrics.performanceMode)}>
            {metrics.performanceMode.toUpperCase()} MODE
          </Badge>
          {metrics.backgroundOptimizationActive && (
            <Badge variant="outline">BACKGROUND OPTIMIZED</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
          >
            {autoRefresh ? '⏸️' : '▶️'} Auto-refresh
          </Button>
          <Button onClick={fetchMetrics} variant="outline" size="sm">
            🔄 Refresh
          </Button>
          <Button onClick={() => setIsVisible(false)} variant="ghost" size="sm">
            ✕
          </Button>
        </div>
      </div>

      <div className="p-4 h-[calc(100vh-8rem)] overflow-auto">
        <Tabs defaultValue="overview" className="h-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getQualityColor(overallHealth.status)}`} />
                  System Health: {overallHealth.status.toUpperCase()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Overall Score</span>
                      <span>{overallHealth.score}/100</span>
                    </div>
                    <Progress value={overallHealth.score} className="h-2" />
                  </div>
                  
                  {overallHealth.issues.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Issues Detected:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {overallHealth.issues.map((issue, index) => (
                          <li key={index}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{metrics.activeChannels}</div>
                  <div className="text-sm text-muted-foreground">Active Channels</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{metrics.activeSubscriptions}</div>
                  <div className="text-sm text-muted-foreground">Active Subscriptions</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">
                    {metrics.performanceMetrics.totalPacketsReceived}
                  </div>
                  <div className="text-sm text-muted-foreground">Packets Received</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">
                    {(metrics.performanceMetrics.packetLossRate * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Packet Loss Rate</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="connections" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Connection Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(metrics.connectionHealth).map(([channelKey, conn]: [string, any]) => (
                    <div key={channelKey} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getQualityColor(conn.quality)}`} />
                        <div>
                          <div className="font-medium">{channelKey}</div>
                          <div className="text-sm text-muted-foreground">
                            Status: {conn.status} | Quality: {conn.quality}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right text-sm">
                        <div>Latency: {conn.avgLatency?.toFixed(0)}ms</div>
                        <div>Reconnects: {conn.reconnectCount}</div>
                        <div>Packets: {conn.packetsReceived}/{conn.packetsLost}</div>
                      </div>
                    </div>
                  ))}
                  
                  {Object.keys(metrics.connectionHealth).length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No active connections
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Average Connection Quality</span>
                    <span>{metrics.performanceMetrics.avgConnectionQuality.toFixed(1)}/4.0</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Total Packets Received</span>
                    <span>{metrics.performanceMetrics.totalPacketsReceived.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Total Packets Lost</span>
                    <span>{metrics.performanceMetrics.totalPacketsLost.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Packet Loss Rate</span>
                    <span className={metrics.performanceMetrics.packetLossRate > 0.05 ? 'text-red-600' : 'text-green-600'}>
                      {(metrics.performanceMetrics.packetLossRate * 100).toFixed(2)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Performance Mode</span>
                    <Badge variant={getPerformanceModeVariant(metrics.performanceMode)}>
                      {metrics.performanceMode}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Background Optimization</span>
                    <Badge variant={metrics.backgroundOptimizationActive ? 'default' : 'outline'}>
                      {metrics.backgroundOptimizationActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>System Status</span>
                    <Badge variant={metrics.isEnabled ? 'default' : 'destructive'}>
                      {metrics.isEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RealtimePerformanceDashboard; 