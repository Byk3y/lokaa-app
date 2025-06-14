import React from 'react';
import { SettingsTabProps } from '../../../types/settings';
import MinimalUpDownChevronIcon from '@/components/MinimalUpDownChevronIcon';

export default function ThemeSettingsTab({ user }: SettingsTabProps) {
  return (
    <div className="max-w-[760px] mx-auto bg-white rounded-[20px] py-8 px-6 shadow-[0px_4px_16px_rgba(0,0,0,0.08)]">
      <h1 className="text-[24px] font-semibold text-[#181818] mb-2">Theme</h1>
      <div className="text-[15px] text-gray-700 mb-8">Choose your preferred appearance for the app.</div>
      <div className="max-w-xs">
        <label className="block text-[16px] font-bold text-[#181818] mb-2">Appearance</label>
        <div className="relative">
          <select
            className="w-full border border-gray-200 rounded-lg px-5 py-4 text-[18px] text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#00A389] bg-white"
            defaultValue="light"
          >
            <option value="light">Light (default)</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <MinimalUpDownChevronIcon size={24} color="#979BAA" />
          </div>
        </div>
      </div>
    </div>
  );
} 