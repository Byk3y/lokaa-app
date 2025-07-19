import { log } from '@/utils/logger';
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { POST_TEMPLATES } from '../types';
import type { PostCardProps } from '@/features/posts/types/postCard';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { generateUUID } from '@/utils/uuid';

interface SpaceCategory {
  id: string;
  name: string;
  icon?: string;
}

interface PollOption {
  id: string;
  text: string;
}

interface UsePostFormProps {
  spaceId: string;
  editMode?: boolean;
  post?: PostCardProps;
  isOpen: boolean;
}

/**
 * Custom hook to manage post form state and validation
 */
export function usePostForm({ spaceId, editMode, post, isOpen }: UsePostFormProps) {
  // Form state
  const [title, setTitle] = useState(post?.title || '');
  const [content, setContent] = useState(post?.content || '');
  const [categoryId, setCategoryId] = useState<string | null>(
    post?.category?.id || null
  );
  const [showFunPostIdeas, setShowFunPostIdeas] = useState(false);
  const [pollOptions, setPollOptions] = useState<PollOption[]>([
    { id: generateUUID(), text: '' },
    { id: generateUUID(), text: '' }
  ]);
  const [showPollCreator, setShowPollCreator] = useState(false);
  
  // Categories state
  const [categories, setCategories] = useState<SpaceCategory[] | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<Error | null>(null);
  
  // Reset form when closed
  useEffect(() => {
    if (!isOpen) {
      if (!editMode) {
        setTitle('');
        setContent('');
        setPollOptions([
          { id: generateUUID(), text: '' },
          { id: generateUUID(), text: '' }
        ]);
        setShowPollCreator(false);
      }
      setShowFunPostIdeas(false);
    } else if (editMode && post) {
      // Set form values for edit mode
      setTitle(post.title || '');
      
      // CRITICAL FIX: Clean content by removing embedded GIF HTML tags for editing
      let cleanContent = post.content || '';
      if (cleanContent) {
        // Remove embedded GIF HTML tags from content for clean editing experience
        const gifTagRegex = /<img\s+[^>]*src="[^"]*\.gif[^"]*"[^>]*>/gi;
        cleanContent = cleanContent.replace(gifTagRegex, '').trim();
        // Also clean up extra newlines that might be left behind
        cleanContent = cleanContent.replace(/\n\s*\n\s*\n/g, '\n\n');
      }
      setContent(cleanContent);
      
      // Check if post has poll data
      if (post.poll_data) {
        const pollData = typeof post.poll_data === 'string' 
          ? JSON.parse(post.poll_data) 
          : post.poll_data;
          
        if (Array.isArray(pollData) && pollData.length > 0) {
          setPollOptions(pollData.map(text => ({
            id: generateUUID(),
            text
          })));
          setShowPollCreator(true);
        }
      }
      
      // Set category if present
      if (post?.category?.id) {
        setCategoryId(post.category.id);
      }
    }
  }, [isOpen, editMode, post]);
  
  // Load categories
  useEffect(() => {
    if (spaceId && isOpen) {
      log.debug('Hook', '🏷️ [usePostForm] Loading categories for space:', spaceId, 'isOpen:', isOpen);
      fetchCategories();
    }
  }, [spaceId, isOpen]);
  
  // Fetch categories for the space
  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError(null);
      
      log.debug('Hook', '🏷️ [usePostForm] Fetching categories for space ID:', spaceId);
      
      if (!spaceId) {
        log.error('Hook', '🏷️ [usePostForm] Space ID is undefined or null when trying to fetch categories');
        setCategoriesLoading(false);
        return;
      }
      
      // Check if the spaceId is a UUID or a subdomain
      let querySpaceId = spaceId;
      if (spaceId.includes('-')) {
        // Looks like a UUID, use it directly
        log.debug('Hook', '🏷️ [usePostForm] Using UUID directly:', spaceId);
      } else {
        // Might be a subdomain, try to find the corresponding space ID
        log.debug('Hook', '🏷️ [usePostForm] Space ID might be a subdomain, trying to find the corresponding UUID');
        const { data: spaceData, error: spaceError } = await getSupabaseClient()
          .from('spaces')
          .select('id')
          .eq('subdomain', spaceId)
          .single();
        
        if (spaceError) {
          log.error('Hook', '🏷️ [usePostForm] Error looking up space by subdomain:', spaceError);
        } else if (spaceData) {
          log.debug('Hook', '🏷️ [usePostForm] Found space ID for subdomain:', spaceData.id);
          querySpaceId = spaceData.id;
        }
      }
      
      // Use Supabase client to fetch real categories
      const { data, error } = await getSupabaseClient()
        .from('space_categories')
        .select('id, name, icon')
        .eq('space_id', querySpaceId)
        .eq('is_archived', false)
        .order('created_at');
      
      if (error) {
        log.error('Hook', '🏷️ [usePostForm] Error fetching categories:', error);
        throw error;
      }
      
      log.debug('Hook', '🏷️ [usePostForm] Categories fetched successfully:', data);
      
      // Format the categories and update state
      const formattedCategories = data.map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon || undefined
      }));
      
      // Sort categories with "General Discussion" first, then by creation order
      const sortedCategories = formattedCategories.sort((a, b) => {
        // Check if either category is "General Discussion"
        const aIsGeneral = a.name.toLowerCase() === 'general discussion';
        const bIsGeneral = b.name.toLowerCase() === 'general discussion';
        
        // If a is General Discussion and b is not, a comes first
        if (aIsGeneral && !bIsGeneral) return -1;
        // If b is General Discussion and a is not, b comes first
        if (bIsGeneral && !aIsGeneral) return 1;
        // If both or neither are General Discussion, maintain creation order (already sorted by created_at)
        return 0;
      });
      
      log.debug('Hook', '🏷️ [usePostForm] Categories sorted and ready:', sortedCategories);
      setCategories(sortedCategories);
      
    } catch (error) {
      log.error('Hook', '🏷️ [usePostForm] Error fetching categories:', error);
      setCategoriesError(error as Error);
    } finally {
      setCategoriesLoading(false);
    }
  };
  
  // Apply a post template
  const applyPostTemplate = (templateKey: keyof typeof POST_TEMPLATES) => {
    const template = POST_TEMPLATES[templateKey];
    if (template) {
      setTitle(template.title);
      setContent(template.content);
    }
  };
  
  // Handle poll option changes
  const handlePollOptionChange = (id: string, text: string) => {
    setPollOptions(prev => 
      prev.map(option => option.id === id ? { ...option, text } : option)
    );
  };
  
  // Add a new poll option
  const addPollOption = () => {
    if (pollOptions.length < 10) {
      setPollOptions([...pollOptions, { id: generateUUID(), text: '' }]);
    } else {
      toast({
        title: "Maximum options reached",
        description: "You can have a maximum of 10 options in a poll",
        variant: "destructive"
      });
    }
  };
  
  // Remove a poll option
  const removePollOption = (id: string) => {
    if (pollOptions.length > 2) {
      setPollOptions(prev => prev.filter(option => option.id !== id));
    } else {
      toast({
        description: "Polls must have at least 2 options",
        variant: "destructive"
      });
    }
  };
  
  // Toggle poll creator visibility
  const togglePollCreator = () => {
    setShowPollCreator(!showPollCreator);
    if (!showPollCreator) {
      // Reset poll options when enabling
      setPollOptions([
        { id: generateUUID(), text: '' },
        { id: generateUUID(), text: '' }
      ]);
    }
  };
  
  // Validate the form before submission
  const validateForm = () => {
    if (!title.trim() && !content.trim()) {
      toast({
        title: "Missing content",
        description: "Please add a title or content to your post",
        variant: "destructive"
      });
      return false;
    }
    
    if (showPollCreator) {
      // Check if poll has at least 2 non-empty options
      const validOptions = pollOptions.filter(option => option.text.trim().length > 0);
      if (validOptions.length < 2) {
        toast({
          title: "Invalid poll",
          description: "Please add at least 2 options to your poll",
          variant: "destructive"
        });
        return false;
      }
    }
    
    return true;
  };
  
  // Get prepared poll data for submission
  const getPreparedPollData = () => {
    if (!showPollCreator) return null;
    
    // Filter out empty options and extract just the text
    const validOptions = pollOptions
      .filter(option => option.text.trim().length > 0)
      .map(option => option.text);
      
    return validOptions.length >= 2 ? validOptions : null;
  };
  
  // Get category ID for submission (handling null vs undefined)
  const getSubmissionCategoryId = () => {
    if (categoryId) {
      log.debug('Hook', '🏷️ [usePostForm] Using selected category ID:', categoryId);
      return categoryId;
    }
    
    // If no category is selected, try to find "General Discussion"
    const generalDiscussionCategory = categories?.find(
      cat => cat.name.toLowerCase() === 'general discussion'
    );
    
    if (generalDiscussionCategory) {
      log.debug('Hook', '🏷️ [usePostForm] Using default General Discussion category:', generalDiscussionCategory.id);
      return generalDiscussionCategory.id;
    }
    
    // If still no category found, use the first available category
    if (categories && categories.length > 0) {
      log.debug('Hook', '🏷️ [usePostForm] Using first available category:', categories[0].id);
      return categories[0].id;
    }
    
    log.warn('Hook', '🏷️ [usePostForm] No categories available, returning undefined');
    return undefined;
  };
  
  return {
    title,
    setTitle,
    content,
    setContent,
    categoryId,
    setCategoryId,
    showFunPostIdeas,
    setShowFunPostIdeas,
    pollOptions,
    showPollCreator,
    handlePollOptionChange,
    addPollOption,
    removePollOption,
    togglePollCreator,
    categories,
    categoriesLoading,
    categoriesError,
    applyPostTemplate,
    validateForm,
    getPreparedPollData,
    getSubmissionCategoryId
  };
} 