import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlayCircle, CheckCircle, XCircle, Monitor, RefreshCw, Zap, AlertTriangle } from 'lucide-react';

export const Phase3TestingDashboard: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [systemStatus, setSystemStatus] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = () => {
    try {
      const testingFramework = (window as any).phase3TestingFramework;
      if (testingFramework) {
        const status = testingFramework.validateAllSystems();
        setSystemStatus(status);
      } else {
        setError('Testing framework not loaded');
      }
    } catch (err) {
      setError(`Failed to check system status: ${err}`);
    }
  };

  const runQuickTest = async () => {
    setIsRunning(true);
    setError(null);
    
    try {
      const testingFramework = (window as any).phase3TestingFramework;
      if (!testingFramework) {
        throw new Error('Testing framework not available');
      }
      
      const results = await testingFramework.quickTest();
      setTestResults(results);
    } catch (err) {
      setError(`Quick test failed: ${err}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getSystemStatusBadge = (system: string, status: boolean) => {
    return (
      <Badge variant={status ? "default" : "destructive"} className="ml-2">
        {status ? "✅ Loaded" : "❌ Missing"}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Phase 3 Testing Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive testing for Phase 3 performance systems
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runQuickTest} 
            disabled={isRunning}
            variant="outline"
          >
            {isRunning ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Quick Test
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Monitor className="h-5 w-5 mr-2" />
            System Status
          </CardTitle>
          <CardDescription>
            Current status of all Phase 3 performance systems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center justify-between">
              <span>Performance Optimizer</span>
              {getSystemStatusBadge('performanceOptimizer', systemStatus.performanceOptimizer)}
            </div>
            <div className="flex items-center justify-between">
              <span>Cache Strategy</span>
              {getSystemStatusBadge('cacheStrategy', systemStatus.cacheStrategy)}
            </div>
            <div className="flex items-center justify-between">
              <span>Render Optimizer</span>
              {getSystemStatusBadge('renderOptimizer', systemStatus.renderOptimizer)}
            </div>
            <div className="flex items-center justify-between">
              <span>Testing Framework</span>
              {getSystemStatusBadge('testingFramework', systemStatus.testingFramework)}
            </div>
          </div>
        </CardContent>
      </Card>

      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Latest test execution results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Pass Rate:</span>
                <Badge variant="default">
                  {(testResults.passRate * 100).toFixed(1)}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Tests:</span>
                <Badge variant="outline">
                  {testResults.tests?.length || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Duration:</span>
                <Badge variant="outline">
                  {testResults.totalDuration?.toFixed(2)}ms
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!testResults && !isRunning && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PlayCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Test Results</h3>
            <p className="text-muted-foreground text-center mb-4">
              Run tests to see comprehensive results and performance metrics
            </p>
            <Button onClick={runQuickTest}>
              <Zap className="h-4 w-4 mr-2" />
              Run Quick Test
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
