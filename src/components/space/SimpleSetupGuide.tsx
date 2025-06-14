import { useState, useEffect, useMemo } from 'react';
import { Check, ChevronUp, Users, Edit3, Image as ImageIcon, MessageSquarePlus, Copy, X, Link as LinkIcon } from 'lucide-react';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import useSetupGuideStore from '@/hooks/useSetupGuideStore';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SetupTask {
  id: string;
  label: string;
  icon: React.ElementType;
  completed: boolean;
  action?: () => void;
}

interface SimpleSetupGuideProps {
  spaceId?: string;
  spaceSubdomain?: string;
  onFocusPostEditor?: () => void;
  className?: string;
}

export default function SimpleSetupGuide({ 
  spaceId,
  spaceSubdomain, 
  onFocusPostEditor, 
  className = '' 
}: SimpleSetupGuideProps) {
  const { space: storeSpace } = useSpaceSettingsStore();
  const { user } = useOptimizedAuth();
  const { isCollapsed: getIsCollapsed, setCollapsed } = useSetupGuideStore();
  
  // Use the current space ID, fallback to store space ID
  const currentSpaceId = spaceId || storeSpace?.id || '';
  
  // Get the collapsed state from the global store
  const isCollapsed = getIsCollapsed(currentSpaceId);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // Generate invite link
  const inviteLink = useMemo(() => {
    if (!spaceSubdomain) return "";
    const baseUrl = import.meta.env.VITE_APP_URL || "https://lokaa.com";
    return `${baseUrl}/${spaceSubdomain}`;
  }, [spaceSubdomain]);

  const [tasks, setTasks] = useState<SetupTask[]>([
    {
      id: 'invitePeople',
      label: 'Invite 3 people',
      icon: Users,
      completed: false,
      action: () => setIsInviteModalOpen(true)
    },
    {
      id: 'addDescription', 
      label: 'Add group description',
      icon: Edit3,
      completed: false,
      action: () => openSpaceSettings()
    },
    {
      id: 'setCoverImage',
      label: 'Set cover image', 
      icon: ImageIcon,
      completed: false,
      action: () => openSpaceSettings()
    },
    {
      id: 'writeFirstPost',
      label: 'Write your first post',
      icon: MessageSquarePlus,
      completed: false,
      action: () => onFocusPostEditor?.()
    }
  ]);

  // Check if setup is complete
  const isSetupComplete = tasks.every(task => task.completed);

  // Function to open space settings
  const openSpaceSettings = () => {
    if (!user?.id) {
      toast({ 
        title: "Error", 
        description: "You must be logged in to access settings.", 
        variant: "destructive" 
      });
      return;
    }

    if (storeSpace?.id && spaceSubdomain) {
      // Load the space first, then open modal
      const storeActions = useSpaceSettingsStore.getState();
      storeActions.loadActiveSpace({ subdomain: spaceSubdomain, spaceId: storeSpace.id }, user.id, true)
        .then(() => {
          const updatedStoreActions = useSpaceSettingsStore.getState();
          updatedStoreActions.openModal();
          toast({ 
            title: "Settings opened", 
            description: "Both description and cover image can be updated in the General tab." 
          });
        })
        .catch((error) => {
          console.error('Error opening settings:', error);
          toast({ 
            title: "Error", 
            description: "Could not open settings. Please try again.", 
            variant: "destructive" 
          });
        });
    } else {
      toast({ 
        title: "Error", 
        description: "Space information not available. Please refresh the page.", 
        variant: "destructive" 
      });
    }
  };

  // Function to copy invite link
  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink)
      .then(() => {
        setIsCopied(true);
        toast({ title: "Copied!", description: "Invite link copied to clipboard." });
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(() => toast({ 
        title: "Error", 
        description: "Failed to copy invite link.", 
        variant: "destructive" 
      }));
  };

  // Check task completion status
  useEffect(() => {
    if (!storeSpace || !user || !storeSpace.id) return;

    const checkTasksCompletion = async () => {
      const updatedTasks = await Promise.all(
        tasks.map(async (task) => {
          let completed = false;

          switch (task.id) {
            case 'addDescription':
              completed = !!(storeSpace.description && storeSpace.description.trim().length > 10);
              break;
            case 'setCoverImage':
              completed = !!(storeSpace.cover_image && 
                storeSpace.cover_image !== 'DEFAULT_COVER_IMAGE_URL' && 
                storeSpace.cover_image !== '/default-space-cover.jpg');
              break;
            case 'writeFirstPost':
              const { count } = await getSupabaseClient()
                .from('posts')
                .select('id', { count: 'exact', head: true })
                .eq('space_id', storeSpace.id)
                .eq('user_id', user.id);
              completed = (count ?? 0) > 0;
              break;
            case 'invitePeople':
              // For now, this remains manually completable
              completed = task.completed;
              break;
            default:
              completed = task.completed;
              break;
          }

          return { ...task, completed };
        })
      );

      setTasks(updatedTasks);
    };

    checkTasksCompletion();
  }, [storeSpace, user]);



  const completedCount = tasks.filter(task => task.completed).length;

  return (
    <div className={`
      bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden
      w-full min-w-0 max-w-none rounded-none
      sm:rounded-xl sm:w-[768px] sm:min-w-[768px] sm:max-w-[768px] sm:flex-shrink-0 sm:flex-grow-0
      ${className}
    `}>
      {/* Header - Always clickable */}
      <div 
        className="px-4 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        onClick={() => setCollapsed(currentSpaceId, !isCollapsed)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Setup your space
            </h3>
          </div>
          <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors">
            <ChevronUp 
              className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} 
            />
          </button>
        </div>
      </div>

      {/* Task List */}
      {!isCollapsed && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          <div className="p-2 space-y-1">
            {tasks.map((task) => (
              <div
                key={task.id}
                                  className={`flex items-center space-x-3 p-1 rounded-lg transition-colors ${
                    task.action ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' : ''
                  }`}
                onClick={task.action}
              >
                {/* Checkbox */}
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  task.completed 
                    ? 'bg-teal-500 border-teal-500' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-teal-400'
                }`}>
                  {task.completed && (
                    <Check className="w-2.5 h-2.5 text-white" />
                  )}
                </div>

                {/* Task Content */}
                <div className="flex-1">
                  <span className={`text-sm ${
                    task.completed 
                      ? 'text-gray-500 dark:text-gray-400 line-through' 
                      : 'text-teal-600 dark:text-teal-400'
                  }`}>
                    {task.label}
                  </span>
                </div>

                {/* Task Icon */}
                <task.icon className={`w-4 h-4 ${
                  task.completed 
                    ? 'text-gray-400 dark:text-gray-500' 
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Footer (only when not collapsed and setup is complete) */}
      {!isCollapsed && isSetupComplete && (
        <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            <span className="text-green-600 dark:text-green-400 font-medium">
              ✅ Setup Complete! Your space is ready to go.
            </span>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md relative">
            <Button
              variant="ghost"
              className="absolute top-3 right-3 h-8 w-8 p-0"
              onClick={() => setIsInviteModalOpen(false)}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
            <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">
              Invite Members to {storeSpace?.name || 'your space'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Share this link with anyone you want to invite to this space.
            </p>
            <div className="flex items-center space-x-2 mb-4">
              <Input 
                id="invite-link" 
                readOnly 
                value={inviteLink} 
                className="flex-1"
                aria-label="Invite link"
              />
              <Button onClick={copyInviteLink} variant="outline" size="sm">
                {isCopied ? <Check className="h-4 w-4 mr-2" /> : <LinkIcon className="h-4 w-4 mr-2" />}
                {isCopied ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Anyone with this link will be able to join this space.
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 