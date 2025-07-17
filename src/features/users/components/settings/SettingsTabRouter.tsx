import React, { useState, useEffect } from 'react';
import { SettingsTab, SettingsTabProps } from '../../types/settings';

// Import the tab components we've created
import SpacesSettingsTab from './tabs/SpacesSettingsTab';
import ProfileSettingsTab from './tabs/ProfileSettingsTab';
import AccountSettingsTab from './tabs/AccountSettingsTab';
import ThemeSettingsTab from './tabs/ThemeSettingsTab';
import NotificationsSettingsTab from './tabs/NotificationsSettingsTab';
import ChatSettingsTab from './tabs/ChatSettingsTab';

// Memoized tab components to prevent unnecessary re-renders
const MemoizedSpacesTab = React.memo(SpacesSettingsTab);
const MemoizedProfileTab = React.memo(ProfileSettingsTab);
const MemoizedAccountTab = React.memo(AccountSettingsTab);
const MemoizedThemeTab = React.memo(ThemeSettingsTab);
const MemoizedNotificationsTab = React.memo(NotificationsSettingsTab);
const MemoizedChatTab = React.memo(ChatSettingsTab);

interface SettingsTabRouterProps extends SettingsTabProps {
  activeTab: SettingsTab;
}

export default function SettingsTabRouter({ activeTab, user }: SettingsTabRouterProps) {
  // Track which tabs have been visited to implement lazy loading
  const [visitedTabs, setVisitedTabs] = useState<Set<SettingsTab>>(new Set([activeTab]));

  // Add the current tab to visited tabs when it changes
  useEffect(() => {
    setVisitedTabs(prev => new Set(prev).add(activeTab));
  }, [activeTab]);

  // Render tab components with lazy loading and memoization
  // Only render tabs that have been visited to optimize performance
  return (
    <div>
      {visitedTabs.has("spaces") && (
        <div style={{ display: activeTab === "spaces" ? "block" : "none" }}>
          <MemoizedSpacesTab user={user} />
        </div>
      )}
      
      {visitedTabs.has("profile") && (
        <div style={{ display: activeTab === "profile" ? "block" : "none" }}>
          <MemoizedProfileTab user={user} />
        </div>
      )}
      
      {visitedTabs.has("account") && (
        <div style={{ display: activeTab === "account" ? "block" : "none" }}>
          <MemoizedAccountTab user={user} />
        </div>
      )}
      
      {visitedTabs.has("theme") && (
        <div style={{ display: activeTab === "theme" ? "block" : "none" }}>
          <MemoizedThemeTab user={user} />
        </div>
      )}
      
      {visitedTabs.has("notifications") && (
        <div style={{ display: activeTab === "notifications" ? "block" : "none" }}>
          <MemoizedNotificationsTab user={user} />
        </div>
      )}
      
      {visitedTabs.has("chat") && (
        <div style={{ display: activeTab === "chat" ? "block" : "none" }}>
          <MemoizedChatTab user={user} />
        </div>
      )}
      
      {/* Placeholder for tabs we haven't created yet */}
      {(activeTab === "payment-methods" || 
        activeTab === "payment-history" || 
        activeTab === "affiliates" || 
        activeTab === "payouts") && (
        <div className="max-w-[760px] mx-auto bg-white rounded-[20px] py-8 px-6 shadow-[0px_4px_16px_rgba(0,0,0,0.08)]">
          <h1 className="text-[24px] font-semibold text-[#181818] mb-2">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ')}
          </h1>
          <div className="text-[15px] text-gray-700 mb-8">
            This tab will be implemented in the next step.
          </div>
        </div>
      )}
    </div>
  );
} 