import React, { memo } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";

interface SpaceSettingsAccessProps {
  /** Space data for settings access */
  spaceData: {
    id: string;
    subdomain: string;
  };
  /** Whether user can access settings */
  canAccessSettings: boolean;
}

export const SpaceSettingsAccess = memo(function SpaceSettingsAccess({
  spaceData,
  canAccessSettings
}: SpaceSettingsAccessProps) {
  const { user } = useOptimizedAuth();

  // Settings button handler
  const handleOpenSettings = () => {
    if (spaceData && user?.id) {
      const storeActions = useSpaceSettingsStore.getState();
      storeActions.loadActiveSpace(
        { subdomain: spaceData.subdomain, spaceId: spaceData.id }, 
        user.id, 
        true
      ).then(() => {
        const storeActions = useSpaceSettingsStore.getState();
        storeActions.openModal();
      });
    }
  };

  // Only render if user can access settings
  if (!canAccessSettings) {
    return null;
  }

  return (
    <div className="flex justify-end mb-4">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleOpenSettings}
        className="inline-flex items-center"
      >
        <Settings className="w-4 h-4 mr-2" />
        Space Settings
      </Button>
    </div>
  );
});

export default SpaceSettingsAccess;