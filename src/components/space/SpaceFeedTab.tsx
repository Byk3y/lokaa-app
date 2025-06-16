import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Edit, Image as ImageIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import PostCard from "./PostCard";
import { useNavigate } from "react-router-dom";
import { useSpace } from "@/contexts/SpaceContext";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOptimizedCachedCategories } from "@/hooks/useOptimizedCachedCategories";
import { getSupabaseClient } from '@/integrations/supabase/client';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';
import type { Attachment } from "@/features/posts/types";

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
      const { data, error: insertError } = await getSupabaseClient()
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

// Define an interface for the Post structure in the feed
interface FeedPost {
  id: string;
  author: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  title?: string | null;
  content: string;
  createdAt: Date | string; // Can be Date object or ISO string
  category?: {
    id: string;
    name: string;
    icon?: string | null;
  } | null;
  likes?: number;
  comments?: number;
  media_urls?: Attachment[] | null; 
}

export default function SpaceFeedTab() {
  const { spaceData } = useSpace();
  const { user } = useOptimizedAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [selectedTab, setSelectedTab] = useState("all");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [setupCompletion, setSetupCompletion] = useState({
    invitePeople: false,
    addDescription: !!spaceData?.description,
    setCoverImage: false,
    writeFirstPost: false
  });
  
  // Get categories from the hook
  const { categories, refreshCategories } = useOptimizedCachedCategories(spaceData?.id);
  
  // Add sample posts when writeFirstPost is completed
  useEffect(() => {
    if (setupCompletion.writeFirstPost && posts.length === 0 && user) {
      // Add some sample posts for demonstration
      setPosts([
        {
          id: "1",
          author: {
            id: user.id,
            name: user.email?.split('@')[0] || "User",
            avatar: user.user_metadata?.avatar_url
          },
          content: "Welcome to our space! 👋 I'm excited to start building our community here. Feel free to introduce yourself!",
          createdAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
          likes: 5,
          comments: 2
        },
        {
          id: "2",
          author: {
            id: user.id,
            name: user.email?.split('@')[0] || "User",
            avatar: user.user_metadata?.avatar_url
          },
          content: "Just shared our first resource! Check out this amazing article on community building. What topics would you like to discuss in this space?",
          createdAt: new Date(Date.now() - 3600000 * 24), // 1 day ago
          likes: 12,
          comments: 8
        }
      ]);
    }
  }, [setupCompletion.writeFirstPost, user, posts.length]);
  
  // Function to handle tab selection
  const handleTabSelect = (tab: string) => {
    setSelectedTab(tab);
  };
  
  // Add navigate for routing to compose page
  const navigate = useNavigate();

  // Function to handle opening the compose post page using the nested route
  const handleOpenComposePost = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    // Use React Router navigate for seamless transition without reloading
    navigate("compose");
  };
  
  // Function to handle category creation
  const handleCreateCategory = () => {
    setIsCategoryModalOpen(true);
  };
  
  if (!spaceData || !user) {
    return <div>Loading space data...</div>;
  }
  
  return (
    <div className="flex-1 space-y-6">
      {/* Post Category Tabs */}
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#E1E4E8] overflow-hidden">
        <div className="flex px-4 py-3 overflow-x-auto" role="tablist">
          <motion.button 
            role="tab"
            aria-selected={selectedTab === "all"}
            onClick={() => handleTabSelect("all")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center justify-center px-4 py-1.5 rounded-lg text-sm transition-colors border-b-2 ${
              selectedTab === "all" 
                ? 'border-[#1A8A7E] text-[#111827]' 
                : 'border-transparent text-[#4B5563] hover:text-[#1A8A7E]'
            }`}
          >
            All
          </motion.button>
          <motion.button 
            role="tab"
            aria-selected={selectedTab === "general"}
            onClick={() => handleTabSelect("general")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center justify-center px-4 py-1.5 rounded-lg text-sm transition-colors border-b-2 ${
              selectedTab === "general" 
                ? 'border-[#1A8A7E] text-[#111827]' 
                : 'border-transparent text-[#4B5563] hover:text-[#1A8A7E]'
            }`}
          >
            💬 General discussion
          </motion.button>
          
          {/* Render custom categories */}
          {categories && categories.map(category => (
            category.name.toLowerCase() !== 'general discussion' && (
              <motion.button 
                key={category.id}
                role="tab"
                aria-selected={selectedTab === category.id}
                onClick={() => handleTabSelect(category.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center justify-center px-4 py-1.5 rounded-lg text-sm transition-colors border-b-2 ${
                  selectedTab === category.id 
                    ? 'border-[#1A8A7E] text-[#111827]' 
                    : 'border-transparent text-[#4B5563] hover:text-[#1A8A7E]'
                }`}
              >
                {category.icon ? `${category.icon} ` : ''}{category.name}
              </motion.button>
            )
          ))}
          
          {/* Replace the right-side icons with the Create Category button */}
          <div className="ml-auto">
            <motion.button 
              onClick={handleCreateCategory}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center px-3 py-1.5 rounded-lg text-sm bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors"
            >
              <Plus className="h-4 w-4 mr-1" />
              <span>New Category</span>
            </motion.button>
          </div>
        </div>
      </div>
      
      {/* Post Feed */}
      {posts.length > 0 && (
        <div className="space-y-6">
          {posts.map(post => (
            <PostCard
              key={post.id}
              author={post.author}
              content={post.content}
              createdAt={post.createdAt}
              likes={post.likes}
              comments={post.comments}
            />
          ))}
        </div>
      )}
      
      {/* Empty State For Posts */}
      {posts.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-xl px-4 py-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#E1E4E8] flex flex-col items-center justify-center text-center"
        >
          <div className="h-12 w-12 bg-[#F5F6F7] rounded-full flex items-center justify-center mb-4">
            <Edit className="h-5 w-5 text-[#6B7280]" />
          </div>
          <h3 className="text-lg font-semibold text-[#111827] mb-2">Be the first to welcome members—share an intro or a group announcement!</h3>
          <p className="text-sm text-[#6B7280] mb-6 max-w-md">
            Share your thoughts, questions, or resources with your group members.
          </p>
          <Button 
            onClick={handleOpenComposePost}
            className="w-full bg-[#1A8A7E] hover:bg-[#158275] text-white font-medium rounded px-4 py-2.5 transition-colors text-sm"
          >
            Create First Post
          </Button>
        </motion.div>
      )}
      
      {/* Category Creation Modal */}
      <CreateCategoryModal 
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        spaceId={spaceData.id}
        userId={user.id}
        onCategoryCreated={refreshCategories}
      />
    </div>
  );
} 