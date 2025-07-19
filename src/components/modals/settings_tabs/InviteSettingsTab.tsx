import { log } from '@/utils/logger';
import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, Send, Upload, FileSpreadsheet, Mail, Link2, Users } from 'lucide-react';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { toast } from "@/hooks/use-toast";
import { useSetupProgressStore } from '@/stores/useSetupProgressStore';
import { useOptimizedAuth } from '@/contexts/AuthContext';

export default function InviteSettingsTab() {
  const { space } = useSpaceSettingsStore();
  const { user } = useOptimizedAuth();
  const { updateTaskCompletion } = useSetupProgressStore();
  const [emailInput, setEmailInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);

  // Generate the share link
  const shareLink = useMemo(() => {
    if (!space?.subdomain) return "";
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    return `${baseUrl}/${space.subdomain}`;
  }, [space?.subdomain]);

  // Handle copying the share link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopiedLink(true);
      
      // Mark invite task as completed in persistent storage
      if (user?.id && space?.id) {
        try {
          await updateTaskCompletion(user.id, space.id, 'invite', true);
        } catch (error) {
          log.error('Component', '[InviteSettingsTab] Error updating invite task completion:', error);
          // Don't block the copy operation if task update fails
        }
      }
      
      toast({ 
        title: "Invite link copied!", 
        description: "Share link has been copied. You can now invite 3 people!" 
      });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to copy link to clipboard.", 
        variant: "destructive" 
      });
    }
  };

  // Handle sending email invite
  const handleSendInvite = async () => {
    if (!emailInput.trim()) {
      toast({ 
        title: "Email required", 
        description: "Please enter an email address.", 
        variant: "destructive" 
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput)) {
      toast({ 
        title: "Invalid email", 
        description: "Please enter a valid email address.", 
        variant: "destructive" 
      });
      return;
    }

    setSendingInvite(true);
    try {
      // TODO: Implement actual email invite API call
      // For now, simulate the process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mark invite task as completed in persistent storage
      if (user?.id && space?.id) {
        try {
          await updateTaskCompletion(user.id, space.id, 'invite', true);
        } catch (error) {
          log.error('Component', '[InviteSettingsTab] Error updating invite task completion via email send:', error);
          // Don't block the invite operation if task update fails
        }
      }
      
      toast({ 
        title: "Invite sent!", 
        description: `Invitation has been sent to ${emailInput}` 
      });
      setEmailInput('');
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to send invitation.", 
        variant: "destructive" 
      });
    } finally {
      setSendingInvite(false);
    }
  };

  // Handle CSV import
  const handleCSVImport = () => {
    // TODO: Implement CSV import functionality
    toast({ 
      title: "Coming soon", 
      description: "CSV import functionality will be available soon.", 
    });
  };

  if (!space) {
    return (
      <div className="p-6 text-center text-gray-500">
        No space data available.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Share your group link
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          This will take people to your group's About page where they can purchase or request membership.
        </p>
      </div>

      {/* Share Link Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Input
                value={shareLink}
                readOnly
                className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-mono text-sm"
              />
            </div>
            <Button
              onClick={handleCopyLink}
              className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold px-6"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  COPIED
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  COPY
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instant Access Methods */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          These invite methods will grant instant access without purchasing or requesting membership.
        </h3>

        <div className="space-y-4">
          {/* Email Invite */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSendInvite();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={handleSendInvite}
                  disabled={sendingInvite || !emailInput.trim()}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-6"
                >
                  {sendingInvite ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                      SENDING
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      SEND
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                This member will have access to ({space.course_count || 0} courses).
              </p>
            </CardContent>
          </Card>

          {/* CSV Import */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Import .CSV file
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Invite members in bulk by uploading a .CSV file of email addresses.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleCSVImport}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-6"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  IMPORT
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Statistics or Additional Info */}
      <Card className="bg-gray-50 dark:bg-gray-800/50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Current Members: {space.member_count || 0}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Invite more people to grow your community
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}