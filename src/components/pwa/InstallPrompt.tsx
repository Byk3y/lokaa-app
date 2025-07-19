import { log } from '@/utils/logger';
/**
 * 📱 Install Prompt Component - Phase 6A PWA
 * 
 * Reusable component for PWA installation prompts
 * Can be used in multiple locations throughout the app
 */

import React from 'react';
import { useInstallPrompt } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Monitor, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface InstallPromptProps {
  variant?: 'banner' | 'card' | 'button';
  className?: string;
  showBenefits?: boolean;
  onInstallAttempt?: () => void;
  onDismiss?: () => void;
}

const InstallPrompt: React.FC<InstallPromptProps> = ({
  variant = 'banner',
  className = '',
  showBenefits = true,
  onInstallAttempt,
  onDismiss
}) => {
  const { canInstall, isInstalled, showPrompt, dismissPrompt } = useInstallPrompt();

  // Don't show if can't install or already installed
  if (!canInstall || isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    try {
      onInstallAttempt?.();
      const success = await showPrompt();
      
      if (success) {
        toast({
          title: "Installation Started",
          description: "Lokaa Spaces is being installed on your device",
          variant: "default"
        });
      }
    } catch (error) {
      log.error('Component', 'Install failed:', error);
      toast({
        title: "Installation Failed",
        description: "Unable to install the app. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDismiss = () => {
    onDismiss?.();
    dismissPrompt();
  };

  const benefits = [
    {
      icon: Zap,
      title: "Faster Loading",
      description: "Lightning-fast performance with offline caching"
    },
    {
      icon: Smartphone,
      title: "Mobile Experience",
      description: "Native app-like experience on your phone"
    },
    {
      icon: Monitor,
      title: "Desktop Access",
      description: "Quick access from your desktop or taskbar"
    }
  ];

  if (variant === 'button') {
    return (
      <Button
        onClick={handleInstall}
        className={`bg-teal-600 hover:bg-teal-700 text-white ${className}`}
      >
        <Download className="h-4 w-4 mr-2" />
        Install App
      </Button>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={`max-w-md ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-teal-600" />
            Install Lokaa Spaces
          </CardTitle>
          <CardDescription>
            Get the full experience with our Progressive Web App
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showBenefits && (
            <div className="grid gap-3">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className="p-2 bg-teal-100 rounded-lg">
                      <Icon className="h-4 w-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{benefit.title}</p>
                      <p className="text-xs text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="flex gap-2">
            <Button onClick={handleInstall} className="flex-1 bg-teal-600 hover:bg-teal-700">
              <Download className="h-4 w-4 mr-2" />
              Install Now
            </Button>
            <Button variant="outline" onClick={handleDismiss}>
              Maybe Later
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default banner variant
  return (
    <Alert className={`bg-teal-50 border-teal-200 ${className}`}>
      <Download className="h-4 w-4 text-teal-600" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-3">
            <p className="font-medium text-teal-800">Install Lokaa Spaces</p>
            <p className="text-sm text-teal-600">
              Get faster loading, offline access, and native app experience
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleInstall}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Install
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-teal-600 hover:bg-teal-100"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default InstallPrompt; 