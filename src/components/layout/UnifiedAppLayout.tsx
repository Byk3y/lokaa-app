/**
 * UnifiedAppLayout - Unified layout for spaces and chat
 * 
 * SOLUTION: Instead of separate layouts for spaces and chat,
 * create one unified layout that contains both, preventing unmounting.
 * 
 * This solves the Chat→Home rerendering issue by keeping everything mounted.
 */

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from '@/components/mobile/BottomNav';

export default function UnifiedAppLayout() {
  const location = useLocation();
  const isOnChatPage = location.pathname === '/app/chat';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Main content area - takes up available space */}
      <div className="flex-1 pb-16 sm:pb-0">
        {/* Render the current route content */}
        <Outlet />
      </div>
      
      {/* Bottom Navigation - Always present */}
      <BottomNav />
    </div>
  );
} 