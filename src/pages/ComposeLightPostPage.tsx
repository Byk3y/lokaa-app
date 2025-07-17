import { useState, useEffect } from "react";
import { X, PaperclipIcon, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

export default function ComposeLightPostPage() {
  // Extract spaceId from the URL directly
  const spaceId = window.location.pathname.split('/')[2];
  const { user } = useOptimizedAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [spaceName, setSpaceName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [spaceSubdomain, setSpaceSubdomain] = useState("");
  
  useEffect(() => {
    const fetchSpaceDetails = async () => {
      if (!spaceId) return;
      
      try {
        const { data, error } = await getSupabaseClient()
          .from("spaces")
          .select("name, subdomain")
          .eq("id", spaceId)
          .single();
          
        if (error) throw error;
        if (data) {
          setSpaceName(data.name);
          setSpaceSubdomain(data.subdomain || "");
        }
      } catch (error) {
        console.error("Error fetching space:", error);
        toast({
          title: "Error",
          description: "Failed to load space information",
          variant: "destructive",
        });
      }
    };
    
    fetchSpaceDetails();
  }, [spaceId]);

  // Direct navigation to feed
  const navigateToFeed = () => {
    const url = spaceSubdomain 
      ? `/${spaceSubdomain}/space` 
      : `/s/${spaceId}/space`;
    
    // Direct URL replacement
    window.location.replace(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() && !body.trim()) {
      toast({
        title: "Error",
        description: "Please enter either a title or message content",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create the post
      const { data, error } = await getSupabaseClient()
        .from("posts")
        .insert({
          user_id: user?.id,
          space_id: spaceId,
          title: title || null,
          content: body,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Your post has been published",
      });
      
      // Navigate to feed
      navigateToFeed();
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: "Failed to publish your post",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-xl overflow-hidden"
      >
        {/* Header section */}
        <div className="flex items-center justify-between p-4 border-b border-[#E1E4E8]">
          <div className="flex items-center">
            <Avatar className="h-10 w-10 mr-3">
              <AvatarImage 
                src={user?.user_metadata?.avatar_url} 
                alt={user?.email || "User"} 
              />
              <AvatarFallback className="bg-[#1A8A7E] text-white">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="font-medium text-[#111827]">
                {user?.email?.split('@')[0] || "User"} posting in {spaceName}
              </span>
            </div>
          </div>
          <button
            onClick={navigateToFeed}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          {/* Title input */}
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mb-4 text-[16px] font-medium text-[#111827] placeholder-[#6B7280] border-none focus:outline-none focus:ring-0"
          />
          
          {/* Body textarea */}
          <textarea
            placeholder="Write something..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full min-h-[150px] p-3 bg-[#F5F6F7] border border-[#E1E4E8] rounded-md text-[14px] text-[#4B5563] placeholder-[#6B7280] focus:outline-none focus:ring-1 focus:ring-[#1A8A7E] resize-none mb-4"
          />
          
          {/* Suggestion panel */}
          <AnimatePresence>
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 mb-4 bg-[#FAFBFC] border border-[#E1E4E8] rounded-lg"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-[#111827]">Fun post ideas to kick off your community:</h3>
                  <button 
                    type="button"
                    onClick={() => setShowSuggestions(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="text-xl mr-2">💬</span>
                    <span className="text-[#4B5563]">Ask members to introduce themselves and share a pic of their workspace</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-xl mr-2">❤️</span>
                    <span className="text-[#4B5563]">Ask members to share their favorite movie, book, travel destination, etc</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-xl mr-2">📊</span>
                    <span className="text-[#4B5563]">Create a poll about a topic relevant to your community</span>
                  </li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Toolbar and actions */}
          <div className="flex items-center justify-between border-t border-[#E1E4E8] pt-4">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                className="p-2 text-[#6B7280] hover:text-[#1A8A7E] hover:bg-gray-100 rounded-full transition-colors"
              >
                <PaperclipIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="p-2 text-[#6B7280] hover:text-[#1A8A7E] hover:bg-gray-100 rounded-full transition-colors"
              >
                <BarChart3 className="h-5 w-5" />
              </button>
              <span className="text-[14px] text-[#6B7280]">Poll</span>
              <span className="text-[14px] text-[#6B7280]">GIF</span>
              <div className="flex items-center space-x-1">
                <span className="text-[14px] text-[#6B7280]">Category</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9L12 15L18 9" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
          
          {/* Publish button */}
          <Button
            type="submit"
            disabled={isLoading || (!title.trim() && !body.trim())}
            className="w-full mt-4 bg-[#1A8A7E] hover:bg-[#158275] text-white py-2 rounded"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Publishing...
              </div>
            ) : (
              "Publish Post"
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
} 