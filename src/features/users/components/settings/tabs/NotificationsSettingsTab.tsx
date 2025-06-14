import React from 'react';
import { SettingsTabProps } from '../../../types/settings';

export default function NotificationsSettingsTab({ user }: SettingsTabProps) {
  return (
    <div className="max-w-[760px] mx-auto bg-white rounded-[20px] py-8 px-6 shadow-[0px_4px_16px_rgba(0,0,0,0.08)]">
      <h1 className="text-[24px] font-semibold text-[#181818] mb-2">Notifications</h1>
      <div className="text-[15px] text-gray-700 mb-8">Choose what notifications you'd like to receive.</div>
      
      <div className="space-y-6">
        {/* Email Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[16px] font-medium text-gray-900">Email notifications</div>
            <div className="text-[14px] text-gray-500">Receive email updates about activity</div>
          </div>
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-[#00A389] transition-colors">
            <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
          </button>
        </div>

        {/* Push Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[16px] font-medium text-gray-900">Push notifications</div>
            <div className="text-[14px] text-gray-500">Receive push notifications on your device</div>
          </div>
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors">
            <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
          </button>
        </div>

        {/* Space Activity */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[16px] font-medium text-gray-900">Space activity</div>
            <div className="text-[14px] text-gray-500">New posts and comments in your spaces</div>
          </div>
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-[#00A389] transition-colors">
            <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
          </button>
        </div>

        {/* Direct Messages */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[16px] font-medium text-gray-900">Direct messages</div>
            <div className="text-[14px] text-gray-500">New messages from other users</div>
          </div>
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-[#00A389] transition-colors">
            <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
          </button>
        </div>
      </div>
    </div>
  );
} 