import React from 'react';
import { SettingsTabProps } from '../../../types/settings';
import MinimalUpDownChevronIcon from '@/components/MinimalUpDownChevronIcon';

export default function ChatSettingsTab({ user }: SettingsTabProps) {
  return (
    <div className="max-w-[760px] mx-auto bg-white rounded-[20px] py-8 px-6 shadow-[0px_4px_16px_rgba(0,0,0,0.08)]">
      <h1 className="text-[24px] font-semibold text-[#181818] mb-2">Chat</h1>
      <div className="text-[15px] text-gray-700 mb-8">Manage your messaging preferences and settings.</div>
      
      <div className="space-y-6">
        {/* Timezone */}
        <div>
          <label className="block text-[16px] font-bold text-[#181818] mb-2">Timezone</label>
          <div className="relative max-w-md">
            <select
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[16px] text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#00A389] bg-white"
              defaultValue="(GMT +01:00) Africa/Lagos"
            >
              <option value="(GMT +01:00) Africa/Lagos">(GMT +01:00) Africa/Lagos</option>
              <option value="(GMT +00:00) UTC">(GMT +00:00) UTC</option>
              <option value="(GMT -05:00) Eastern Time">(GMT -05:00) Eastern Time</option>
              <option value="(GMT -08:00) Pacific Time">(GMT -08:00) Pacific Time</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <MinimalUpDownChevronIcon size={24} color="#979BAA" />
            </div>
          </div>
        </div>

        {/* Message Status */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[16px] font-medium text-gray-900">Show message read status</div>
            <div className="text-[14px] text-gray-500">Let others see when you've read their messages</div>
          </div>
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-[#00A389] transition-colors">
            <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
          </button>
        </div>

        {/* Online Status */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[16px] font-medium text-gray-900">Show online status</div>
            <div className="text-[14px] text-gray-500">Let others see when you're online</div>
          </div>
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-[#00A389] transition-colors">
            <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
          </button>
        </div>

        {/* Message Previews */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[16px] font-medium text-gray-900">Message previews</div>
            <div className="text-[14px] text-gray-500">Show message content in notifications</div>
          </div>
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors">
            <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
          </button>
        </div>

        {/* Auto-archive */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[16px] font-medium text-gray-900">Auto-archive old conversations</div>
            <div className="text-[14px] text-gray-500">Automatically archive conversations after 30 days of inactivity</div>
          </div>
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors">
            <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
} 