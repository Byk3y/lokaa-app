import React from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Settings, Palette, FileText, ListTree, AlertTriangle, LayoutList, DollarSign, ClipboardList } from 'lucide-react';
import type { SettingsTabKey } from './NewSpaceSettingsModal'; // Import the type

interface SettingsSidebarProps {
  activeTab: SettingsTabKey;
  onTabChange: (tab: SettingsTabKey) => void;
  isOwner: boolean;
}

const sidebarTabs: { key: SettingsTabKey; label: string; icon: React.ElementType }[] = [
  { key: "general", label: "General", icon: Settings },
  { key: "pricing", label: "Pricing", icon: DollarSign },
  { key: "about_page", label: "About Page", icon: FileText },
  { key: "categories", label: "Categories", icon: ListTree },
  { key: "rules", label: "Rules", icon: ClipboardList },
  { key: "tabs", label: "Tabs", icon: LayoutList },
  // Danger Zone will be added conditionally
];

export default function SettingsSidebar({ activeTab, onTabChange, isOwner }: SettingsSidebarProps) {
  const allTabs = [...sidebarTabs];
  if (isOwner) {
    allTabs.push({ key: "danger_zone", label: "Danger Zone", icon: AlertTriangle });
  }

  return (
    <div className="w-60 flex-shrink-0 border-r bg-gray-50 dark:bg-slate-800 p-3 flex flex-col space-y-1">
      {/* Optional: Add a heading for the settings section if desired, like Skool's "Group settings" */}
      {/* <h3 className="px-2 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Settings</h3> */}
      {allTabs.map((tab) => (
        <Button
          key={tab.key}
          variant="ghost"
          onClick={() => onTabChange(tab.key)}
          className={cn(
            "w-full justify-start text-sm h-10 px-3 py-2 rounded-md",
            activeTab === tab.key 
              ? "bg-teal-100 dark:bg-teal-700 text-teal-800 dark:text-teal-50 font-semibold hover:bg-teal-200 dark:hover:bg-teal-600"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-gray-50"
          )}
        >
          <tab.icon className={cn("mr-2.5 h-4 w-4", activeTab === tab.key ? "text-teal-700 dark:text-teal-200" : "text-gray-500 dark:text-gray-400")} />
          {tab.label}
        </Button>
      ))}
    </div>
  );
} 