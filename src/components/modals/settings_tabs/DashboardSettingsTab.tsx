import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Users, DollarSign, Calendar, BarChart3 } from 'lucide-react';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { useSimpleMemberCounts } from '@/hooks/useSimpleMemberCounts';

export default function DashboardSettingsTab() {
  const { space } = useSpaceSettingsStore();
  const { totalMembers, onlineMembers, loading: countsLoading } = useSimpleMemberCounts(space?.id || '');

  // Mock data - in real implementation, these would come from analytics APIs
  const mockData = {
    subscriptions: {
      paidMembers: 0,
      mrr: 0,
      churnRate: 0.00
    },
    traffic: {
      aboutPageVisitors: 0,
      signups: 1,
      conversionRate: 0.00
    },
    other: {
      oneTimeSales: 0,
      trialsInProgress: 0,
      trialConversionRate: 0.00
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(2)}%`;
  };

  if (!space) {
    return (
      <div className="p-6 text-center text-gray-500">
        No space data available.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            🎉 Happy Saturday, {space.owner_id ? 'Admin' : 'Owner'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Last updated just now
          </p>
        </div>
        <Button variant="outline" size="sm" className="flex items-center gap-1 text-xs">
          <RefreshCw className="w-3 h-3" />
          Refresh
        </Button>
      </div>

      {/* Subscriptions Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Subscriptions
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gray-50 dark:bg-gray-800 border-0">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {mockData.subscriptions.paidMembers}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Paid members
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 dark:bg-gray-800 border-0">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {formatCurrency(mockData.subscriptions.mrr)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                MRR
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 dark:bg-gray-800 border-0">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {formatPercentage(mockData.subscriptions.churnRate)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Churn (last 30d)
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Traffic Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Traffic (last 7-days)
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gray-50 dark:bg-gray-800 border-0">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {mockData.traffic.aboutPageVisitors}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                About page visitors
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 dark:bg-gray-800 border-0">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {mockData.traffic.signups}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Signups
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 dark:bg-gray-800 border-0">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {formatPercentage(mockData.traffic.conversionRate)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Conversion rate
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Other Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Other
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gray-50 dark:bg-gray-800 border-0">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {formatCurrency(mockData.other.oneTimeSales)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                1-time sales
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 dark:bg-gray-800 border-0">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {mockData.other.trialsInProgress}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Trials in progress
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 dark:bg-gray-800 border-0">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {formatPercentage(mockData.other.trialConversionRate)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Trial conversion rate
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}