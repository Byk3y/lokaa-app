import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { SettingsTab } from '../types/settings';

/**
 * Settings Navigation Hook
 * 
 * Handles tab navigation, URL synchronization, and active state management
 * for user settings
 */
export function useSettingsNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tab } = useParams<{ tab?: string }>();

  const validTabs: SettingsTab[] = [
    "spaces", "profile", "affiliates", "payouts", "account", 
    "notifications", "chat", "payment-methods", "payment-history", "theme"
  ];

  // Initialize activeTab from URL param if available, otherwise use default
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    if (tab && validTabs.includes(tab as SettingsTab)) {
      return tab as SettingsTab;
    }
    
    // Extract tab from pathname if no param is present
    const pathParts = location.pathname.split('/');
    const pathTab = pathParts[pathParts.length - 1];
    if (validTabs.includes(pathTab as SettingsTab) && pathTab !== 'settings') {
      return pathTab as SettingsTab;
    }
    
    return "spaces"; // default tab
  });

  // Keep URL in sync with active tab
  useEffect(() => {
    const currentPath = location.pathname;
    const expectedPath = `/settings/${activeTab}`;
    const baseSettingsPath = '/settings';
    
    // If we're on the base settings path and using default tab, don't change URL
    if (currentPath === baseSettingsPath && activeTab === "spaces") {
      return;
    }
    
    // For any other case, sync the URL with the active tab
    if (currentPath !== expectedPath) {
      // Use replace to avoid cluttering browser history
      navigate(expectedPath, { replace: true });
    }
  }, [activeTab, location.pathname, navigate]);

  // Update tab selection handler
  const handleTabChange = (tabId: SettingsTab) => {
    setActiveTab(tabId);
  };

  return {
    activeTab,
    handleTabChange,
    validTabs
  };
} 