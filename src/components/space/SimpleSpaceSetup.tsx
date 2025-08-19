import { log } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { Check, Users, FileText, ImageIcon, X, ChevronUp, ChevronDown, MessageCircle, Edit3 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useOptimizedAuth } from "@/contexts/AuthContext";
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
import { toast } from '@/hooks/use-toast';
import { useSetupProgressStore, useTaskCompletion } from '@/stores/useSetupProgressStore';

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
  description?: string;
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
  const { space: storeSpace, openModal, openModalToTab } = useSpaceSettingsStore();
  
  // Use the new setup progress store with individual selectors to avoid infinite loops
  const progress = useSetupProgressStore((state) => state.progressBySpace[spaceId]) || {
    tasks: { invite: false, description: false, cover: false, post: false },
    setupDismissed: false,
    lastUpdated: null
  };
  const loading = useSetupProgressStore((state) => state.loading[spaceId]) || false;
  const error = useSetupProgressStore((state) => state.error[spaceId]) || null;
  const { loadSetupProgress, dismissSetupGuide } = useSetupProgressStore();
  
  // Individual task completion states using the store
  const inviteTaskCompleted = useTaskCompletion(spaceId, 'invite');
  
  // Collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Load setup progress when component mounts or user/space changes
  useEffect(() => {
    if (user?.id && spaceId) {
      loadSetupProgress(user.id, spaceId);
    }
  }, [user?.id, spaceId]); // Removed loadSetupProgress dependency to prevent infinite loops

  // Simple permission check - only show for owners/admins
  const canSeeSetup = isOwner || isAdmin;
  
  // Simple task definitions using persistent progress state
  const tasks: SetupTask[] = [
    {
      id: 'invite',
      title: 'Invite 3 people',
      icon: Users,
      completed: progress.tasks.invite,
      action: () => {
        if (user?.id && spaceSubdomain) {
          const actions = useSpaceSettingsStore.getState();
          actions.loadActiveSpace({ subdomain: spaceSubdomain, spaceId }, user.id, true)
            .then(() => {
              openModalToTab("invite");
              toast({ title: "Settings opened", description: "Start inviting people in the Invite tab." });
            })
            .catch(() => {
              toast({ title: "Error", description: "Could not open settings.", variant: "destructive" });
            });
        }
      }
    },
    {
      id: 'description',
      title: 'Add group description',
      icon: Edit3,
      completed: progress.tasks.description || !!(storeSpace?.description),
      action: () => {
        if (user?.id && spaceSubdomain) {
          const actions = useSpaceSettingsStore.getState();
          actions.loadActiveSpace({ subdomain: spaceSubdomain, spaceId }, user.id, true)
            .then(() => {
              openModalToTab("general");
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
      title: 'Set cover image',
      icon: ImageIcon,
      completed: progress.tasks.cover || !!(storeSpace?.cover_image),
      action: () => {
        if (user?.id && spaceSubdomain) {
          const actions = useSpaceSettingsStore.getState();
          actions.loadActiveSpace({ subdomain: spaceSubdomain, spaceId }, user.id, true)
            .then(() => {
              openModalToTab("general");
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
      title: 'Write your first post',
      icon: MessageCircle,
      completed: progress.tasks.post || hasAnyPosts,
      action: onCreatePost
    }
  ];
  
  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;
  const progressPercentage = Math.round((completedTasks / totalTasks) * 100);
  const allTasksCompleted = completedTasks === totalTasks;

  // Auto-dismiss when all tasks are completed
  useEffect(() => {
    if (allTasksCompleted && !progress.setupDismissed && user?.id) {
      // Add a slight delay for better UX - let user see 100% completion briefly
      const timer = setTimeout(async () => {
        try {
          await dismissSetupGuide(user.id, spaceId);
          toast({ 
            title: "🎉 Setup Complete!", 
            description: "Your space is now fully set up and ready for your community!" 
          });
        } catch (error) {
          log.error('Component', 'Error auto-dismissing setup guide:', error);
        }
      }, 2000); // 2 second delay

      return () => clearTimeout(timer);
    }
  }, [allTasksCompleted, progress.setupDismissed, user?.id, spaceId]); // Removed dismissSetupGuide dependency to prevent infinite loops
  
  const handleDismiss = async () => {
    if (user?.id) {
      try {
        await dismissSetupGuide(user.id, spaceId);
      } catch (error) {
        log.error('Component', 'Error dismissing setup guide:', error);
        toast({ 
          title: "Error", 
          description: "Could not dismiss setup guide.", 
          variant: "destructive" 
        });
      }
    }
  };
  
  // Don't render if dismissed, no permission, or still loading
  // Allow rendering on brand-new spaces even when lastUpdated is null
  if (progress.setupDismissed || !canSeeSetup || loading) {
    return null;
  }
  
  return (
    <>
      {/* Main Setup Card - Compact design matching post card width */}
      <div className="w-full md:w-[768px] flex-shrink-0 flex-grow-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-4">
        {/* Header with Progress Indicator */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            {/* Circular Progress Indicator */}
            <div className="relative w-6 h-6">
              <svg className="w-6 h-6 transform -rotate-90" viewBox="0 0 36 36">
                {/* Background circle */}
                <path
                  className="text-gray-200 dark:text-gray-700"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Progress circle */}
                <path
                  className="text-emerald-500"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${progressPercentage}, 100`}
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              {/* Checkmark when complete */}
              {progressPercentage === 100 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check className="w-3 h-3 text-emerald-600" />
                </div>
              )}
            </div>
            
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Set up your group
              </h3>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="
                text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 
                hover:bg-gray-100 dark:hover:bg-gray-700/50 
                rounded-full h-8 w-8 p-0 
                transition-all duration-200 ease-in-out
                hover:scale-105 active:scale-95
                focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600
              "
              title={isCollapsed ? "Expand setup tasks" : "Collapse setup tasks"}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4 transition-transform duration-200" />
              ) : (
                <ChevronUp className="h-4 w-4 transition-transform duration-200" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="
                text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 
                hover:bg-red-50 dark:hover:bg-red-900/20 
                rounded-full h-8 w-8 p-0 
                transition-all duration-200 ease-in-out
                hover:scale-105 active:scale-95
                focus:outline-none focus:ring-2 focus:ring-red-300 dark:focus:ring-red-600
              "
              title="Dismiss setup guide"
            >
              <X className="h-4 w-4 transition-transform duration-200 hover:rotate-90" />
            </Button>
          </div>
        </div>

        {/* Task List - Collapsible */}
        {!isCollapsed && (
          <div className="px-4 pb-4">
            <div className="space-y-0 border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
              {tasks.map((task, index) => (
                <div
                  key={task.id}
                  className={`
                    flex items-center px-3 py-2.5 transition-all duration-200
                    ${index !== tasks.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}
                    ${task.action && !task.completed 
                      ? 'hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer' 
                      : 'cursor-default'
                    }
                    ${task.completed ? 'bg-gray-50/50 dark:bg-gray-800/30' : 'bg-white dark:bg-gray-800'}
                  `}
                  onClick={task.action && !task.completed ? task.action : undefined}
                >
                  {/* Circular Checkbox */}
                  <div className="flex-shrink-0 mr-3">
                    <div className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200
                      ${task.completed 
                        ? 'border-emerald-500 bg-emerald-500' 
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                      }
                    `}>
                      {task.completed && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>
                  
                  {/* Task Content */}
                  <div className="flex-grow">
                    <p className={`
                      text-sm font-medium transition-colors duration-200
                      ${task.completed 
                        ? 'text-gray-500 dark:text-gray-400 line-through' 
                        : 'text-blue-600 dark:text-blue-400'
                      }
                    `}>
                      {task.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}