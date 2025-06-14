import React from 'react';
import { SettingsTabProps } from '../../../types/settings';

export default function AccountSettingsTab({ user }: SettingsTabProps) {
  return (
    <div className="max-w-[760px] mx-auto bg-white rounded-[20px] border border-gray-200 py-8 px-6 shadow-sm">
      <h1 className="text-[24px] font-semibold text-[#181818] mb-8">Account</h1>
      
      {/* Email */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <div className="text-[18px] font-bold text-[#181818] mb-1">Email</div>
          <div className="text-[16px] text-gray-700">{user?.email || 'your@email.com'}</div>
        </div>
        <button className="mt-4 md:mt-0 bg-gray-100 text-gray-500 font-bold rounded-md px-5 py-2 text-[15px] cursor-pointer border border-gray-200">
          CHANGE EMAIL
        </button>
      </div>
      
      {/* Password */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <div className="text-[18px] font-bold text-[#181818] mb-1">Password</div>
          <div className="text-[16px] text-gray-700">••••••••</div>
        </div>
        <button className="mt-4 md:mt-0 bg-gray-100 text-gray-500 font-bold rounded-md px-5 py-2 text-[15px] cursor-pointer border border-gray-200">
          CHANGE PASSWORD
        </button>
      </div>
      
      {/* Two-Factor Authentication */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <div className="text-[18px] font-bold text-[#181818] mb-1">Two-Factor Authentication</div>
          <div className="text-[16px] text-gray-700">Add an extra layer of security to your account.</div>
        </div>
        <button className="mt-4 md:mt-0 bg-gray-100 text-gray-400 font-bold rounded-md px-5 py-2 text-[15px] cursor-not-allowed border border-gray-200" disabled>
          ENABLE
        </button>
      </div>
      
      {/* Log out of all devices */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[18px] font-bold text-[#181818] mb-1">Log out of all devices</div>
          <div className="text-[16px] text-gray-700">Log out of all active sessions on all devices.</div>
        </div>
        <button className="mt-4 md:mt-0 bg-gray-100 text-gray-400 font-bold rounded-md px-5 py-2 text-[15px] cursor-not-allowed border border-gray-200" disabled>
          LOG OUT EVERYWHERE
        </button>
      </div>
    </div>
  );
} 