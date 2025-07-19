import React, { useState } from 'react';
import { Copy, Settings, Users, HelpCircle, LogOut, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOptimizedAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface MobileProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileUrl?: string;
}

export default function MobileProfileModal({ 
  isOpen, 
  onClose, 
  profileUrl 
}: MobileProfileModalProps) {
  const { signOut } = useOptimizedAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);

  if (!isOpen) return null;

  const handleCopyProfileLink = async () => {
    const profileLink = `${window.location.origin}/profile/${profileUrl || 'user'}`;
    setIsCopying(true);
    
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(profileLink);
        toast({
          title: "Profile Link Copied!",
          description: "Your profile link has been copied to clipboard.",
          duration: 3000,
        });
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = profileLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          toast({
            title: "Profile Link Copied!",
            description: "Your profile link has been copied to clipboard.",
            duration: 3000,
          });
        } else {
          throw new Error('Copy command failed');
        }
      }
    } catch (error) {
      console.error('Failed to copy profile link:', error);
      toast({
        title: "Copy Failed",
        description: "Unable to copy profile link. Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsCopying(false);
    }
  };

  const handleSettings = () => {
    navigate('/settings');
    onClose();
  };

  const handleAffiliates = () => {
    navigate('/settings/affiliates');
    onClose();
  };

  const handleHelpCenter = () => {
    navigate('/help');
    onClose();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed right-4 top-14 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 animate-fade-in">
        <div className="p-2">
          {/* Copy Profile Link */}
          <button
            onClick={handleCopyProfileLink}
            disabled={isCopying}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
          >
            {isCopying ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 text-gray-500" />
            )}
            {isCopying ? 'Copied!' : 'Copy Profile Link'}
          </button>

          {/* Settings */}
          <button
            onClick={handleSettings}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
          >
            <Settings className="h-4 w-4 text-gray-500" />
            Settings
          </button>

          {/* Affiliates */}
          <button
            onClick={handleAffiliates}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
          >
            <Users className="h-4 w-4 text-gray-500" />
            Affiliates
          </button>

          {/* Help Center */}
          <button
            onClick={handleHelpCenter}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
          >
            <HelpCircle className="h-4 w-4 text-gray-500" />
            Help Center
          </button>

          {/* Divider */}
          <div className="border-t border-gray-200 my-1" />

          {/* Log Out */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4 text-red-500" />
            Log Out
          </button>
        </div>
      </div>
    </>
  );
} 