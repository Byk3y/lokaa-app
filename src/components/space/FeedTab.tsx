import { useState, useEffect, useRef, forwardRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, Check, Users, Plus, Edit, Image as ImageIcon, X, GripVertical, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth, type User as AuthUserType } from "@/contexts/AuthContext";
import { useSpace } from "@/contexts/SpaceContext";
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
import PostCard, { type PostCardProps } from "./PostCard";
import { CreatePostModal } from "@/features/posts";
import { supabase } from "@/lib/supabase";
import type { Attachment } from "@/features/posts/types";
import { useSpaceCategories, SpaceCategory } from "@/hooks/useSpaceCategories";
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';
import SpaceInfoSidebar from "./SpaceInfoSidebar";
import SetupTasksGuide from "./SetupTasksGuide";
import PostDetailModal from "./post-detail-modal";
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import DraggablePostCard from "./DraggablePostCard";

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
    profile_url: string | null;
    activity_score?: number | null;
  } | null; 
  is_pinned?: boolean;
  pinned_at?: string | null;
  pin_position?: number | null;
  pin_category?: string | null;
  edited_at?: string | null;
  poll_data?: string[] | null; // Add this field for poll data
}

interface FeedTabProps {
  user: AuthUserType;
  isOwner: boolean;
  isAdmin: boolean;
  postInputRef?: React.RefObject<HTMLTextAreaElement | HTMLInputElement>;
}

// Define an interface for Owner details if we fetch them separately
interface OwnerDetails {
  display_name: string | null;
  avatar_url: string | null;
}

// Add this utility function to update pin positions outside the component
const updatePinPositions = async (posts: FetchedPostType[], supabaseClient: any) => {
  try {
    // Only update positions for pinned posts
    const pinnedPosts = posts.filter(post => post.is_pinned);
    
    // Create a batch of updates for all pin positions
    const updates = pinnedPosts.map((post, index) => ({
      id: post.id,
      pin_position: index + 1 // 1-based position
    }));
    
    // Update all posts in a single batch operation
    if (updates.length > 0) {
      
      // Use RPC function if available for more robust server-side handling
      try {
        // First try using the update_pin_positions function if it exists
        const { data, error } = await supabaseClient
          .rpc('update_pin_positions', { 
            post_ids: updates.map(u => u.id), 
            category: pinnedPosts[0]?.pin_category || 'general'
          });
        
        if (error) {
          console.log('RPC function not available, falling back to direct update:', error);
          // Fall back to direct update
          const { error: upsertError } = await supabaseClient
            .from('posts')
            .upsert(updates, { onConflict: 'id' });
          
          if (upsertError) {
            console.error('Error updating pin positions:', upsertError);
            return false;
          }
        } else {
          console.log('Successfully updated pin positions via RPC');
        }
      } catch (rpcError) {
        // RPC function might not exist, so fall back to direct update
        console.log('RPC failed, using direct update instead');
        const { error: upsertError } = await supabaseClient
          .from('posts')
          .upsert(updates, { onConflict: 'id' });
        
        if (upsertError) {
          console.error('Error updating pin positions:', upsertError);
          return false;
        }
      }
    }
    
    return true;
  } catch (err) {
    console.error('Exception updating pin positions:', err);
    return false;
  }
};

export default function FeedTab({ user: userProp, isOwner: isOwnerProp, isAdmin: isAdminProp, postInputRef }: FeedTabProps) {
  // Prioritize user from useAuth hook
  const { user: authUser, loading: authLoading } = useAuth();
  const currentUser = authUser || userProp; // Fallback to prop if authUser is null

  // Use space data and permissions from the store
  const { 
    space: storeSpace, 
    permissions: storePermissions, 
    loadingSpace: storeLoadingSpace,
    loadingPermissions: storeLoadingPermissions,
  } = useSpaceSettingsStore();
  
  // Fallback to useSpace context if storeSpace is not available (optional, depending on setup)
  const { spaceData: contextSpaceData, loading: spaceContextLoading } = useSpace();
  const currentSpaceData = storeSpace || contextSpaceData; // Prioritize store
  
  const [selectedTab, setSelectedTab] = useState("all");
  const [fetchedPosts, setFetchedPosts] = useState<FetchedPostType[]>([]);
  const [postsLoading, setPostsLoading] = useState<boolean>(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const { 
    categories: spaceCategories, 
    isLoading: categoriesLoading, 
    error: categoriesError, 
    refreshCategories 
  } = useSpaceCategories(currentSpaceData?.id);
  
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // State for owner details to be passed to sidebar
  const [ownerDetails, setOwnerDetails] = useState<OwnerDetails | null>(null);
  const [adminCount, setAdminCount] = useState<number | null>(null); 
  const [onlineCount, setOnlineCount] = useState<number | null>(null); // State for online count
  const [activeMemberCount, setActiveMemberCount] = useState<number | null>(null); // State for active member count

  // State for PostDetailModal
  const [selectedPostForModal, setSelectedPostForModal] = useState<PostCardProps | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  // Add state to control SetupTasksGuide visibility
  const [showSetupGuide, setShowSetupGuide] = useState(true);
  const [setupGuideComplete, setSetupGuideComplete] = useState(false);
  const isAdminOrOwner = storePermissions?.isOwner || storePermissions?.isAdmin;
  const spaceId = currentSpaceData?.id;

  // New state for pinned posts
  const [pinnedPosts, setPinnedPosts] = useState<FetchedPostType[]>([]);

  // New state for dragging state
  const [isDragging, setIsDragging] = useState(false);

  // On mount or when spaceId or completion changes, check localStorage for dismissed state
  useEffect(() => {
    if (!spaceId) return;
    const dismissed = localStorage.getItem(`setupGuideDismissed_${spaceId}`) === 'true';
    // Show only if not dismissed, user is owner/admin, and not complete
    setShowSetupGuide(isAdminOrOwner && !dismissed && !setupGuideComplete);
  }, [spaceId, isAdminOrOwner, setupGuideComplete]);

  // Function to update comment count on PostCard when a comment is added in modal
  const handleCommentAddedInModal = (postId: string, newCommentCount: number) => {
    setFetchedPosts(prevPosts =>
      prevPosts.map(p =>
        p.id === postId ? { ...p, comment_count: newCommentCount } : p
      )
    );
  };

  // Function to update like count on PostCard and modal when a like is toggled
  const handleLikeToggledInCard = (postId: string, newLikeCount: number) => {
    setFetchedPosts(prevPosts =>
      prevPosts.map(p =>
        p.id === postId ? { ...p, like_count: newLikeCount } : p
      )
    );
    setSelectedPostForModal(prev =>
      prev && prev.id === postId ? { ...prev, likes: newLikeCount } : prev
    );
  };

  // Function to fetch space owner details
  const fetchOwnerDetails = async (ownerId: string) => {
    if (!ownerId) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('full_name, avatar_url, profile_url')
        .eq('id', ownerId)
        .single();
        
      if (error) {
        console.error("Error fetching owner details:", error);
        return;
      }
      
      if (data) {
        setOwnerDetails({
          display_name: data.full_name,
          avatar_url: data.avatar_url
        });
      }
    } catch (err) {
      console.error("Exception while fetching owner details:", err);
    }
  };

  // Effect to fetch owner details when space data is loaded
  useEffect(() => {
    if (currentSpaceData?.owner_id) {
      fetchOwnerDetails(currentSpaceData.owner_id);
    }
    if (currentSpaceData?.id) {
      fetchAdminCount(currentSpaceData.id);
      fetchOnlineCount(currentSpaceData.id);
      fetchActiveMemberCount(currentSpaceData.id); // Call fetchActiveMemberCount
    }
  }, [currentSpaceData?.id, currentSpaceData?.owner_id]);

  // Function to fetch admin count
  const fetchAdminCount = async (spaceIdToFetch: string) => {
    if (!spaceIdToFetch) return;
    try {
      const { count, error } = await supabase
        .from('space_members') 
        .select('id', { count: 'exact', head: true })
        .eq('space_id', spaceIdToFetch)
        .eq('role', 'admin'); // Query only for 'admin' role to fix linter error and count designated admins

      if (error) {
        console.error("Error fetching admin count:", error);
        setAdminCount(0); 
        return;
      }
      setAdminCount(count ?? 0);
    } catch (err) {
      console.error("Exception while fetching admin count:", err);
      setAdminCount(0); 
    }
  };

  // Function to fetch online count
  const fetchOnlineCount = async (spaceIdToFetch: string) => {
    if (!spaceIdToFetch) return;
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('space_members')
        .select('id', { count: 'exact', head: true })
        .eq('space_id', spaceIdToFetch)
        .eq('is_online', true) // This assumes 'is_online' is accurately maintained
        // Alternative: .gte('last_active_at', fifteenMinutesAgo) if 'is_online' is not reliable
      
      if (error) {
        console.error("Error fetching online count:", error);
        setOnlineCount(0);
        return;
      }
      setOnlineCount(count ?? 0);
    } catch (err) {
      console.error("Exception while fetching online count:", err);
      setOnlineCount(0);
    }
  };

  // Function to fetch active member count
  const fetchActiveMemberCount = async (spaceIdToFetch: string) => {
    if (!spaceIdToFetch) return;
    try {
      const { count, error } = await supabase
        .from('space_members')
        .select('id', { count: 'exact', head: true })
        .eq('space_id', spaceIdToFetch)
        .eq('status', 'active'); // Query for active members

      if (error) {
        console.error("Error fetching active member count:", error);
        setActiveMemberCount(0);
        return;
      }
      setActiveMemberCount(count ?? 0);
    } catch (err) {
      console.error("Exception while fetching active member count:", err);
      setActiveMemberCount(0);
    }
  };

  // Function to focus the post editor
  const handlePostCreated = () => {
    if (currentSpaceData?.id) {
      fetchPosts(currentSpaceData.id);
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
  
  // Function to update pin status when a post is pinned/unpinned
  const handlePinToggled = async (postId: string, isPinned: boolean, category?: string | null) => {
    // If we're pinning and we already have 4 pinned posts, one will be automatically unpinned by the DB
    const currentPinnedCount = pinnedPosts.length;
    
    if (isPinned) {
      // Find the post in fetchedPosts
      const postToPin = fetchedPosts.find(p => p.id === postId);
      if (postToPin) {
        if (currentPinnedCount >= 4) {
          // We know the DB will auto-unpin the oldest post, so we need to fetch all posts again to stay in sync
          if (currentSpaceData?.id) {
            await fetchPosts(currentSpaceData.id);
            return; // Exit early as fetchPosts will update both state variables
          }
        } else {
          // Normal case - we're under the limit
          // Add it to pinnedPosts with updated properties
          setPinnedPosts(prev => [
            { ...postToPin, is_pinned: true, pin_category: category || null },
            ...prev
          ]);
          
          // Keep it in fetchedPosts but with updated is_pinned (the UI filter will hide it)
          setFetchedPosts(prevPosts =>
            prevPosts.map(p =>
              p.id === postId ? { ...p, is_pinned: true, pin_category: category || null } : p
            )
          );
        }
      }
    } else {
      // Get the post from pinnedPosts before removing it
      const unpinnedPost = pinnedPosts.find(p => p.id === postId);
      
      // Remove from pinnedPosts
      setPinnedPosts(prev => prev.filter(p => p.id !== postId));
      
      if (unpinnedPost) {
        // Update in fetchedPosts to show in regular list again
        setFetchedPosts(prevPosts => {
          // Check if it's already in fetchedPosts
          const existsInFetched = prevPosts.some(p => p.id === postId);
          
          if (existsInFetched) {
            // Just update it
            return prevPosts.map(p =>
              p.id === postId ? { ...p, is_pinned: false, pin_category: null } : p
            );
          } else {
            // Add it to fetchedPosts with updated properties
            return [...prevPosts, { ...unpinnedPost, is_pinned: false, pin_category: null }];
          }
        });
      }
    }
    
    // Update the modal if it's open with this post
    setSelectedPostForModal(prev =>
      prev && prev.id === postId ? { ...prev, isPinned, pinCategory: category } : prev
    );
  };
  
  const fetchPosts = async (spaceIdToFetch: string) => {
    if (!spaceIdToFetch) return;
    setPostsLoading(true);
    setPostsError(null);
    try {
      const { data, error: postsFetchError } = await supabase
        .from('posts')
        .select('id, created_at, content, title, like_count, comment_count, user_id, space_id, media_urls, category:space_categories!left (id, name, icon), is_pinned, pinned_at, pin_position, pin_category, edited_at, poll_data')
        .eq('space_id', spaceIdToFetch)
        .order('created_at', { ascending: false });
        
      if (postsFetchError) throw postsFetchError;
      
      // Safely typecast the data to avoid TypeScript errors
      const postsData = data as any[] | null;
      
      if (!postsData || postsData.length === 0) {
        setFetchedPosts([]);
        setPinnedPosts([]);
      } else {
        const userIds = [...new Set(postsData.map(post => post.user_id).filter(id => !!id))];
        const authorsMap: Map<string, FetchedPostType['author']> = new Map();
        if (userIds.length > 0) {
          const { data: authorsData, error: authorsFetchError } = await supabase
            .from('users')
            .select('id, full_name, avatar_url, profile_url, activity_score')
            .in('id', userIds);
          if (authorsFetchError) console.error("Error fetching authors:", authorsFetchError);
          else if (authorsData) {
            authorsData.forEach(author => {
              if (author && author.id) {
                   authorsMap.set(author.id, {
                      id: author.id,
                      full_name: author.full_name,
                      avatar_url: author.avatar_url,
                      profile_url: author.profile_url,
                      activity_score: author.activity_score,
                  });
              }
            });
          }
        }
        const combinedPosts = postsData.map(post => {
          let mediaUrlsToSet: Attachment[] | null = null;
          if (Array.isArray(post.media_urls)) {
            const filteredAttachments = post.media_urls.filter(
              (att: unknown): att is Partial<Attachment> & Required<Pick<Attachment, 'id' | 'type' | 'url'>> => {
                if (att && typeof att === 'object' && att !== null && 'id' in att && typeof (att as {id: unknown}).id === 'string' && 'type' in att && ((att as {type: unknown}).type === 'file' || (att as {type: unknown}).type === 'link' || (att as {type: unknown}).type === 'video') && 'url' in att && typeof (att as {url: unknown}).url === 'string') {
                  return true; 
                }
                return false;
              }
            );
            mediaUrlsToSet = filteredAttachments.map((att): Attachment => ({
              id: att.id,
              type: att.type,
              url: att.url,
              name: typeof att.name === 'string' ? att.name : undefined,
              fileType: typeof att.fileType === 'string' ? att.fileType : undefined,
              fileSize: typeof att.fileSize === 'number' ? att.fileSize : undefined,
              videoPlatform: att.videoPlatform === 'youtube' || att.videoPlatform === 'vimeo' || att.videoPlatform === 'other' ? att.videoPlatform as 'youtube' | 'vimeo' | 'other' : undefined,
              isLoading: typeof att.isLoading === 'boolean' ? att.isLoading : undefined,
            }));
          }
          let processedCategory: GoodCategoryType | null = null;
          const rawCategoryFromPost = post.category;
          if (rawCategoryFromPost && typeof rawCategoryFromPost === 'object') {
            const rawCategory = rawCategoryFromPost as GoodCategoryType | ErrorCategoryType; 
            if ('error' in rawCategory && rawCategory.error !== undefined) {
              console.warn(`Error structure received for category on post ID ${post.id}:`, rawCategory);
              processedCategory = null;
            } else if ('id' in rawCategory && 'name' in rawCategory) {
              processedCategory = rawCategory as GoodCategoryType;
            } else {
              processedCategory = null;
            }
          } else {
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
            is_pinned: post.is_pinned || false,
            pinned_at: post.pinned_at,
            pin_position: post.pin_position,
            pin_category: post.pin_category,
            edited_at: post.edited_at,
            poll_data: post.poll_data,
          };
        });
        
        const allPosts = combinedPosts as FetchedPostType[];
        // Separate pinned posts
        const pinnedPostsTemp = allPosts.filter(post => post.is_pinned);
        const unpinnedPosts = allPosts.filter(post => !post.is_pinned);
        
        // Sort pinned posts by pin_position if available
        // First sort by pinned_at (newest first) as fallback
        pinnedPostsTemp.sort((a, b) => {
          // Make sure we have valid date strings before creating Date objects
          if (b.pinned_at && a.pinned_at && typeof b.pinned_at === 'string' && typeof a.pinned_at === 'string') {
            try {
              const dateB = new Date(b.pinned_at);
              const dateA = new Date(a.pinned_at);
              // Ensure both are valid dates before calling getTime()
              if (!isNaN(dateB.getTime()) && !isNaN(dateA.getTime())) {
                return dateB.getTime() - dateA.getTime();
              }
            } catch (e) {
              console.error("Error parsing dates for pinned posts:", e);
            }
          }
          return 0;
        });
        
        // Then sort by pin_position (if available)
        pinnedPostsTemp.sort((a, b) => {
          if (a.pin_position !== null && b.pin_position !== null) {
            return a.pin_position - b.pin_position;
          }
          return 0;
        });
        
        setPinnedPosts(pinnedPostsTemp);
        setFetchedPosts(unpinnedPosts);
      }
    } catch (err: unknown) {
      console.error("Error in fetchPosts process:", err);
      let errorMessage = "Failed to fetch posts";
      if (err instanceof Error) errorMessage = err.message;
      else if (typeof err === 'string') errorMessage = err;
      else if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
          errorMessage = (err as { message: string }).message;
      }
      setPostsError(errorMessage);
      setFetchedPosts([]);
      setPinnedPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    if (currentSpaceData?.id) {
      fetchPosts(currentSpaceData.id);
    }
  }, [currentSpaceData?.id]);

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

  // Handler to open the post detail modal
  const handlePostCardClick = (post: PostCardProps) => {
    setSelectedPostForModal(post);
    setIsPostModalOpen(true);
  };

  // Map FetchedPostType to PostCardProps
  const mapPostToCardProps = (post: FetchedPostType): PostCardProps => {
    return {
      id: post.id,
      spaceId: post.space_id,
      currentUserId: currentUser?.id,
      author: {
        id: post.author?.id || '',
        name: post.author?.full_name || 'Unknown User',
        avatar: post.author?.avatar_url || null,
        profile_url: post.author?.profile_url || null,
        activity_score: post.author?.activity_score || 0,
      },
      title: post.title,
      content: post.content,
      createdAt: post.created_at || new Date().toISOString(),
      editedAt: post.edited_at,
      category: post.category ? {
        id: post.category.id,
        name: post.category.name,
        icon: post.category.icon || null,
      } : null,
      likes: post.like_count || 0,
      comments: post.comment_count || 0,
      media_urls: post.media_urls || null,
      isPinned: post.is_pinned || false,
      pinCategory: post.pin_category || null,
      isAdmin: effectiveIsAdmin,
      poll_data: post.poll_data || null,
    };
  };

  const handleClosePostModal = () => {
    setIsPostModalOpen(false);
    setSelectedPostForModal(null);
  };
  
  // Handler for when a post is updated through editing
  const handlePostUpdated = (updatedPost: PostCardProps) => {
    // Update the post in the fetchedPosts array
    setFetchedPosts(prev => 
      prev.map(post => 
        post.id === updatedPost.id 
          ? {
              ...post,
              content: updatedPost.content,
              title: updatedPost.title,
              edited_at: updatedPost.editedAt
            } 
          : post
      )
    );
    
    // Update the post in the pinnedPosts array if it exists there
    setPinnedPosts(prev => 
      prev.map(post => 
        post.id === updatedPost.id 
          ? {
              ...post,
              content: updatedPost.content,
              title: updatedPost.title,
              edited_at: updatedPost.editedAt
            } 
          : post
      )
    );
    
    // Update the selected post for the modal
    setSelectedPostForModal(updatedPost);
  };

  // Handler for when a post is deleted
  const handlePostDeleted = (postId: string) => {
    // Remove the post from the fetchedPosts array
    setFetchedPosts(prev => prev.filter(post => post.id !== postId));
    
    // Remove the post from pinnedPosts array if it exists there
    setPinnedPosts(prev => prev.filter(post => post.id !== postId));
    
    // Close the post modal if it was open
    setIsPostModalOpen(false);
    setSelectedPostForModal(null);
    
    // Refresh the posts to update counts and ensure consistency
    if (currentSpaceData?.id) {
      fetchPosts(currentSpaceData.id);
    }
  };

  // Handle drag end event for pinned posts reordering
  const handleDragEnd = async (result: any) => {
    setIsDragging(false);
    
    // If dropped outside valid drop area, do nothing
    if (!result.destination) return;
    
    // If position didn't change, do nothing
    if (result.destination.index === result.source.index) return;
    
    // Get only the posts that match the current tab for reordering
    const visiblePosts = pinnedPosts
      .filter(post => selectedTab === "all" || post.category?.id === selectedTab || post.pin_category === selectedTab);
    
    // Reorder the visible posts
    const newVisiblePosts = [...visiblePosts];
    const [movedPost] = newVisiblePosts.splice(result.source.index, 1);
    newVisiblePosts.splice(result.destination.index, 0, movedPost);
    
    // Update all pinned posts by replacing the filtered set with the reordered set
    const newPinnedPosts = [...pinnedPosts];
    let currentIndex = 0;
    
    for (let i = 0; i < newPinnedPosts.length; i++) {
      const post = newPinnedPosts[i];
      const isVisible = selectedTab === "all" || post.category?.id === selectedTab || post.pin_category === selectedTab;
      
      if (isVisible) {
        // Replace with reordered post
        newPinnedPosts[i] = newVisiblePosts[currentIndex];
        currentIndex++;
      }
    }
    
    // Update state with new order
    setPinnedPosts(newPinnedPosts);
    
    console.log("Updating pin positions in database...");
    
    // Save new order to database
    const success = await updatePinPositions(newPinnedPosts, supabase);
    
    if (!success) {
      console.error("Failed to update pin positions in database");
      // Could add a toast notification here
    } else {
      console.log("Pin positions updated successfully");
    }
  };
  
  // Handle drag start
  const handleDragStart = (start: any) => {
    setIsDragging(true);
  };

  if (authLoading || storeLoadingSpace || (!currentSpaceData && !postsError)) {
    return <div className="p-4 text-center">Loading feed and space information...</div>;
  }
  
  // Use effective permissions from store if available, otherwise fallback to props
  const effectiveIsOwner = storePermissions?.isOwner ?? isOwnerProp;
  const effectiveIsAdmin = storePermissions?.isAdmin ?? isAdminProp;
  const canAccessSettings = storePermissions?.canAccessSettings ?? false;

  if (!currentSpaceData) {
    return <div className="p-4 text-center text-red-500">Error: Space data not available for feed.</div>;
  }
  
  const userNameForModal = currentUser?.email?.split('@')[0] || "Anonymous User";
  const userAvatarForModal = currentUser?.user_metadata?.avatar_url;
  
  return (
    <div className="flex flex-col lg:flex-row gap-x-8 gap-y-4 sm:px-4 sm:py-3">
      {/* Main Feed Content */}
      <div className="flex-grow space-y-3 sm:space-y-4">
        {/* Composer Area - Mobile Optimized */}
        <div className="bg-white dark:bg-gray-800 shadow-sm sm:shadow px-0 pb-3 rounded-none sm:rounded-lg sm:p-4">
          <div className="flex items-center space-x-2 sm:space-x-3 px-3 sm:px-0">
            <Avatar className="h-10 w-10 sm:h-11 sm:w-11">
              <AvatarImage src={currentUser?.user_metadata?.avatar_url || undefined} />
              <AvatarFallback>{currentUser?.email?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div 
              className="flex-grow h-10 sm:h-11 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 rounded-full flex items-center text-gray-500 dark:text-gray-400 cursor-text hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={openCreatePostModal}
              role="button"
              tabIndex={0}
            >
              Write something...
            </div> 
          </div>
        
          {/* Category Tabs - Mobile Optimized */}
          <div className="mt-2 sm:mt-4 pt-1 sm:pt-3 flex items-center space-x-2 overflow-x-auto pb-1 px-3 sm:px-0" role="tablist">
            <motion.button 
              role="tab"
              aria-selected={selectedTab === "all"}
              onClick={() => handleTabSelect("all")}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 whitespace-nowrap ${selectedTab === "all" 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              All
            </motion.button>
            {!categoriesLoading && !categoriesError && spaceCategories.map((category) => (
              <motion.button 
                  key={category.id}
                  role="tab"
                  aria-selected={selectedTab === category.id}
                  onClick={() => handleTabSelect(category.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 whitespace-nowrap ${selectedTab === category.id
                    ? 'bg-gray-700 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {category.icon && <span className="mr-1 sm:mr-1.5">{category.icon}</span>}
                {category.name}
              </motion.button>
            ))}
            
            {(effectiveIsOwner || effectiveIsAdmin) && (
              <motion.button 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="flex-shrink-0 flex items-center justify-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 whitespace-nowrap"
                onClick={() => setIsCategoryModalOpen(true)}
              >
                <Tag className="h-4 w-4 mr-1 sm:mr-1.5" />
                Edit
              </motion.button>
            )}
          </div>
        </div>
        
        {/* Render SetupTasksGuide here */}
        {currentSpaceData && showSetupGuide && (
            <SetupTasksGuide 
                spaceSubdomain={currentSpaceData.subdomain} 
                onFocusPostEditor={() => {
                    if (postInputRef?.current) {
                        postInputRef.current.focus();
                    }
                }} 
            renderHeader={({ currentScore, maxPossibleScore }) => (
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-md font-semibold text-gray-800 dark:text-white">Space Setup Guide</h3>
                <span className="font-bold text-teal-500 dark:text-teal-400 text-md">{currentScore} <span className='text-xs'>XP</span></span>
                <button
                  className="ml-2 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 focus:outline-none"
                  aria-label="Close setup guide"
                  onClick={() => {
                    localStorage.setItem(`setupGuideDismissed_${spaceId}`, 'true');
                    setShowSetupGuide(false);
                  }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            onCompleteChange={setSetupGuideComplete}
          />
        )}
        
        {/* Pinned Posts */}
        {!postsLoading && !postsError && pinnedPosts.length > 0 && selectedTab === "all" && (
          <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
            <h3 className="font-semibold text-base sm:text-lg text-gray-800 flex items-center">
              <span className="mr-1.5 sm:mr-2">📌</span> Pinned
              {(effectiveIsOwner || effectiveIsAdmin) && (
                <span className={`ml-2 text-xs ${isDragging ? 'text-teal-600 font-medium' : 'text-gray-500'} transition-colors`}>
                  {isDragging ? "Drop post to reorder" : (
                    <span className="flex items-center">
                      <GripVertical size={14} className="mr-1 text-gray-400" />
                      Drag handles to reorder
                    </span>
                  )}
                </span>
              )}
            </h3>
            
            <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
              <Droppable droppableId="pinned-posts" isDropDisabled={!(effectiveIsOwner || effectiveIsAdmin)}>
                {(provided) => (
                  <div 
                    className="space-y-6"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {pinnedPosts
                      .filter(post => selectedTab === "all" || post.category?.id === selectedTab || post.pin_category === selectedTab)
                      .map((post, index) => (
                        <DraggablePostCard
                          key={`pinned-${post.id}`}
                          draggableId={`pinned-${post.id}`}
                          index={index}
                          isDragDisabled={!(effectiveIsOwner || effectiveIsAdmin)}
                          id={post.id}
                          currentUserId={currentUser.id}
                          spaceId={post.space_id}
                          author={post.author ? { 
                            id: post.author.id, 
                            name: post.author.full_name || 'Anonymous', 
                            avatar: post.author.avatar_url,
                            profile_url: post.author.profile_url,
                            activity_score: post.author.activity_score || 0
                          } : { id: 'unknown', name: 'Anonymous', avatar: null } }
                          content={post.content}
                          title={post.title} 
                          createdAt={new Date(post.created_at || Date.now())} 
                          editedAt={post.edited_at}
                          category={post.category}
                          likes={post.like_count || 0}
                          comments={post.comment_count || 0}
                          media_urls={post.media_urls}
                          isPinned={true}
                          pinCategory={post.pin_category}
                          isAdmin={effectiveIsAdmin || effectiveIsOwner}
                          poll_data={post.poll_data}
                          onPostClick={handlePostCardClick}
                          onLikeToggled={handleLikeToggledInCard}
                          onPinToggled={handlePinToggled}
                        />
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        )}
        
        {/* Category-specific Pinned Posts */}
        {!postsLoading && !postsError && pinnedPosts.length > 0 && selectedTab !== "all" && (
          <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
            <h3 className="font-semibold text-base sm:text-lg text-gray-800 flex items-center">
              <span className="mr-1.5 sm:mr-2">📌</span> Pinned in {spaceCategories.find(cat => cat.id === selectedTab)?.name || selectedTab}
              {(effectiveIsOwner || effectiveIsAdmin) && (
                <span className="ml-2 text-xs text-gray-500 italic">
                  {isDragging ? "Drop to reorder" : "Drag to reorder"}
                </span>
              )}
            </h3>
            
            <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
              <Droppable droppableId="pinned-category-posts" isDropDisabled={!(effectiveIsOwner || effectiveIsAdmin)}>
                {(provided) => (
                  <div 
                    className="space-y-6"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {pinnedPosts
                      .filter(post => post.category?.id === selectedTab || post.pin_category === selectedTab)
                      .map((post, index) => (
                        <DraggablePostCard
                          key={`pinned-${post.id}`}
                          draggableId={`pinned-${post.id}`}
                          index={index}
                          isDragDisabled={!(effectiveIsOwner || effectiveIsAdmin)}
                          id={post.id}
                          currentUserId={currentUser.id}
                          spaceId={post.space_id}
                          author={post.author ? { 
                            id: post.author.id, 
                            name: post.author.full_name || 'Anonymous', 
                            avatar: post.author.avatar_url,
                            profile_url: post.author.profile_url,
                            activity_score: post.author.activity_score || 0
                          } : { id: 'unknown', name: 'Anonymous', avatar: null } }
                          content={post.content}
                          title={post.title} 
                          createdAt={new Date(post.created_at || Date.now())} 
                          editedAt={post.edited_at}
                          category={post.category}
                          likes={post.like_count || 0}
                          comments={post.comment_count || 0}
                          media_urls={post.media_urls}
                          isPinned={true}
                          pinCategory={post.pin_category}
                          isAdmin={effectiveIsAdmin || effectiveIsOwner}
                          poll_data={post.poll_data}
                          onPostClick={handlePostCardClick}
                          onLikeToggled={handleLikeToggledInCard}
                          onPinToggled={handlePinToggled}
                        />
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        )}
        
        {/* Regular Posts List */}
      {postsLoading && <div className="p-4 text-center">Loading posts...</div>}
      {!postsLoading && postsError && <div className="p-4 text-center text-red-500">{postsError}</div>}
        {!postsLoading && !postsError && fetchedPosts.length === 0 && pinnedPosts.length === 0 && (
        <div className="p-4 text-center text-gray-500">No posts yet. Be the first to share something!</div>
      )}
        {!postsLoading && !postsError && (fetchedPosts.length > 0 || pinnedPosts.length > 0) && (
        <div className="space-y-4 sm:space-y-6">
          {fetchedPosts
              .filter(post => (selectedTab === "all" || post.category?.id === selectedTab) && !post.is_pinned)
            .map(post => (
            <PostCard
              key={post.id}
              {...mapPostToCardProps(post)}
              onPostClick={handlePostCardClick}
              onLikeToggled={handleLikeToggledInCard}
              onPinToggled={handlePinToggled}
            />
          ))}
          </div>
        )}
      </div>

      {/* Sidebar */}
      {currentSpaceData && (
        <div className="hidden sm:block w-[273px] flex-shrink-0">
          <SpaceInfoSidebar 
            spaceName={currentSpaceData.name || 'Space'}
            spaceDescription={currentSpaceData.description || undefined}
            spaceIcon={currentSpaceData.icon_image || undefined}
            coverImage={currentSpaceData.cover_image || undefined}
            isPrivate={currentSpaceData?.is_private}
            memberCount={activeMemberCount} // Pass activeMemberCount
            adminCount={adminCount}
            onlineCount={onlineCount}
            canAccessSettings={storePermissions?.canAccessSettings}
            subdomain={currentSpaceData.subdomain || ''} 
            spaceId={currentSpaceData.id || ''} 
            isOwner={storePermissions?.isOwner || false}
          />
        </div>
      )}
      
      {isCreatePostModalOpen && currentSpaceData && (
        <CreatePostModal
          isOpen={isCreatePostModalOpen}
          onClose={closeCreatePostModal}
          spaceId={currentSpaceData.id}
          currentUserId={currentUser?.id || ''} 
          onPostCreated={handlePostCreated}
          spaceName={currentSpaceData.name || 'Current Space'}
          userName={currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || currentUser?.email || 'User'}
          userAvatarUrl={currentUser?.user_metadata?.avatar_url}
        />
      )}
      {currentSpaceData && (
        <CreateCategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          spaceId={currentSpaceData.id}
          userId={currentUser.id}
          onCategoryCreated={() => {
            setIsCategoryModalOpen(false);
            refreshCategories();
          }}
        />
      )}
      
      {/* Post Detail Modal */}
      {isPostModalOpen && selectedPostForModal && (
        <PostDetailModal
          isOpen={isPostModalOpen}
          onClose={handleClosePostModal}
          post={selectedPostForModal}
          onCommentAdded={handleCommentAddedInModal}
          onPinToggled={handlePinToggled}
          onPostUpdated={handlePostUpdated}
          onPostDeleted={handlePostDeleted}
          onLikeToggled={handleLikeToggledInCard}
        />
      )}
    </div>
  );
} 

// CreateCategoryModal component (existing, unchanged)
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
          icon: categoryIcon
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
          <Dialog.Title className="text-xl font-semibold text-gray-900 mb-2">Create New Category</Dialog.Title>
          <Dialog.Description className="text-sm text-gray-500 mb-5">Add a new category to help organize discussions in this space.</Dialog.Description>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="category-name" className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
              <input id="category-name" type="text" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="e.g., Announcements, Questions, Resources" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" required />
              <p className="mt-1 text-xs text-gray-500">Choose a clear, descriptive name that reflects the topic of discussion.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category Icon (Optional)</label>
              <div className="grid grid-cols-6 gap-2">
                {icons.map(icon => (
                  <button key={icon} type="button" onClick={() => setCategoryIcon(icon)} className={`h-10 w-10 flex items-center justify-center text-xl rounded-md transition-colors ${categoryIcon === icon ? 'bg-teal-100 border-2 border-teal-500' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'}`}>{icon}</button>
                ))}
              </div>
            </div>
            {error && (<div className="p-3 bg-red-50 border border-red-200 rounded-md"><p className="text-sm text-red-600">{error}</p></div>)}
            <div className="flex justify-end space-x-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">Cancel</button>
              <button type="submit" disabled={isCreating} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70">{isCreating ? 'Creating...' : 'Create Category'}</button>
            </div>
          </form>
          <Dialog.Close asChild><button className="absolute right-4 top-4 inline-flex h-6 w-6 appearance-none items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none" aria-label="Close"><Cross2Icon /></button></Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}; 