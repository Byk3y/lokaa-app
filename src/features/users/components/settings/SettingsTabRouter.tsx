import React from 'react';
import { SettingsTab, SettingsTabProps } from '../../types/settings';

// Import the tab components we've created
import SpacesSettingsTab from './tabs/SpacesSettingsTab';
import ProfileSettingsTab from './tabs/ProfileSettingsTab';
import AccountSettingsTab from './tabs/AccountSettingsTab';
import ThemeSettingsTab from './tabs/ThemeSettingsTab';
import NotificationsSettingsTab from './tabs/NotificationsSettingsTab';
import ChatSettingsTab from './tabs/ChatSettingsTab';

interface SettingsTabRouterProps extends SettingsTabProps {
  activeTab: SettingsTab;
}

export default function SettingsTabRouter({ activeTab, user }: SettingsTabRouterProps) {
  // Render the appropriate tab component based on activeTab
  switch (activeTab) {
    case "spaces":
      return <SpacesSettingsTab user={user} />;
    case "profile":
      return <ProfileSettingsTab user={user} />;
    case "account":
      return <AccountSettingsTab user={user} />;
    case "theme":
      return <ThemeSettingsTab user={user} />;
    case "notifications":
      return <NotificationsSettingsTab user={user} />;
    case "chat":
      return <ChatSettingsTab user={user} />;
    
    // Placeholder for tabs we haven't created yet
    case "payment-methods":
    case "payment-history":
    case "affiliates":
    case "payouts":
      return (
        <div className="max-w-[760px] mx-auto bg-white rounded-[20px] py-8 px-6 shadow-[0px_4px_16px_rgba(0,0,0,0.08)]">
          <h1 className="text-[24px] font-semibold text-[#181818] mb-2">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ')}
          </h1>
          <div className="text-[15px] text-gray-700 mb-8">
            This tab will be implemented in the next step.
          </div>
        </div>
      );
    
    default:
      return <SpacesSettingsTab user={user} />;
  }
} 