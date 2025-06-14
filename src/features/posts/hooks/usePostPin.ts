import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UsePostPinProps {
  postId: string;
  initialPinned?: boolean;
  isAdmin?: boolean;
  userId?: string | null;
  categoryName?: string | null;
  onPinToggled?: (postId: string, isPinned: boolean, category?: string | null) => void;
}

interface UsePostPinReturn {
  optimisticPinned: boolean;
  isPinning: boolean;
  handlePinToggle: (e: React.MouseEvent) => Promise<void>;
}

/**
 * Custom hook to manage post pinning
 */
export const usePostPin = ({
  postId,
  initialPinned = false,
  isAdmin = false,
  userId,
  categoryName,
  onPinToggled,
}: UsePostPinProps): UsePostPinReturn => {
  const [isPinning, setIsPinning] = useState(false);
  const [optimisticPinned, setOptimisticPinned] = useState(initialPinned);
  
  // Update optimistic pin state when props change
  useEffect(() => {
    setOptimisticPinned(initialPinned);
  }, [initialPinned]);

  const handlePinToggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening post modal when clicking pin
    
    if (!userId || !isAdmin || isPinning) return;
    
    setIsPinning(true);
    const currentlyPinned = optimisticPinned;
    
    // Optimistic update
    setOptimisticPinned(!currentlyPinned);
    
    try {
      // Cast function name type to work around TypeScript issues
      const functionName = 'toggle_post_pin' as any;
      
      if (currentlyPinned) {
        // Unpin
        const { data, error } = await getSupabaseClient()
          .rpc(functionName, { 
            post_id: postId,
            pin_action: 'unpin'
          });

        if (error) throw error;
      } else {
        // Pin
        const { data, error } = await getSupabaseClient()
          .rpc(functionName, { 
            post_id: postId,
            pin_action: 'pin',
            category: categoryName || 'general'
          });

        if (error) throw error;
      }

      // Notify parent of pin change
      if (typeof onPinToggled === 'function') {
        onPinToggled(postId, !currentlyPinned, !currentlyPinned ? (categoryName || 'general') : null);
      }
    } catch (error: any) {
      console.error('Error toggling pin:', error);
      toast({
        title: "Error",
        description: error.message || "Could not update pin status.",
        variant: "destructive",
      });
      // Revert optimistic update
      setOptimisticPinned(currentlyPinned);
    } finally {
      setIsPinning(false);
    }
  }, [postId, userId, isAdmin, isPinning, optimisticPinned, onPinToggled, categoryName]);

  return {
    optimisticPinned,
    isPinning,
    handlePinToggle,
  };
}; 