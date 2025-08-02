import React, { memo } from "react";
import { Globe, Lock, Users } from "lucide-react";

interface SpaceStatsDisplayProps {
  /** Whether the space is private */
  isPrivate: boolean;
  /** Member counts from the member counts hook */
  memberCounts: {
    totalMembers: number;
    adminMembers: number;
  };
  /** Pricing information */
  pricing: {
    type: string;
    pricePerMonth?: number;
  };
}

export const SpaceStatsDisplay = memo(function SpaceStatsDisplay({
  isPrivate,
  memberCounts,
  pricing
}: SpaceStatsDisplayProps) {
  
  // Format pricing display
  const getPricingDisplay = () => {
    if (pricing.type === 'free') {
      return 'Free to Join';
    } else if (pricing.type === 'paid' && pricing.pricePerMonth) {
      return `$${pricing.pricePerMonth}/month`;
    } else {
      return 'Free to Join'; // fallback
    }
  };

  return (
    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 mb-4">
      {isPrivate ? (
        <Lock className="h-5 w-5" />
      ) : (
        <Globe className="h-5 w-5" />
      )}
      <span className="font-medium">
        {isPrivate ? 'Private Space' : 'Public Space'}
      </span>
      <span className="mx-2">•</span>
      <Users className="h-4 w-4" />
      <span>{memberCounts.totalMembers} members</span>
      <span className="mx-2">•</span>
      <span>{getPricingDisplay()}</span>
    </div>
  );
});

export default SpaceStatsDisplay;