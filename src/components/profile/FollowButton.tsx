import { log } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, Loader2, Check } from 'lucide-react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  userId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'subtle' | 'outline';
  withIcon?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({
  userId,
  className,
  size = 'md',
  variant = 'default',
  withIcon = true,
  onFollowChange
}: FollowButtonProps) {
  const { user: currentUser } = useOptimizedAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Check if already following the user
  useEffect(() => {
    if (currentUser && userId) {
      checkFollowStatus();
    }
  }, [currentUser, userId]);
  
  const checkFollowStatus = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await (getSupabaseClient() as any)
        .from('user_follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId)
        .maybeSingle();
        
      if (error) throw error;
      
      setIsFollowing(!!data);
      setInitialLoadComplete(true);
    } catch (error) {
      log.error('Component', 'Error checking follow status:', error);
      setInitialLoadComplete(true);
    }
  };
  
  const toggleFollow = async () => {
    if (!currentUser || isLoading) return;
    
    // Don't allow self-following
    if (currentUser.id === userId) {
      toast({
        title: "Action not allowed",
        description: "You cannot follow yourself.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await (getSupabaseClient() as any)
          .from('user_follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId);
          
        if (error) throw error;
        
        toast({
          title: "Unfollowed",
          description: "You are no longer following this user.",
        });
        
        setIsFollowing(false);
        if (onFollowChange) onFollowChange(false);
      } else {
        // Follow
        const { error } = await (getSupabaseClient() as any)
          .from('user_follows')
          .insert({
            follower_id: currentUser.id,
            following_id: userId
          });
          
        if (error) throw error;
        
        toast({
          title: "Following",
          description: "You are now following this user.",
        });
        
        setIsFollowing(true);
        if (onFollowChange) onFollowChange(true);
      }
    } catch (error: any) {
      log.error('Component', 'Error toggling follow status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update follow status.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Always render the button after initial load
  if (!initialLoadComplete) return null;
  if (currentUser?.id === userId) return null;

  // Redesigned styles
  const baseClass = 'w-full flex items-center justify-center font-semibold rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2';
  const followClass = 'bg-teal-600 text-white shadow hover:bg-teal-700 focus:ring-teal-500';
  const followingClass = 'bg-white text-teal-700 border-2 border-teal-600 hover:bg-teal-50 focus:ring-teal-500';
  const disabledClass = 'opacity-60 cursor-not-allowed';
  const buttonClass = [
    baseClass,
    isFollowing ? followingClass : followClass,
    isLoading ? disabledClass : '',
    className || '',
    'py-2 px-4 text-base'
  ].join(' ');

  return (
    <button
      className={buttonClass}
      onClick={toggleFollow}
      disabled={isLoading || !currentUser}
      type="button"
      aria-pressed={isFollowing}
    >
      {isLoading ? (
        <Loader2 className="animate-spin mr-2 h-5 w-5" />
      ) : (
        <>
          {isFollowing ? (
            <Check className="mr-2 h-5 w-5 text-teal-600" />
          ) : (
            <UserPlus className="mr-2 h-5 w-5 text-white" />
          )}
        </>
      )}
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  );
} 