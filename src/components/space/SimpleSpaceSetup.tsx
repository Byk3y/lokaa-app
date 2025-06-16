import React, { useState } from 'react';
import { CheckCircle, Users, FileText, Settings, X, Copy, Check, ChevronRight, PartyPopper, MessageSquare } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOptimizedAuth } from "@/contexts/AuthContext";
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
import { toast } from '@/hooks/use-toast';

interface SimpleSpaceSetupProps {
  spaceId: string;
  spaceName: string;
  spaceSubdomain: string;
  isOwner: boolean;
  isAdmin: boolean;
  hasAnyPosts: boolean;
  onCreatePost: () => void;
}

interface SetupTask {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  action?: () => void;
}

export default function SimpleSpaceSetup({
  spaceId,
  spaceName,
  spaceSubdomain,
  isOwner,
  isAdmin,
  hasAnyPosts,
  onCreatePost
}: SimpleSpaceSetupProps) {
  const { user } = useOptimizedAuth();
  const { space: storeSpace, openModal } = useSpaceSettingsStore();
  
  // Simple dismissal state - localStorage only
  const dismissalKey = `setup-dismissed-${spaceId}`;
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem(dismissalKey) === 'true';
  });
  
  // Simple invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Simple permission check - only show for owners/admins
  const canSeeSetup = isOwner || isAdmin;
  
  // Don't render if dismissed or no permission
  if (isDismissed || !canSeeSetup) {
    return null;
  }
  
  // Simple task definitions
  const tasks: SetupTask[] = [
    {
      id: 'invite',
      title: 'Invite members',
      description: '',
      icon: Users,
      completed: false, // This remains manual for simplicity
      action: () => setShowInviteModal(true)
    },
    {
      id: 'description',
      title: 'Add description',
      description: '',
      icon: MessageSquare,
      completed: !!(storeSpace?.description),
      action: () => {
        if (user?.id && spaceSubdomain) {
          const actions = useSpaceSettingsStore.getState();
          actions.loadActiveSpace({ subdomain: spaceSubdomain, spaceId }, user.id, true)
            .then(() => {
              openModal();
              toast({ title: "Settings opened", description: "Add your group description in the General tab." });
            })
            .catch(() => {
              toast({ title: "Error", description: "Could not open settings.", variant: "destructive" });
            });
        }
      }
    },
    {
      id: 'cover',
      title: 'Add cover image',
      description: '',
      icon: Settings,
      completed: !!(storeSpace?.cover_image),
      action: () => {
        if (user?.id && spaceSubdomain) {
          const actions = useSpaceSettingsStore.getState();
          actions.loadActiveSpace({ subdomain: spaceSubdomain, spaceId }, user.id, true)
            .then(() => {
              openModal();
              toast({ title: "Settings opened", description: "Upload your cover image in the General tab." });
            })
            .catch(() => {
              toast({ title: "Error", description: "Could not open settings.", variant: "destructive" });
            });
        }
      }
    },
    {
      id: 'post',
      title: 'Create first post',
      description: '',
      icon: FileText,
      completed: hasAnyPosts,
      action: onCreatePost
    }
  ];
  
  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;
  const isComplete = completedTasks === totalTasks;
  
  // Generate invite link
  const inviteLink = `${window.location.origin}/${spaceSubdomain}`;
  
  const handleDismiss = () => {
    localStorage.setItem(dismissalKey, 'true');
    setIsDismissed(true);
  };
  
  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({ title: "Copied!", description: "Invite link copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({ title: "Error", description: "Failed to copy link.", variant: "destructive" });
    }
  };
  
  return (
    <>
      {/* Main Setup Card - Redesigned */}
      <div className="w-full md:w-[768px] flex-shrink-0 flex-grow-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-4 mb-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Setup your group
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 -mr-1"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Progress</span>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{Math.round((completedTasks / totalTasks) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-gray-600 dark:bg-gray-400 h-1.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
            />
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center p-1.5 rounded transition-all ${
                task.completed
                  ? 'bg-gray-50 dark:bg-gray-800/50'
                  : 'bg-white dark:bg-gray-800'
              } ${
                task.action && !task.completed
                  ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer'
                  : ''
              }`}
              onClick={task.action && !task.completed ? task.action : undefined}
            >
              <div className="flex-shrink-0 mr-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  task.completed ? 'bg-gray-200 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  {task.completed ? (
                    <Check className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <task.icon className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                  )}
                </div>
              </div>
              <div className="flex-grow">
                <p className={`text-xs font-semibold ${
                  task.completed ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'
                }`}>
                  {task.title}
                </p>
              </div>
              {!task.completed && task.action && (
                <div className="flex-shrink-0 ml-2">
                  <ChevronRight className="h-3 w-3 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Completion Message */}
        {isComplete && (
          <div className="mt-4 text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800/50">
            <div className="flex justify-center items-center">
              <PartyPopper className="h-5 w-5 text-blue-500 mr-2" />
              <p className="text-blue-800 dark:text-blue-200 text-sm font-semibold">
                All done! Your space is ready to shine.
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Invite members to {spaceName}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInviteModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Share this link with anyone you want to invite to your space.
            </p>
            
            <div className="flex items-center space-x-2 mb-4">
              <Input
                value={inviteLink}
                readOnly
                className="flex-1"
              />
              <Button onClick={handleCopyInvite} variant="outline">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Anyone with this link can join your space.
            </p>
          </div>
        </div>
      )}
    </>
  );
} 