import { log } from '@/utils/logger';
import React, { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X } from 'lucide-react';
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

export type SettingsTabKey = "dashboard" | "general" | "categories" | "tabs" | "pricing" | "rules" | "invite" | "metrics" | "danger_zone";

export default function NewSpaceSettingsModal() {
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
    openModal,
    loadActiveSpace,
    saveSpaceSettings,
  } = useSpaceSettingsStore();
  
  const { user } = useOptimizedAuth();
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("dashboard");

  // Expose validation functions in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      exposeValidationForTesting();
    }
  }, []);

  useEffect(() => {
    if (isOpen && user && space?.subdomain) {
      loadActiveSpace({ subdomain: space.subdomain }, user.id, true);
    } else if (isOpen && user && !space) {
      log.warn('Component', "SpaceSettingsModal opened but no space context (subdomain) available in store to load.");
    }
  }, [isOpen, user, space?.subdomain, loadActiveSpace]);

  // Set initial tab when modal opens with initialTab
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab as SettingsTabKey);
    } else if (isOpen && !initialTab) {
      setActiveTab("dashboard");
    }
  }, [isOpen, initialTab]);

  const handleSaveChanges = async () => {
    if (!isDirty || isSubmitting) return;
    const result = await saveSpaceSettings();
    if (result.success) {
      toast({ title: "Settings Saved", description: "Your space settings have been updated." });
    } else if (result.error) {
      toast({ title: "Error Saving Settings", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Error", description: "An unexpected error occurred while saving.", variant: "destructive" });
    }
  };

  const renderTabContent = () => {
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
  };

  if (!isOpen) {
    return null;
  }

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
            onTabChange={setActiveTab} 
            isOwner={permissions?.isOwner || false}
          />
          <div className="flex-grow bg-white dark:bg-slate-850 overflow-y-auto">
            {renderTabContent()}
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