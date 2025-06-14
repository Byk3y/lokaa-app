import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDisplaySpaceContext, clearSpaceContext, getBackToSpaceUrl, shouldShowSpaceContext, type SpaceContext } from '@/utils/spaceContextUtils';

interface SpaceContextBannerProps {
  className?: string;
}

export const SpaceContextBanner: React.FC<SpaceContextBannerProps> = ({ className = '' }) => {
  const [spaceContext, setSpaceContext] = useState<SpaceContext | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const context = getDisplaySpaceContext();
    const shouldShow = shouldShowSpaceContext();
    
    if (shouldShow && context && context.subdomain) {
      setSpaceContext(context);
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, []);

  const handleBackToSpace = () => {
    const backUrl = getBackToSpaceUrl();
    if (backUrl) {
      navigate(backUrl);
    }
  };

  const handleDismiss = () => {
    clearSpaceContext();
    setIsVisible(false);
  };

  if (!isVisible || !spaceContext) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200/50 rounded-lg p-4 mb-6 shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
          <div>
            <p className="text-sm text-gray-700">
              Viewing from <span className="font-semibold text-teal-700">{spaceContext.name || spaceContext.subdomain}</span>
            </p>
            <p className="text-xs text-gray-500">You navigated here from a space</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleBackToSpace}
            variant="outline"
            size="sm"
            className="text-teal-700 border-teal-300 hover:bg-teal-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Space
          </Button>
          
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SpaceContextBanner; 