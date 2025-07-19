import { log } from '@/utils/logger';
/**
 * 🚨 Debug Page - Phase 4A Error Tracking Demo
 * 
 * This page demonstrates how to integrate and use the Error Analytics Dashboard
 * in your application. You can access this page at /debug
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bug, Zap, Activity, TestTube } from 'lucide-react';
// import ErrorAnalyticsDashboard from '@/components/debug/ErrorAnalyticsDashboard';
import { GlobalErrorBoundary, SpaceErrorBoundary, ComponentErrorBoundary } from '@/components/error/ErrorBoundary';
import { Phase3TestingDashboard } from '@/components/debug/Phase3TestingDashboard';

const DebugPage: React.FC = () => {
  // Test functions for demonstrating error tracking
  const triggerJavaScriptError = () => {
    // This will be caught by the global error handler
    throw new Error('Test JavaScript Error - This is intentional for testing!');
  };

  const triggerNetworkError = async () => {
    try {
      // This will trigger network error tracking
      await fetch('/api/nonexistent-endpoint');
    } catch (error) {
      log.debug('Page', 'Network error triggered (this is expected)');
    }
  };

  const triggerPerformanceError = () => {
    // Simulate a long-running task
    const start = performance.now();
    while (performance.now() - start < 100) {
      // Busy wait to create a long task
    }
    log.debug('Page', 'Long task completed (this may trigger performance error tracking)');
  };

  const BuggyComponent = () => {
    const [shouldError, setShouldError] = React.useState(false);
    
    if (shouldError) {
      throw new Error('Test React Component Error - This is intentional!');
    }
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bug className="h-5 w-5 mr-2" />
            React Error Boundary Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This component is wrapped in an error boundary. Click the button to trigger a React error.
          </p>
          <Button 
            onClick={() => setShouldError(true)} 
            variant="destructive"
            size="sm"
          >
            Trigger React Error
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <GlobalErrorBoundary>
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">🚨 Phase 4A Error Tracking Demo</h1>
          <p className="text-muted-foreground">
            Test and explore the comprehensive error tracking system
          </p>
        </div>

        {/* Quick Test Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2" />
              Quick Error Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                             <Button 
                 onClick={() => (window as any).phase4a?.testError()} 
                 variant="outline"
                 className="h-auto p-4 flex flex-col items-center"
               >
                 <Bug className="h-6 w-6 mb-2" />
                 <span className="text-sm">Basic Test</span>
               </Button>
               
               <Button 
                 onClick={() => (window as any).phase4aTest?.testErrorTypes()} 
                 variant="outline"
                 className="h-auto p-4 flex flex-col items-center"
               >
                 <Activity className="h-6 w-6 mb-2" />
                 <span className="text-sm">All Types</span>
               </Button>
               
               <Button 
                 onClick={() => (window as any).phase4aTest?.testSeverityLevels()} 
                 variant="outline"
                 className="h-auto p-4 flex flex-col items-center"
               >
                 <AlertTriangle className="h-6 w-6 mb-2" />
                 <span className="text-sm">Severity Test</span>
               </Button>
               
               <Button 
                 onClick={() => (window as any).phase4aTest?.testCriticalError()} 
                 variant="destructive"
                 className="h-auto p-4 flex flex-col items-center"
               >
                 <AlertTriangle className="h-6 w-6 mb-2" />
                 <span className="text-sm">Critical Error</span>
               </Button>
            </div>
          </CardContent>
        </Card>

        {/* Manual Error Triggers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">JavaScript Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Triggers a JavaScript error that will be caught by the global error handler.
              </p>
              <Button onClick={triggerJavaScriptError} variant="destructive" size="sm">
                Trigger JS Error
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Network Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Makes a request to a non-existent endpoint to trigger network error tracking.
              </p>
              <Button onClick={triggerNetworkError} variant="destructive" size="sm">
                Trigger Network Error
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Performance Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Creates a long-running task that may trigger performance error detection.
              </p>
              <Button onClick={triggerPerformanceError} variant="destructive" size="sm">
                Trigger Long Task
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* React Error Boundary Demo */}
        <ComponentErrorBoundary componentName="BuggyComponent">
          <BuggyComponent />
        </ComponentErrorBoundary>

        {/* Phase 3 Testing Dashboard */}
        <div className="mt-12">
          <div className="flex items-center mb-6">
            <TestTube className="h-6 w-6 mr-2" />
            <h2 className="text-2xl font-bold">Phase 3 Performance Testing</h2>
          </div>
          <Phase3TestingDashboard />
        </div>

        {/* Console Commands Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Console Commands Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Basic Testing:</h4>
                <div className="bg-muted p-3 rounded font-mono text-sm space-y-1">
                  <div>window.phase4a.testError()</div>
                  <div>window.phase4aTest.testErrorTypes()</div>
                  <div>window.phase4aTest.testSeverityLevels()</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">View Data:</h4>
                <div className="bg-muted p-3 rounded font-mono text-sm space-y-1">
                  <div>window.errorTracker.getMetrics()</div>
                  <div>window.errorTracker.getErrors()</div>
                  <div>window.phase4aTest.getTestResults()</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Dashboard Control:</h4>
                <div className="bg-muted p-3 rounded font-mono text-sm space-y-1">
                  <div>window.phase4a.showDashboard()</div>
                  <div>window.errorTracker.exportData()</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

                 {/* Error Analytics Dashboard Info */}
         <Card>
           <CardHeader>
             <CardTitle>Error Analytics Dashboard</CardTitle>
             <p className="text-sm text-muted-foreground">
               The error dashboard is available as a floating button in the bottom-right corner of your app!
             </p>
           </CardHeader>
           <CardContent>
             <div className="text-center py-8">
               <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
               <p className="text-muted-foreground mb-4">
                 Look for the <strong>🚨 Error Dashboard</strong> button in the bottom-right corner
               </p>
               <Button 
                 onClick={() => (window as any).phase4a?.showDashboard()} 
                 variant="outline"
               >
                 Show Dashboard Instructions
               </Button>
             </div>
           </CardContent>
         </Card>
      </div>
    </GlobalErrorBoundary>
  );
};

export default DebugPage; 