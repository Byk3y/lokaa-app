import { log } from '@/utils/logger';
import React, { useEffect, useState, useCallback, memo, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X, ArrowLeft } from 'lucide-react';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

import SettingsSidebar from './SettingsSidebar';
import GeneralSettingsTab from './settings_tabs/GeneralSettingsTab';
import CategoriesSettingsTab from './settings_tabs/CategoriesSettingsTab';
import TabsSettingsTab from './settings_tabs/TabsSettingsTab';
import PricingSettingsTab from './settings_tabs/PricingSettingsTab';
import RulesSettingsTab from './settings_tabs/RulesSettingsTab';
import DangerZoneTab from './settings_tabs/DangerZoneTab';
import InviteSettingsTab from './settings_tabs/InviteSettingsTab';
import DashboardSettingsTab from './settings_tabs/DashboardSettingsTab';
import MetricsSettingsTab from './settings_tabs/MetricsSettingsTab';
import { toast } from "@/hooks/use-toast";
import { exposeValidationForTesting } from '@/utils/test-helpers';
import { Settings, ListTree, DollarSign, ClipboardList, UserPlus, BarChart3 } from 'lucide-react';
import { withPerformanceMemo } from '@/components/performance/MemoizedComponents';

export type SettingsTabKey = "dashboard" | "general" | "categories" | "tabs" | "pricing" | "rules" | "invite" | "metrics" | "danger_zone";

// Mobile tabs configuration matching Skool reference
const mobileTabs: { key: SettingsTabKey; label: string; icon: React.ElementType }[] = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "invite", label: "Invite", icon: UserPlus },
  { key: "general", label: "General", icon: Settings },
  { key: "pricing", label: "Pricing", icon: DollarSign },
  { key: "categories", label: "Categories", icon: ListTree },
  { key: "rules", label: "Rules", icon: ClipboardList },
];

function NewSpaceSettingsModal() {
  const { 
    space,
    permissions,
    formData,
    loadingSpace,
    loadingPermissions,
    error,
    isSubmitting,
    isDirty,
    isOpen,
    initialTab,
    closeModal,
    loadActiveSpace,
    saveSpaceSettings,
  } = useSpaceSettingsStore();
  
  const { user } = useOptimizedAuth();
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("dashboard");
  const [isMobile, setIsMobile] = useState(false);

  // 🚀 PERFORMANCE FIX: Memoized mobile check function to prevent unnecessary re-renders
  const checkMobile = useCallback(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  // Detect mobile screen size
  useEffect(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [checkMobile]);

  // Prevent body scroll when mobile modal is open
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, isMobile]);

  // Expose validation functions in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      exposeValidationForTesting();
    }
  }, []);

  // 🚀 PERFORMANCE FIX: Memoized load space handler to prevent unnecessary re-renders
  const handleLoadSpace = useCallback(() => {
    if (isOpen && user && space?.subdomain) {
      loadActiveSpace({ subdomain: space.subdomain }, user.id, true);
    } else if (isOpen && user && !space) {
      log.warn('Component', "SpaceSettingsModal opened but no space context (subdomain) available in store to load.");
    }
  }, [isOpen, user, space?.subdomain, loadActiveSpace]);

  useEffect(() => {
    handleLoadSpace();
  }, [handleLoadSpace]);

  // 🚀 PERFORMANCE FIX: Memoized tab change handler to prevent unnecessary re-renders
  const handleTabChange = useCallback((tab: SettingsTabKey) => {
    setActiveTab(tab);
  }, []);

  // Set initial tab when modal opens with initialTab
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab as SettingsTabKey);
    } else if (isOpen && !initialTab) {
      setActiveTab("dashboard");
    }
  }, [isOpen, initialTab]);

  // 🚀 PERFORMANCE FIX: Memoized save handler to prevent unnecessary re-renders
  const handleSaveChanges = useCallback(async () => {
    if (!isDirty || isSubmitting) return;
    const result = await saveSpaceSettings();
    if (result.success) {
      toast({ title: "Settings Saved", description: "Your space settings have been updated." });
    } else if (result.error) {
      toast({ title: "Error Saving Settings", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Error", description: "An unexpected error occurred while saving.", variant: "destructive" });
    }
  }, [isDirty, isSubmitting, saveSpaceSettings]);

  // 🚀 PERFORMANCE FIX: Memoized tab content rendering to prevent unnecessary re-renders
  const renderTabContent = useMemo(() => {
    if (loadingSpace || loadingPermissions) {
      return <div className="flex-grow flex items-center justify-center p-10"><Loader2 className="h-12 w-12 animate-spin text-yellow-500" /></div>;
    }
    if (error) {
      return <div className="flex-grow flex items-center justify-center p-10 text-red-500">Error: {error}</div>;
    }
    if (!space || !permissions || !formData) {
      return <div className="flex-grow flex items-center justify-center p-10 text-gray-500">Space data not available. Ensure a space is selected.</div>;
    }

    switch (activeTab) {
      case "dashboard":
        return <DashboardSettingsTab />;
      case "general":
        return <GeneralSettingsTab />;
      case "pricing":
        return <PricingSettingsTab />;
      case "categories":
        return <CategoriesSettingsTab />;
      case "rules":
        return <RulesSettingsTab />;
      case "tabs":
        return <TabsSettingsTab />;
      case "invite":
        return <InviteSettingsTab />;
      case "metrics":
        return <MetricsSettingsTab />;
      case "danger_zone":
        if (permissions.isOwner) {
          return <DangerZoneTab />;
        }
        return <div className="p-6 text-gray-500">You do not have permission to access this section.</div>;
      default:
        return <GeneralSettingsTab />;
    }
  }, [loadingSpace, loadingPermissions, error, space, permissions, formData, activeTab]);

  if (!isOpen) {
    return null;
  }

  // Mobile full-view layout (Skool style)
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 z-[9998] bg-black/50"
          onClick={closeModal}
        />
        
        {/* Modal Content */}
        <div className="fixed inset-0 z-[9999] h-screen w-screen flex flex-col bg-white overflow-hidden">
          {/* Mobile Header - Skool style */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-white shrink-0">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={closeModal} 
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Button>
              {space?.icon_image ? (
                <img 
                  src={space.icon_image} 
                  alt={space.name} 
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  {space?.name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
              )}
              <span className="font-semibold text-gray-900 text-base">Settings</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={closeModal} 
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5 text-gray-600" />
            </Button>
          </div>

          {/* Mobile Tab Navigation - Horizontal scrollable */}
          <div className="px-4 py-4 border-b bg-white shrink-0">
            <div className="flex space-x-6 overflow-x-auto scrollbar-hide">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`flex-shrink-0 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'text-gray-900 border-b-4 border-gray-900 pb-2'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Content - Full screen */}
          <div className={`flex-grow overflow-y-auto bg-white ${isDirty ? 'pb-40' : 'pb-32'}`}>
            {renderTabContent}
          </div>

          {/* Mobile Footer - Only show if there are unsaved changes */}
          {isDirty && (
            <div className="px-4 py-3 border-t bg-gray-50 shrink-0">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {isSubmitting ? "Saving..." : "You have unsaved changes."}
                </span>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={closeModal} size="sm">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveChanges} 
                    disabled={isSubmitting}
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  // Desktop layout (existing implementation)
  return (
    <Dialog open={isOpen} onOpenChange={(openStatus) => {
      if (!openStatus) {
        closeModal();
      }
    }}>
      <DialogContent 
        className="max-w-6xl h-[calc(100vh-40px)] flex flex-col p-0 gap-0 dark:bg-slate-900 [&>button]:hidden"
        onPointerDownOutside={(e) => { if (isDirty) e.preventDefault(); }}
        onInteractOutside={(e) => { if (isDirty) e.preventDefault(); }}
      >
        <DialogHeader className="px-6 py-4 border-b dark:border-slate-700 flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">Space Settings</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
              {space ? `Manage your space: ${space.name}` : 'Configure and customize your space settings'}
            </DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={closeModal} className="rounded-full dark:text-gray-400 dark:hover:bg-slate-700">
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <div className="flex flex-grow overflow-hidden">
          <SettingsSidebar 
            activeTab={activeTab} 
            onTabChange={handleTabChange} 
            isOwner={permissions?.isOwner || false}
          />
          <div className="flex-grow bg-white dark:bg-slate-850 overflow-y-auto">
            {renderTabContent}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {isDirty && !isSubmitting && "You have unsaved changes."}
            {isSubmitting && "Saving..."}
            {!isDirty && !isSubmitting && "Settings are up to date."}
          </span>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={closeModal} className="dark:text-gray-300 dark:border-slate-600 dark:hover:bg-slate-700">
              Cancel
            </Button>
            <Button 
              onClick={handleSaveChanges} 
              disabled={!isDirty || isSubmitting}
              className="bg-teal-600 hover:bg-teal-700 text-white dark:bg-teal-500 dark:hover:bg-teal-600 dark:text-white"
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 🚀 PERFORMANCE FIX: Enhanced React.memo with custom comparison to prevent unnecessary re-renders
const NewSpaceSettingsModalMemo = memo(NewSpaceSettingsModal, () => {
  // Since this component has no props, we should never re-render unless the component itself changes
  // This memoization is primarily for internal state optimization
  return true; // Always return true to prevent re-renders based on props (since there are none)
});

export default withPerformanceMemo(NewSpaceSettingsModalMemo, 'NewSpaceSettingsModal');