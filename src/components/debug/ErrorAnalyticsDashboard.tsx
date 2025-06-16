/**
 * 🚨 Phase 4A: Error Analytics Dashboard
 * 
 * Real-time error monitoring and analytics dashboard with:
 * - Live error metrics and statistics
 * - Error filtering and search
 * - Detailed error inspection
 * - Export functionality
 * - Floating button interface
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Bug, 
  Activity, 
  Download, 
  RefreshCw, 
  Search,
  X,
  Minimize2,
  Maximize2,
  Filter
} from 'lucide-react';

// Import error tracking types
import type { ErrorReport, ErrorMetrics } from '@/utils/errorTrackingSystem';

interface ErrorAnalyticsDashboardProps {
  isFloating?: boolean;
  onClose?: () => void;
}

const ErrorAnalyticsDashboard: React.FC<ErrorAnalyticsDashboardProps> = ({ 
  isFloating = false, 
  onClose 
}) => {
  const [metrics, setMetrics] = useState<ErrorMetrics | null>(null);
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [filteredErrors, setFilteredErrors] = useState<ErrorReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedError, setSelectedError] = useState<ErrorReport | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  // Fetch error data
  const fetchErrorData = useCallback(() => {
    try {
      const errorTracker = (window as any).errorTracker;
      if (errorTracker) {
        const newMetrics = errorTracker.getMetrics();
        const newErrors = errorTracker.getErrors();
        
        setMetrics(newMetrics);
        setErrors(newErrors);
      }
    } catch (error) {
      console.error('Failed to fetch error data:', error);
    }
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    fetchErrorData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchErrorData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [fetchErrorData, autoRefresh]);

  // Filter errors based on search and filters
  useEffect(() => {
    let filtered = errors;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(error => 
        error.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        error.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(error => error.type === typeFilter);
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(error => error.severity.level === severityFilter);
    }

    setFilteredErrors(filtered);
  }, [errors, searchTerm, typeFilter, severityFilter]);

  // Export error data
  const exportErrorData = () => {
    const data = {
      metrics,
      errors,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Bug className="h-4 w-4" />;
      case 'low': return <Activity className="h-4 w-4" />;
      default: return <Bug className="h-4 w-4" />;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Render metrics overview
  const renderMetricsOverview = () => (
    <div className={`grid gap-3 mb-4 ${isFloating ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
      <Card>
        <CardContent className={`${isFloating ? 'p-3' : 'p-4'}`}>
          <div className="flex items-center space-x-2">
            <Bug className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-xs font-medium">Total Errors</p>
              <p className={`${isFloating ? 'text-lg' : 'text-2xl'} font-bold`}>{metrics?.totalErrors || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className={`${isFloating ? 'p-3' : 'p-4'}`}>
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-xs font-medium">Error Rate</p>
              <p className={`${isFloating ? 'text-lg' : 'text-2xl'} font-bold`}>{metrics?.errorRate?.toFixed(2) || 0}/hr</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className={`${isFloating ? 'p-3' : 'p-4'}`}>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <div>
              <p className="text-xs font-medium">Critical</p>
              <p className={`${isFloating ? 'text-lg' : 'text-2xl'} font-bold`}>{metrics?.errorsBySeverity?.critical || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className={`${isFloating ? 'p-3' : 'p-4'}`}>
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-xs font-medium">Recent</p>
              <p className={`${isFloating ? 'text-lg' : 'text-2xl'} font-bold`}>{metrics?.recentErrors?.length || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render error list
  const renderErrorList = () => (
    <div className="space-y-2">
      {filteredErrors.map((error) => (
        <Card key={error.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelectedError(error)}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  {getSeverityIcon(error.severity.level)}
                  <Badge variant={getSeverityColor(error.severity.level) as any}>
                    {error.severity.level.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">{error.type}</Badge>
                  {error.count > 1 && (
                    <Badge variant="secondary">{error.count}x</Badge>
                  )}
                </div>
                <p className="font-medium text-sm mb-1">{error.message}</p>
                <p className="text-xs text-muted-foreground">
                  {formatTimestamp(error.lastSeen)} • {error.context.route}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {filteredErrors.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Bug className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No errors found matching your filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Render filters
  const renderFilters = () => (
    <div className={`flex flex-col gap-3 ${isFloating ? 'mb-4' : 'mb-6'}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search errors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`pl-10 ${isFloating ? 'h-8 text-sm' : ''}`}
        />
      </div>
      
      <div className={`flex gap-2 ${isFloating ? 'flex-col' : 'flex-row'}`}>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className={`${isFloating ? 'h-8 text-sm' : 'w-full sm:w-[180px]'}`}>
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="javascript">JavaScript</SelectItem>
            <SelectItem value="react">React</SelectItem>
            <SelectItem value="network">Network</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className={`${isFloating ? 'h-8 text-sm' : 'w-full sm:w-[180px]'}`}>
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // Main dashboard content
  const dashboardContent = (
    <div className={`${isFloating ? 'h-full' : ''}`}>
      {!isFloating && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <h2 className="text-2xl font-bold">Error Analytics</h2>
            {autoRefresh && (
              <Badge variant="outline" className="animate-pulse">
                Live
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button variant="outline" size="sm" onClick={exportErrorData}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {isFloating && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="h-7 px-2"
            >
              <RefreshCw className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={exportErrorData}
              className="h-7 px-2"
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {!isMinimized && (
        <>
          {renderMetricsOverview()}
          {renderFilters()}
          
          <Tabs defaultValue="errors" className="w-full">
            <TabsList className={`grid w-full grid-cols-2 ${isFloating ? 'h-8' : ''}`}>
              <TabsTrigger value="errors" className={isFloating ? 'text-xs' : ''}>Error List</TabsTrigger>
              <TabsTrigger value="analytics" className={isFloating ? 'text-xs' : ''}>Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="errors" className={isFloating ? 'mt-3' : 'mt-6'}>
              <ScrollArea className={`${isFloating ? 'h-64' : 'h-[600px]'}`}>
                {renderErrorList()}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="analytics" className={isFloating ? 'mt-3' : 'mt-6'}>
              <div className={`grid gap-4 ${isFloating ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                <Card>
                  <CardHeader className={isFloating ? 'p-3' : ''}>
                    <CardTitle className={isFloating ? 'text-sm' : ''}>Errors by Type</CardTitle>
                  </CardHeader>
                  <CardContent className={isFloating ? 'p-3 pt-0' : ''}>
                    <div className="space-y-2">
                      {Object.entries(metrics?.errorsByType || {}).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center">
                          <span className={`capitalize ${isFloating ? 'text-xs' : ''}`}>{type}</span>
                          <Badge variant="outline" className={isFloating ? 'text-xs' : ''}>{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className={isFloating ? 'p-3' : ''}>
                    <CardTitle className={isFloating ? 'text-sm' : ''}>Errors by Severity</CardTitle>
                  </CardHeader>
                  <CardContent className={isFloating ? 'p-3 pt-0' : ''}>
                    <div className="space-y-2">
                      {Object.entries(metrics?.errorsBySeverity || {}).map(([severity, count]) => (
                        <div key={severity} className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            {getSeverityIcon(severity)}
                            <span className={`capitalize ${isFloating ? 'text-xs' : ''}`}>{severity}</span>
                          </div>
                          <Badge variant={getSeverityColor(severity) as any} className={isFloating ? 'text-xs' : ''}>{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Error Detail Modal */}
      {selectedError && (
        <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] w-[95vw] sm:w-[90vw] flex flex-col overflow-hidden z-[10050]">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center space-x-2">
                {getSeverityIcon(selectedError.severity.level)}
                <span>Error Details</span>
                <Badge variant={getSeverityColor(selectedError.severity.level) as any}>
                  {selectedError.severity.level.toUpperCase()}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div>
                <h4 className="font-semibold mb-2">Message</h4>
                <div className="text-sm bg-muted p-3 rounded break-words">
                  {selectedError.message}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Type</h4>
                  <Badge variant="outline">{selectedError.type}</Badge>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Count</h4>
                  <Badge variant="secondary">{selectedError.count}x</Badge>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Timeline</h4>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">First seen:</span> {formatTimestamp(selectedError.firstSeen)}</p>
                  <p><span className="font-medium">Last seen:</span> {formatTimestamp(selectedError.lastSeen)}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Context</h4>
                <div className="text-sm space-y-1 bg-muted/50 p-3 rounded">
                  <p><span className="font-medium">Route:</span> {selectedError.context.route}</p>
                  <p><span className="font-medium">Session:</span> <code className="text-xs bg-background px-1 rounded">{selectedError.context.sessionId}</code></p>
                  {selectedError.context.userId && (
                    <p><span className="font-medium">User:</span> {selectedError.context.userId}</p>
                  )}
                  {selectedError.context.spaceId && (
                    <p><span className="font-medium">Space:</span> {selectedError.context.spaceId}</p>
                  )}
                  <p><span className="font-medium">User Agent:</span> <span className="text-xs">{selectedError.context.userAgent}</span></p>
                  {selectedError.context.performanceMetrics && (
                    <div className="mt-2">
                      <span className="font-medium">Performance:</span>
                      <div className="ml-2 text-xs">
                        <p>Memory: {(selectedError.context.performanceMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</p>
                        <p>Long Tasks: {selectedError.context.performanceMetrics.longTasks}ms</p>
                        <p>Render Time: {selectedError.context.performanceMetrics.renderTime}ms</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedError.context.stackTrace && (
                <div>
                  <h4 className="font-semibold mb-2">Stack Trace</h4>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                    {selectedError.context.stackTrace}
                  </pre>
                </div>
              )}
              
              {selectedError.context.componentStack && (
                <div>
                  <h4 className="font-semibold mb-2">Component Stack</h4>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                    {selectedError.context.componentStack}
                  </pre>
                </div>
              )}
              

            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );

  // Floating dashboard
  if (isFloating) {
    return (
      <div className="fixed bottom-16 right-4 w-[min(90vw,400px)] max-h-[85vh] bg-background border rounded-lg shadow-xl z-[9999] overflow-hidden sm:bottom-16 sm:right-4 max-sm:bottom-20 max-sm:right-2 max-sm:left-2 max-sm:w-auto">
        <div className="flex items-center justify-between p-3 border-b bg-muted/50">
          <div className="flex items-center space-x-2">
            <Bug className="h-4 w-4" />
            <span className="font-semibold text-sm">Error Analytics</span>
            {autoRefresh && (
              <Badge variant="outline" className="text-xs">Live</Badge>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-6 w-6 p-0"
            >
              {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        {!isMinimized && (
          <div className="p-4 overflow-y-auto max-h-[calc(85vh-60px)]">
            {dashboardContent}
          </div>
        )}
        
        {isMinimized && (
          <div className="p-3">
            <div className="flex items-center justify-between text-sm">
              <span>Total Errors: {metrics?.totalErrors || 0}</span>
              <span>Critical: {metrics?.errorsBySeverity?.critical || 0}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Regular dashboard
  return (
    <div className="container mx-auto p-6">
      {dashboardContent}
    </div>
  );
};

// Floating Error Dashboard Button Component
export const FloatingErrorDashboard: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  // Update error count periodically
  useEffect(() => {
    const updateErrorCount = () => {
      try {
        const errorTracker = (window as any).errorTracker;
        if (errorTracker) {
          const metrics = errorTracker.getMetrics();
          setErrorCount(metrics.totalErrors || 0);
        }
      } catch (error) {
        console.error('Failed to fetch error count:', error);
      }
    };

    updateErrorCount();
    const interval = setInterval(updateErrorCount, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Floating Button */}
      <Button
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-[9998] hover:scale-105 transition-transform"
        variant={errorCount > 0 ? "destructive" : "secondary"}
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        title={`Error Analytics Dashboard - ${errorCount} errors`}
      >
        <div className="relative">
          <Bug className="h-5 w-5" />
          {errorCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center min-w-[20px]"
              variant="destructive"
            >
              {errorCount > 99 ? '99+' : errorCount}
            </Badge>
          )}
        </div>
      </Button>

      {/* Floating Dashboard */}
      {isOpen && (
        <ErrorAnalyticsDashboard 
          isFloating={true} 
          onClose={() => setIsOpen(false)} 
        />
      )}
    </>
  );
};

export default ErrorAnalyticsDashboard; 