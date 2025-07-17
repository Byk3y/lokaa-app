import React, { useState, useEffect } from 'react';
import { Dialog, DialogPortal, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import MobileProfileEditForm from './MobileProfileEditForm';

export type ProfileEditTabKey = "communities" | "profile" | "affiliates" | "payouts" | "account";

interface MobileProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function MobileProfileEditModal({ isOpen, onClose, user }: MobileProfileEditModalProps) {
  const [activeTab, setActiveTab] = useState<ProfileEditTabKey>("profile");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(shouldEnableMobileFeatures());
  }, []);


  // Prevent body scroll when modal is open on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, isMobile]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return <MobileProfileEditForm user={user} onClose={onClose} />;
      case "communities":
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Communities</h3>
            <p className="text-gray-600">Communities settings coming soon...</p>
          </div>
        );
      case "affiliates":
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Affiliates</h3>
            <p className="text-gray-600">Affiliates settings coming soon...</p>
          </div>
        );
      case "payouts":
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Payouts</h3>
            <p className="text-gray-600">Payouts settings coming soon...</p>
          </div>
        );
      case "account":
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Account</h3>
            <p className="text-gray-600">Account settings coming soon...</p>
          </div>
        );
      default:
        return null;
    }
  };

  const tabs = [
    { key: "communities" as ProfileEditTabKey, label: "Communities" },
    { key: "profile" as ProfileEditTabKey, label: "Profile" },
    { key: "affiliates" as ProfileEditTabKey, label: "Affiliates" },
    { key: "payouts" as ProfileEditTabKey, label: "Payouts" },
    { key: "account" as ProfileEditTabKey, label: "Account" },
  ];

  // Get user initials for header icon
  const getUserInitials = () => {
    if (!user) return "U";
    
    if (user.user_metadata?.firstName && user.user_metadata?.lastName) {
      return `${user.user_metadata.firstName.charAt(0)}${user.user_metadata.lastName.charAt(0)}`;
    }
    
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return "U";
  };

  // Mobile: Full-screen layout
  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogPortal>
          <div className="fixed inset-0 z-[60] h-screen w-screen flex flex-col bg-white overflow-hidden">
            {/* Hidden accessibility elements */}
            <DialogTitle className="sr-only">Settings</DialogTitle>
            <DialogDescription className="sr-only">
              Profile settings and configuration
            </DialogDescription>
            
            {/* Mobile Header - Skool Style */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-white shrink-0">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose} 
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </Button>
                {user?.user_metadata?.avatar_url ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-white font-bold text-sm">
                    {getUserInitials()}
                  </div>
                )}
                <span className="font-semibold text-gray-900 text-base">Settings</span>
              </div>
            </div>

            {/* Mobile Tab Navigation */}
            <div className="flex border-b bg-white overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Mobile Content */}
            <div className="flex-grow bg-white overflow-y-auto pb-20">
              {renderTabContent()}
            </div>
          </div>
        </DialogPortal>
      </Dialog>
    );
  }

  // Desktop fallback - shouldn't be used but included for safety
  return null;
}