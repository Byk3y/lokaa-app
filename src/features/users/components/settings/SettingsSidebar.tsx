import React from 'react';
import { 
  MessageSquare, 
  User, 
  Users, 
  DollarSign, 
  CircleUser, 
  Bell, 
  CreditCard, 
  Clock, 
  PaintBucket 
} from "lucide-react";
import { SettingsTab, SettingsMenuItem, SettingsNavigationProps } from '../../types/settings';

// Lokaa brand color
const BRAND_COLOR = "#00A389";

// Menu item component
interface MenuItemProps {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  isActive: boolean;
  brandColor: string;
}

const MenuItem: React.FC<MenuItemProps> = ({ id, label, icon, onClick, isActive, brandColor }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center py-3 px-5 w-full mb-2 transition-colors rounded-[20px] mx-2`}
      style={{ 
        backgroundColor: isActive ? `${brandColor}15` : 'transparent',
        transition: 'background-color 150ms ease'
      }}
    >
      <div className="mr-3" style={{ color: isActive ? brandColor : '#888888' }}>
        {icon}
      </div>
      <span 
        className="text-[16px] font-bold" 
        style={{ 
          fontFamily: 'Inter, sans-serif', 
          color: isActive ? brandColor : '#444444',
          fontWeight: isActive ? 700 : 600
        }}
      >
        {label}
      </span>
    </button>
  );
};

// Settings menu items configuration
const settingsMenuItems: SettingsMenuItem[] = [
  { id: "spaces", label: "Spaces", icon: MessageSquare },
  { id: "profile", label: "Profile", icon: User },
  { id: "affiliates", label: "Affiliates", icon: Users },
  { id: "payouts", label: "Payouts", icon: DollarSign },
  { id: "account", label: "Account", icon: CircleUser },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "payment-methods", label: "Payment methods", icon: CreditCard },
  { id: "payment-history", label: "Payment history", icon: Clock },
  { id: "theme", label: "Theme", icon: PaintBucket }
];

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

export default function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  return (
    <div className="w-[280px] bg-white rounded-[16px] shadow-[0px_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
      <nav className="py-4">
        <div className="space-y-1">
          {settingsMenuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <MenuItem 
                key={item.id}
                id={item.id} 
                label={item.label} 
                icon={<IconComponent size={20} />} 
                onClick={() => onTabChange(item.id)}
                isActive={activeTab === item.id}
                brandColor={BRAND_COLOR}
              />
            );
          })}
        </div>
      </nav>
    </div>
  );
} 