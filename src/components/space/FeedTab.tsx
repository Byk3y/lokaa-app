import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, Check, Users, Plus, Edit, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useSpace } from "@/contexts/SpaceContext";
import PostCard from "./PostCard";
import { CreatePostModal } from "@/features/posts/components/CreatePostModal";
import { supabase } from "@/lib/supabase";
import type { Attachment } from "@/features/posts/components/CreatePostModal";
import { useSpaceCategories, SpaceCategory } from "@/hooks/useSpaceCategories";
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';

// Define FetchedPostType
interface GoodCategoryType {
  id: string;
  name: string;
  icon?: string | null;
}
interface ErrorCategoryType {
  error: unknown; 
  // Potentially other fields that Supabase might send in an error, like message: string
}

export interface FetchedPostType {
  id: string;
  created_at: string | null;
  content: string;
  title: string | null;
  like_count: number | null;
  comment_count: number | null;
  user_id: string;
  space_id: string;
  media_urls?: Attachment[] | null;
  category: GoodCategoryType | null; // Simplified: we will process errors into null
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null; 
}

interface FeedTabProps {
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      avatar_url?: string;
    };
  };
  isOwner: boolean;
  isAdmin: boolean;
}

export default function FeedTab({ user, isOwner, isAdmin }: FeedTabProps) {
  const { spaceData, loading: spaceContextLoading, error: spaceContextError } = useSpace();
  const [selectedTab, setSelectedTab] = useState("all");
  
  const [fetchedPosts, setFetchedPosts] = useState<FetchedPostType[]>([]);
  const [postsLoading, setPostsLoading] = useState<boolean>(true);
  const [postsError, setPostsError] = useState<string | null>(null);

  const { 
    categories: spaceCategories, 
    isLoading: categoriesLoading, 
    error: categoriesError, 
    refreshCategories 
  } = useSpaceCategories(spaceData?.id);

  const [setupCompletion, setSetupCompletion] = useState({
    invitePeople: false,
    addDescription: false,
    setCoverImage: false
  });
  
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Callback to refresh posts after creation
  const handlePostCreated = () => {
    if (spaceData?.id) {
      fetchPosts(spaceData.id); // Re-fetch posts
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('action') === 'create-post') {
      setIsCreatePostModalOpen(true);
    } else {
      if (isCreatePostModalOpen && !searchParams.get('action')) {
         setIsCreatePostModalOpen(false);
      }
    }
  }, [location.search, isCreatePostModalOpen]);

  const openCreatePostModal = () => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('action', 'create-post');
    navigate({ search: searchParams.toString() }, { replace: true });
  };

  const closeCreatePostModal = () => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete('action');
    navigate({ search: searchParams.toString() }, { replace: true });
  };
  
  const fetchPosts = async (spaceIdToFetch: string) => {
    if (!spaceIdToFetch) return;
    setPostsLoading(true);
    setPostsError(null);
    try {
      // Step 1: Fetch posts and their categories, including user_id and space_id
      const { data: postsData, error: postsFetchError } = await supabase
        .from('posts')
        .select(`
          id,
          created_at,
          content,
          title,
          like_count,
          comment_count,
          user_id,
          space_id,
          media_urls,
          category:space_categories!left (id, name, icon)
        `)
        .eq('space_id', spaceIdToFetch)
        .order('created_at', { ascending: false });

      if (postsFetchError) {
        throw postsFetchError;
      }

      if (!postsData || postsData.length === 0) {
        setFetchedPosts([]);
      } else {
        // Step 2: Extract unique user_ids
        const userIds = [...new Set(postsData.map(post => post.user_id).filter(id => !!id))];

        const authorsMap: Map<string, FetchedPostType['author']> = new Map();

        // Step 3: Fetch authors if there are user_ids
        if (userIds.length > 0) {
          const { data: authorsData, error: authorsFetchError } = await supabase
            .from('users')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          if (authorsFetchError) {
            console.error("Error fetching authors:", authorsFetchError);
            // Proceed without author details if this step fails
          } else if (authorsData) {
            authorsData.forEach(author => {
              if (author && author.id) { // Ensure author and author.id are not null
                   authorsMap.set(author.id, {
                      id: author.id,
                      full_name: author.full_name,
                      avatar_url: author.avatar_url,
                  });
              }
            });
          }
        }

        // Step 4: Combine posts with author data
        const combinedPosts = postsData.map(post => {
          let mediaUrlsToSet: Attachment[] | null = null;
          if (Array.isArray(post.media_urls)) {
            const filteredAttachments = post.media_urls.filter(
              (att: unknown): att is Partial<Attachment> & Required<Pick<Attachment, 'id' | 'type' | 'url'>> => {
                // First, ensure att is an object with the expected properties
                if (
                  att &&
                  typeof att === 'object' &&
                  att !== null &&
                  'id' in att && typeof (att as {id: unknown}).id === 'string' &&
                  'type' in att && (
                    (att as {type: unknown}).type === 'file' || 
                    (att as {type: unknown}).type === 'link' || 
                    (att as {type: unknown}).type === 'video'
                  ) &&
                  'url' in att && typeof (att as {url: unknown}).url === 'string'
                ) {
                  // Now we know att has id, type, url of the correct basic types
                  // The type guard will further ensure it matches Partial<Attachment> & Required<Pick<Attachment, 'id' | 'type' | 'url'>>
                  return true; 
                }
                return false;
              }
            );

            mediaUrlsToSet = filteredAttachments.map((att): Attachment => ({
              id: att.id, // Known to be string
              type: att.type, // Known to be 'file' | 'link' | 'video'
              url: att.url, // Known to be string
              name: typeof att.name === 'string' ? att.name : undefined,
              fileType: typeof att.fileType === 'string' ? att.fileType : undefined,
              fileSize: typeof att.fileSize === 'number' ? att.fileSize : undefined,
              videoPlatform: 
                att.videoPlatform === 'youtube' || att.videoPlatform === 'vimeo' || att.videoPlatform === 'other'
                ? att.videoPlatform as 'youtube' | 'vimeo' | 'other'
                : undefined,
              isLoading: typeof att.isLoading === 'boolean' ? att.isLoading : undefined,
            }));
          }

          // Defensively handle the category field
          let processedCategory: GoodCategoryType | null = null;
          const rawCategoryFromPost = post.category; // Keep the original reference

          if (rawCategoryFromPost && typeof rawCategoryFromPost === 'object') {
            // Now we know rawCategoryFromPost is an object, we can try to cast and check
            const rawCategory = rawCategoryFromPost as GoodCategoryType | ErrorCategoryType; 

            if ('error' in rawCategory && rawCategory.error !== undefined) { // Check .error specifically
              console.warn(`Error structure received for category on post ID ${post.id}:`, rawCategory);
              processedCategory = null; // Set to null if it's an error structure
            } else if ('id' in rawCategory && 'name' in rawCategory) {
              // Check for essential properties of GoodCategoryType
              processedCategory = rawCategory as GoodCategoryType;
            } else {
              // If it's some other unexpected object structure, treat as null
              processedCategory = null;
            }
          } else {
            // If rawCategoryFromPost is null or not an object, it's null
            processedCategory = null;
          }

          return {
            id: post.id,
            created_at: post.created_at,
            content: post.content,
            title: post.title,
            like_count: post.like_count,
            comment_count: post.comment_count,
            user_id: post.user_id,
            space_id: post.space_id,
            media_urls: mediaUrlsToSet,
            category: processedCategory,
            author: post.user_id ? authorsMap.get(post.user_id) || null : null,
          };
        });
        
        setFetchedPosts(combinedPosts as FetchedPostType[]);
      }

    } catch (err: unknown) {
      console.error("Error in fetchPosts process:", err);
      let errorMessage = "Failed to fetch posts";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        // Check if err.message is a string before assigning
        if (typeof (err as { message: unknown }).message === 'string') {
          errorMessage = (err as { message: string }).message;
        }
      }
      setPostsError(errorMessage);
      setFetchedPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    if (spaceData?.id) {
      fetchPosts(spaceData.id);
    }
  }, [spaceData?.id]);

  useEffect(() => {
    if (spaceData) {
      setSetupCompletion(prev => ({
        ...prev,
        addDescription: !!spaceData.description,
        setCoverImage: !!spaceData.cover_image
      }));
    }
  }, [spaceData]);
  
  const completedTasks = Object.values(setupCompletion).filter(Boolean).length;
  const totalTasks = Object.keys(setupCompletion).length;
  const progressValue = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const handleTaskComplete = (taskId: string) => {
    setSetupCompletion(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleTabSelect = (tab: string) => {
    setSelectedTab(tab);
  };
  
  const buttonHoverVariants = {
    initial: (completed: boolean) => ({
      color: completed ? "#4B5563" : "#111827"
    }),
    hover: {
      color: "#1A8A7E",
      transition: { duration: 0.2 }
    }
  };

  if (spaceContextLoading) {
    return <div className="p-4 text-center">Loading feed...</div>;
  }
  
  if (spaceContextError || !spaceData) {
    return <div className="p-4 text-center text-red-500">Error loading space data</div>;
  }
  
  const userNameForModal = user.email?.split('@')[0] || "Anonymous User";
  const userAvatarForModal = user.user_metadata?.avatar_url;
  
  return (
    <div className="flex-1 space-y-6">
      {/* Create Post Area */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white p-4 rounded-xl shadow-lg border border-gray-200"
      >
        <div className="flex items-center">
          <Avatar className="h-11 w-11 rounded-full mr-4 border-2 border-teal-100 flex-shrink-0">
            <AvatarImage 
              src={user?.user_metadata?.avatar_url} 
              alt={userNameForModal}
            />
            <AvatarFallback className="bg-teal-500 text-white font-medium text-base">
              {userNameForModal?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-grow" onClick={openCreatePostModal} role="button" tabIndex={0} onKeyPress={(e) => e.key === 'Enter' && openCreatePostModal()}>
            <div className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-300 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 text-gray-500 cursor-pointer hover:border-gray-400 transition-colors">
              Write something... or ask a question to your community!
            </div>
          </div>
        </div>
        
        {/* Category Tabs and New Category Button */}
        <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-200" role="tablist">
          <motion.button 
            role="tab"
            aria-selected={selectedTab === "all"}
            onClick={() => handleTabSelect("all")}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${selectedTab === "all" 
                ? 'bg-teal-100 text-teal-700' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            All Posts
          </motion.button>
          {categoriesLoading && <span className="px-3 py-1.5 text-sm text-gray-400">Loading...</span>}
          {categoriesError && <span className="px-3 py-1.5 text-sm text-red-500">Error</span>}
          {!categoriesLoading && !categoriesError && spaceCategories.map((category) => (
            <motion.button 
                key={category.id}
                role="tab"
                aria-selected={selectedTab === category.id}
                onClick={() => handleTabSelect(category.id)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${selectedTab === category.id
                  ? 'bg-teal-100 text-teal-700' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              {category.icon && <span className="mr-1.5">{category.icon}</span>}
              {category.name}
            </motion.button>
          ))}
          
          <div className="ml-auto">
            {(isOwner || isAdmin) && (
              <motion.button 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold bg-teal-500 text-white hover:bg-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 shadow-sm transition-colors"
                onClick={() => {
                  console.log("Create Category button clicked");
                  setIsCategoryModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                <span>New Category</span>
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-[#F5F6F7] rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden"
      >
        <div className="px-4 py-6">
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-[#111827]">Set up your group</h2>
              <span className="text-sm font-medium text-[#4B5563]">{completedTasks}/{totalTasks} Complete</span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="w-full">
                  <Progress 
                    value={progressValue} 
                    className="h-2 rounded-full shadow-sm bg-[#E1E4E8] [&>*]:bg-[#1A8A7E]"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Complete all steps to launch your space faster!</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="space-y-4">
            <motion.div 
              whileHover={{ x: 5 }}
              className="flex items-center"
            >
              <motion.div
                initial={false}
                animate={{ 
                  scale: setupCompletion.invitePeople ? 1 : 0.8, 
                  opacity: setupCompletion.invitePeople ? 1 : 0.7 
                }}
                className={`h-6 w-6 rounded-full border flex items-center justify-center mr-3 transition-all ${
                  setupCompletion.invitePeople ? 'bg-[#1A8A7E] border-[#1A8A7E]' : 'border-[#E1E4E8] bg-transparent'
                }`}
              >
                {setupCompletion.invitePeople && (
                  <Check className="h-3.5 w-3.5 text-white" />
                )}
              </motion.div>
              <motion.button 
                variants={buttonHoverVariants}
                initial="initial"
                whileHover="hover"
                custom={setupCompletion.invitePeople}
                onClick={() => handleTaskComplete("invitePeople")}
                className={`${setupCompletion.invitePeople ? 'line-through' : ''} text-sm font-medium flex items-center text-[#111827]`}
              >
                Invite 3 people
                {!setupCompletion.invitePeople && (
                  <Plus className="h-3.5 w-3.5 ml-1 text-[#4B5563]" />
                )}
              </motion.button>
            </motion.div>
            
            <motion.div 
              whileHover={{ x: 5 }}
              className="flex items-center"
            >
              <motion.div
                initial={false}
                animate={{ 
                  scale: setupCompletion.addDescription ? 1 : 0.8, 
                  opacity: setupCompletion.addDescription ? 1 : 0.7 
                }}
                className={`h-6 w-6 rounded-full border flex items-center justify-center mr-3 transition-all ${
                  setupCompletion.addDescription ? 'bg-[#1A8A7E] border-[#1A8A7E]' : 'border-[#E1E4E8] bg-transparent'
                }`}
              >
                {setupCompletion.addDescription && (
                  <Check className="h-3.5 w-3.5 text-white" />
                )}
              </motion.div>
              <motion.button 
                variants={buttonHoverVariants}
                initial="initial"
                whileHover="hover"
                custom={setupCompletion.addDescription}
                onClick={() => handleTaskComplete("addDescription")}
                className={`${setupCompletion.addDescription ? 'line-through' : ''} text-sm font-medium flex items-center text-[#111827]`}
              >
                Add group description
                {!setupCompletion.addDescription && (
                  <Edit className="h-3.5 w-3.5 ml-1 text-[#4B5563]" />
                )}
              </motion.button>
            </motion.div>
            
            <motion.div 
              whileHover={{ x: 5 }}
              className="flex items-center"
            >
              <motion.div
                initial={false}
                animate={{ 
                  scale: setupCompletion.setCoverImage ? 1 : 0.8, 
                  opacity: setupCompletion.setCoverImage ? 1 : 0.7 
                }}
                className={`h-6 w-6 rounded-full border flex items-center justify-center mr-3 transition-all ${
                  setupCompletion.setCoverImage ? 'bg-[#1A8A7E] border-[#1A8A7E]' : 'border-[#E1E4E8] bg-transparent'
                }`}
              >
                {setupCompletion.setCoverImage && (
                  <Check className="h-3.5 w-3.5 text-white" />
                )}
              </motion.div>
              <motion.button 
                variants={buttonHoverVariants}
                initial="initial"
                whileHover="hover"
                custom={setupCompletion.setCoverImage}
                onClick={() => handleTaskComplete("setCoverImage")}
                className={`${setupCompletion.setCoverImage ? 'line-through' : ''} text-sm font-medium flex items-center text-[#111827]`}
              >
                Set cover image
                {!setupCompletion.setCoverImage && (
                  <Upload className="h-3.5 w-3.5 ml-1 text-[#4B5563]" />
                )}
              </motion.button>
            </motion.div>
          </div>
        </div>
      </motion.div>
      
      {postsLoading && <div className="p-4 text-center">Loading posts...</div>}
      {!postsLoading && postsError && <div className="p-4 text-center text-red-500">{postsError}</div>}
      {!postsLoading && !postsError && fetchedPosts.length === 0 && (
        <div className="p-4 text-center text-gray-500">No posts yet. Be the first to share something!</div>
      )}
      {!postsLoading && !postsError && fetchedPosts.length > 0 && (
        <div className="space-y-6">
          {fetchedPosts
            .filter(post => {
              if (selectedTab === "all") return true;
              return post.category?.id === selectedTab;
            })
            .map(post => (
            <PostCard
              key={post.id}
              id={post.id}
              currentUserId={user.id}
              spaceId={post.space_id}
              author={post.author ? { 
                  id: post.author.id, 
                  name: post.author.full_name || 'Anonymous', 
                  avatar: post.author.avatar_url 
                } : { id: 'unknown', name: 'Anonymous', avatar: null } }
              content={post.content}
              title={post.title} 
              createdAt={new Date(post.created_at || Date.now())} 
              category={post.category}
              likes={post.like_count || 0}
              comments={post.comment_count || 0}
              media_urls={post.media_urls}
            />
          ))}
        </div>
      )}
      
      {spaceData && (
        <CreatePostModal
          isOpen={isCreatePostModalOpen}
          onClose={closeCreatePostModal}
          spaceId={spaceData.id}
          currentUserId={user.id}
          spaceName={spaceData.name || 'Current Space'}
          userName={userNameForModal}
          userAvatarUrl={userAvatarForModal}
          onPostCreated={handlePostCreated}
        />
      )}
      
      {spaceData && (
        <CreateCategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          spaceId={spaceData.id}
          userId={user.id}
          onCategoryCreated={() => {
            setIsCategoryModalOpen(false);
            refreshCategories();
          }}
        />
      )}
    </div>
  );
} 

// Category creation modal component
const CreateCategoryModal = ({ isOpen, onClose, spaceId, userId, onCategoryCreated }: { 
  isOpen: boolean; 
  onClose: () => void;
  spaceId: string;
  userId: string;
  onCategoryCreated: () => void;
}) => {
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('💬');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Common category icons
  const icons = ['💬', '📢', '❓', '💡', '📚', '🔧', '🎯', '🎓', '🎨', '🎮', '💼', '🏆'];

  useEffect(() => {
    if (!isOpen) {
      setCategoryName('');
      setCategoryIcon('💬');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryName.trim()) {
      setError('Category name cannot be empty');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const { data, error: insertError } = await supabase
        .from('space_categories')
        .insert({
          name: categoryName.trim(),
          space_id: spaceId,
          created_by: userId,
          is_archived: false,
          icon: categoryIcon // Store the icon with the category
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating category:', insertError);
        setError(insertError.message);
      } else {
        console.log('Category created successfully:', data);
        onCategoryCreated();
        onClose();
      }
    } catch (e) {
      console.error('Unexpected error during category creation:', e);
      setError('An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg data-[state=open]:animate-contentShow focus:outline-none">
          <Dialog.Title className="text-xl font-semibold text-gray-900 mb-2">
            Create New Category
          </Dialog.Title>
          <Dialog.Description className="text-sm text-gray-500 mb-5">
            Add a new category to help organize discussions in this space.
          </Dialog.Description>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="category-name" className="block text-sm font-medium text-gray-700 mb-1">
                Category Name
              </label>
              <input
                id="category-name"
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Announcements, Questions, Resources"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Choose a clear, descriptive name that reflects the topic of discussion.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Icon (Optional)
              </label>
              <div className="grid grid-cols-6 gap-2">
                {icons.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setCategoryIcon(icon)}
                    className={`h-10 w-10 flex items-center justify-center text-xl rounded-md transition-colors ${
                      categoryIcon === icon 
                        ? 'bg-teal-100 border-2 border-teal-500' 
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70"
              >
                {isCreating ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </form>
          
          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 inline-flex h-6 w-6 appearance-none items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none"
              aria-label="Close"
            >
              <Cross2Icon />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}; 