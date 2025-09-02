/**
 * 🔍 Debug Dashboard Component
 * 
 * Visual debugging interface for development environment
 * Integrates with DebugCommandCenter and existing performance monitoring
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { DebugCommandCenter } from '@/utils/debugCommandCenter';
import { log } from '@/utils/logger';

interface DebugDashboardProps {
  isVisible?: boolean;
  onClose?: () => void;
}

interface ComponentMetric {
  name: string;
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  rerenderCauses: string[];
}

interface PerformanceMetrics {
  initialLoadTime: number;
  timeToInteractive: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
}

interface MemoryMetrics {
  used: number;
  total: number;
  limit: number;
  percentage: number;
}

/**
 * Debug Dashboard Component
 */
export const DebugDashboard: React.FC<DebugDashboardProps> = ({
  isVisible = false,
  onClose
}) => {
  const [debugCenter] = useState(() => DebugCommandCenter.getInstance());
  const [metrics, setMetrics] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Refresh metrics
  const refreshMetrics = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const currentMetrics = debugCenter.getMetrics();
      setMetrics(currentMetrics);
      log.debug('Debug', '🔄 [DebugDashboard] Metrics refreshed');
    } catch (error) {
      log.error('Debug', '❌ [DebugDashboard] Failed to refresh metrics:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [debugCenter]);

  // Auto-refresh metrics
  useEffect(() => {
    if (!isVisible) return;

    refreshMetrics();
    const interval = setInterval(refreshMetrics, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [isVisible, refreshMetrics]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        if (onClose) onClose();
      }
    };

    if (isVisible) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, onClose]);

  if (!isVisible || !metrics) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <h2 className="text-xl font-bold">🔍 Debug Dashboard</h2>
            <Badge variant="secondary">Development</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshMetrics}
              disabled={isRefreshing}
            >
              {isRefreshing ? '🔄' : '↻'} Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              ✕ Close
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mx-4 mt-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="components">Components</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="memory">Memory</TabsTrigger>
            </Tabs>

            <div className="flex-1 overflow-auto p-4">
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <OverviewPanel metrics={metrics} />
              </TabsContent>

              {/* Components Tab */}
              <TabsContent value="components" className="space-y-4">
                <ComponentsPanel components={metrics.componentRenders || []} />
              </TabsContent>

              {/* Performance Tab */}
              <TabsContent value="performance" className="space-y-4">
                <PerformancePanel performance={metrics.performanceBaseline} />
              </TabsContent>

              {/* Memory Tab */}
              <TabsContent value="memory" className="space-y-4">
                <MemoryPanel memory={metrics.memoryUsage} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500">
          <div className="flex justify-between items-center">
            <span>Press Ctrl+Shift+D to toggle dashboard</span>
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Overview Panel
 */
const OverviewPanel: React.FC<{ metrics: any }> = ({ metrics }) => {
  const getHealthStatus = () => {
    const memoryUsage = metrics.memoryUsage?.percentage || 0;
    const slowComponents = metrics.componentRenders?.filter((c: ComponentMetric) => c.averageRenderTime > 16).length || 0;
    
    if (memoryUsage > 80 || slowComponents > 3) return { status: 'critical', color: 'bg-red-500' };
    if (memoryUsage > 60 || slowComponents > 1) return { status: 'warning', color: 'bg-yellow-500' };
    return { status: 'good', color: 'bg-green-500' };
  };

  const health = getHealthStatus();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* System Health */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${health.color}`} />
            <span className="text-lg font-bold capitalize">{health.status}</span>
          </div>
        </CardContent>
      </Card>

      {/* Memory Usage */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{metrics.memoryUsage?.used || 0}MB</span>
              <span>{metrics.memoryUsage?.percentage || 0}%</span>
            </div>
            <Progress value={metrics.memoryUsage?.percentage || 0} />
          </div>
        </CardContent>
      </Card>

      {/* Component Renders */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Component Renders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.componentRenders?.length || 0}
          </div>
          <div className="text-sm text-gray-500">
            Active components
          </div>
        </CardContent>
      </Card>

      {/* Performance Score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Load Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Math.round(metrics.performanceBaseline?.initialLoadTime || 0)}ms
          </div>
          <div className="text-sm text-gray-500">
            Initial load time
          </div>
        </CardContent>
      </Card>

      {/* Bundle Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Bundle Size</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Math.round(metrics.bundleInfo?.totalSize || 0)}KB
          </div>
          <div className="text-sm text-gray-500">
            Total bundle size
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full"
            onClick={() => {
              const debugCenter = DebugCommandCenter.getInstance();
              debugCenter.startProfiling();
            }}
          >
            Start Profiling
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full"
            onClick={() => {
              const debugCenter = DebugCommandCenter.getInstance();
              console.log(debugCenter.generateDebugReport());
            }}
          >
            Generate Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Components Panel
 */
const ComponentsPanel: React.FC<{ components: ComponentMetric[] }> = ({ components }) => {
  const sortedComponents = [...components].sort((a, b) => b.renderCount - a.renderCount);
  const slowComponents = components.filter(c => c.averageRenderTime > 16);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Components</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{components.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Slow Components</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{slowComponents.length}</div>
            <div className="text-sm text-gray-500">&gt;16ms render time</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Renders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {components.reduce((sum, c) => sum + c.renderCount, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Components Table */}
      <Card>
        <CardHeader>
          <CardTitle>Component Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Component</th>
                  <th className="text-right p-2">Renders</th>
                  <th className="text-right p-2">Avg Time</th>
                  <th className="text-right p-2">Last Time</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedComponents.slice(0, 10).map((component, index) => (
                  <tr key={component.name} className="border-b">
                    <td className="p-2 font-medium">{component.name}</td>
                    <td className="p-2 text-right">{component.renderCount}</td>
                    <td className="p-2 text-right">{component.averageRenderTime.toFixed(2)}ms</td>
                    <td className="p-2 text-right">{component.lastRenderTime.toFixed(2)}ms</td>
                    <td className="p-2 text-center">
                      {component.averageRenderTime > 16 ? (
                        <Badge variant="destructive">Slow</Badge>
                      ) : component.averageRenderTime > 8 ? (
                        <Badge variant="secondary">OK</Badge>
                      ) : (
                        <Badge variant="default">Fast</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Performance Panel
 */
const PerformancePanel: React.FC<{ performance: PerformanceMetrics }> = ({ performance }) => {
  const getScoreColor = (value: number, thresholds: { good: number; ok: number }) => {
    if (value <= thresholds.good) return 'text-green-500';
    if (value <= thresholds.ok) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Core Web Vitals */}
        <Card>
          <CardHeader>
            <CardTitle>Core Web Vitals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>First Contentful Paint</span>
              <span className={getScoreColor(performance?.firstContentfulPaint || 0, { good: 1800, ok: 3000 })}>
                {Math.round(performance?.firstContentfulPaint || 0)}ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Largest Contentful Paint</span>
              <span className={getScoreColor(performance?.largestContentfulPaint || 0, { good: 2500, ok: 4000 })}>
                {Math.round(performance?.largestContentfulPaint || 0)}ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Time to Interactive</span>
              <span className={getScoreColor(performance?.timeToInteractive || 0, { good: 3800, ok: 7300 })}>
                {Math.round(performance?.timeToInteractive || 0)}ms
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Load Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Load Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Initial Load Time</span>
              <span className={getScoreColor(performance?.initialLoadTime || 0, { good: 2000, ok: 4000 })}>
                {Math.round(performance?.initialLoadTime || 0)}ms
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Baseline established: {performance?.timestamp ? new Date(performance.timestamp).toLocaleString() : 'Not set'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(performance?.initialLoadTime || 0) > 3000 && (
              <div className="flex items-center gap-2 text-yellow-600">
                <span>⚠️</span>
                <span>Consider code splitting to reduce initial load time</span>
              </div>
            )}
            {(performance?.largestContentfulPaint || 0) > 4000 && (
              <div className="flex items-center gap-2 text-red-600">
                <span>🚨</span>
                <span>Largest Contentful Paint is too slow - optimize critical resources</span>
              </div>
            )}
            {(performance?.firstContentfulPaint || 0) > 3000 && (
              <div className="flex items-center gap-2 text-yellow-600">
                <span>⚠️</span>
                <span>First Contentful Paint could be improved</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Memory Panel
 */
const MemoryPanel: React.FC<{ memory: MemoryMetrics }> = ({ memory }) => {
  const getMemoryStatus = () => {
    if (memory?.percentage > 80) return { status: 'Critical', color: 'text-red-500' };
    if (memory?.percentage > 60) return { status: 'Warning', color: 'text-yellow-500' };
    return { status: 'Good', color: 'text-green-500' };
  };

  const status = getMemoryStatus();

  return (
    <div className="space-y-4">
      {/* Memory Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Memory Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used: {memory?.used || 0}MB</span>
                <span>Total: {memory?.total || 0}MB</span>
              </div>
              <Progress value={memory?.percentage || 0} />
              <div className="text-center text-sm">
                <span className={status.color}>{memory?.percentage || 0}% - {status.status}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Memory Limit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memory?.limit || 0}MB</div>
            <div className="text-sm text-gray-500">JavaScript heap limit</div>
          </CardContent>
        </Card>
      </div>

      {/* Memory Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Memory Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(memory?.percentage || 0) > 80 && (
              <div className="flex items-center gap-2 text-red-600">
                <span>🚨</span>
                <span>Critical memory usage - consider clearing caches or reducing memory footprint</span>
              </div>
            )}
            {(memory?.percentage || 0) > 60 && (
              <div className="flex items-center gap-2 text-yellow-600">
                <span>⚠️</span>
                <span>High memory usage - monitor for potential memory leaks</span>
              </div>
            )}
            {(memory?.percentage || 0) <= 60 && (
              <div className="flex items-center gap-2 text-green-600">
                <span>✅</span>
                <span>Memory usage is within acceptable limits</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugDashboard;
