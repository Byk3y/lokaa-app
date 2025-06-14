/**
 * Paywall Modal Component
 * 
 * Shows when users try to access paid content without having paid access.
 * Includes upgrade prompts and trial offers.
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Crown, Clock, CreditCard, X } from 'lucide-react';
import { DevPaymentSimulator } from '@/utils/devPaymentSimulator';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { toast } from '@/hooks/use-toast';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  spaceName: string;
  pricePerMonth: number;
  hasTrialEnabled?: boolean;
  trialDays?: number;
  onSubscribe?: () => void;
  onStartTrial?: () => void;
}

export default function PaywallModal({
  isOpen,
  onClose,
  spaceId,
  spaceName,
  pricePerMonth,
  hasTrialEnabled = false,
  trialDays = 7,
  onSubscribe,
  onStartTrial
}: PaywallModalProps) {
  const { user } = useOptimizedAuth();
  const isDev = import.meta.env.DEV || import.meta.env.VITE_NODE_ENV === 'development';

  const handleDevStartTrial = async () => {
    if (!user || !isDev) return;
    
    const success = await DevPaymentSimulator.startTrial(user.id, spaceId, trialDays);
    if (success) {
      onClose();
      if (onStartTrial) onStartTrial();
    }
  };

  const handleDevSubscribe = async () => {
    if (!user || !isDev) return;
    
    const success = await DevPaymentSimulator.grantPaidAccess(user.id, spaceId);
    if (success) {
      onClose();
      if (onSubscribe) onSubscribe();
    }
  };

  const handleRealPayment = () => {
    toast({
      title: "Payment Processing Coming Soon",
      description: "Full payment integration will be available soon. Use the development tools for testing.",
      variant: "default"
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-600" />
              <DialogTitle>Upgrade to Premium</DialogTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Get full access to <strong>{spaceName}</strong> and all its premium features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pricing Card */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">
                  ${pricePerMonth}
                  <span className="text-sm font-normal text-blue-600">/month</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">Full access to all premium content</p>
              </div>
            </CardContent>
          </Card>

          {/* Benefits List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">What you get:</h4>
            <div className="space-y-1">
              {[
                'Access to all posts and discussions',
                'Participate in community events',
                'Join exclusive member channels',
                'Priority support from creators',
                'Download exclusive resources'
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  {benefit}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {hasTrialEnabled && (
              <Button
                onClick={isDev ? handleDevStartTrial : handleRealPayment}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <Clock className="h-4 w-4 mr-2" />
                Start {trialDays}-Day Free Trial
              </Button>
            )}
            
            <Button
              onClick={isDev ? handleDevSubscribe : handleRealPayment}
              variant={hasTrialEnabled ? "outline" : "default"}
              className={`w-full ${!hasTrialEnabled ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              size="lg"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Subscribe Now
            </Button>
          </div>

          {/* Development Mode Alert */}
          {isDev && (
            <Alert className="border-yellow-300 bg-yellow-50">
              <AlertDescription className="text-xs text-yellow-800">
                🧪 <strong>Development Mode:</strong> Buttons above simulate payment actions for testing. 
                Real payment processing is not yet implemented.
              </AlertDescription>
            </Alert>
          )}

          {/* Footer */}
          <div className="text-center pt-2">
            <p className="text-xs text-gray-500">
              Cancel anytime. No questions asked.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function usePaywall() {
  const [isPaywallOpen, setIsPaywallOpen] = React.useState(false);
  const [paywallConfig, setPaywallConfig] = React.useState<Omit<PaywallModalProps, 'isOpen' | 'onClose'> | null>(null);

  const showPaywall = React.useCallback((config: Omit<PaywallModalProps, 'isOpen' | 'onClose'>) => {
    setPaywallConfig(config);
    setIsPaywallOpen(true);
  }, []);

  const hidePaywall = React.useCallback(() => {
    setIsPaywallOpen(false);
    setPaywallConfig(null);
  }, []);

  const PaywallComponent = React.useMemo(() => {
    if (!paywallConfig) return null;
    
    return (
      <PaywallModal
        {...paywallConfig}
        isOpen={isPaywallOpen}
        onClose={hidePaywall}
      />
    );
  }, [paywallConfig, isPaywallOpen, hidePaywall]);

  return {
    showPaywall,
    hidePaywall,
    PaywallComponent,
    isPaywallOpen
  };
} 