import { log } from '@/utils/logger';
import React, { useEffect, useState, useCallback } from 'react';
import { aiUserJourneyManager } from '@/utils/aiUserJourneyManager';
import { WelcomePrompt } from '@/components/journey/WelcomePrompt';
import { useOptimizedAuth } from '@/contexts/AuthContext';

interface JourneyState {
  isActive: boolean;
  component: string | null;
  props: any;
}

interface WelcomePromptDetails {
  message: string;
  duration?: number;
  spaceName?: string;
  memberCount?: number;
  onDismiss: () => void;
  onAction: (action: string) => void;
}

export const useAIUserJourney = (spaceId?: string, spaceName?: string, memberCount?: number) => {
  const { user } = useOptimizedAuth();
  const [journeyState, setJourneyState] = useState<JourneyState>({
    isActive: false,
    component: null,
    props: {}
  });

  // Handle welcome prompt display
  const handleShowWelcomePrompt = useCallback((event: CustomEvent<WelcomePromptDetails>) => {
    setJourneyState({
      isActive: true,
      component: 'WelcomePrompt',
      props: event.detail
    });
  }, []);

  // Handle journey dismissal
  const handleDismiss = useCallback(() => {
    setJourneyState({
      isActive: false,
      component: null,
      props: {}
    });
  }, []);

  // Set up event listeners
  useEffect(() => {
    const eventListener = handleShowWelcomePrompt as EventListener;
    window.addEventListener('showWelcomePrompt', eventListener);
    
    return () => {
      window.removeEventListener('showWelcomePrompt', eventListener);
    };
  }, [handleShowWelcomePrompt]);

  // Trigger space entry journey when component mounts or spaceId changes
  useEffect(() => {
    if (user && spaceId) {
      const triggerJourney = async () => {
        try {
          const context = {
            userId: user.id,
            spaceId,
            spaceName,
            memberCount,
            isAuthenticated: true,
            currentLocation: 'space_feed',
            userRole: 'member', // This could be dynamic based on user's role in space
            canPost: true, // This could be dynamic based on permissions
            postCount: 0 // This could be fetched from actual data
          };

          await aiUserJourneyManager.onSpaceEntry(context);
        } catch (error) {
          log.error('Hook', 'Failed to trigger space entry journey:', error);
        }
      };

      // Small delay to ensure components are mounted
      const timer = setTimeout(triggerJourney, 500);
      return () => clearTimeout(timer);
    }
  }, [user, spaceId, spaceName, memberCount]);

  // Render the active journey component
  const renderJourneyComponent = useCallback(() => {
    if (!journeyState.isActive || !journeyState.component) {
      return null;
    }

    switch (journeyState.component) {
      case 'WelcomePrompt':
        return (
          <WelcomePrompt
            {...journeyState.props}
            onDismiss={() => {
              journeyState.props.onDismiss?.();
              handleDismiss();
            }}
            onAction={(action: string) => {
              journeyState.props.onAction?.(action);
              // Keep prompt open for now, let the journey manager handle dismissal
            }}
          />
        );
      default:
        return null;
    }
  }, [journeyState, handleDismiss]);

  // Manually trigger a journey (for testing)
  const triggerTestJourney = useCallback(async () => {
    if (user && spaceId) {
      const context = {
        userId: user.id,
        spaceId,
        spaceName: spaceName || 'Test Space',
        memberCount: memberCount || 1,
        isAuthenticated: true,
        currentLocation: 'space_feed',
        userRole: 'member',
        canPost: true,
        postCount: 0
      };

      // Clear history first to allow re-triggering
      aiUserJourneyManager.clearHistory();
      
      return await aiUserJourneyManager.onSpaceEntry(context);
    }
    return false;
  }, [user, spaceId, spaceName, memberCount]);

  // Get journey statistics
  const getJourneyStats = useCallback(() => {
    return aiUserJourneyManager.getJourneyStats();
  }, []);

  return {
    // State
    isJourneyActive: journeyState.isActive,
    journeyComponent: journeyState.component,
    
    // Methods
    triggerTestJourney,
    getJourneyStats,
    clearJourneyHistory: () => aiUserJourneyManager.clearHistory(),
    
    // Component renderer
    renderJourneyComponent
  };
};

// Higher-order component for automatic journey integration
export const withAIUserJourney = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  return function WithAIUserJourneyComponent(props: P & { 
    spaceId?: string; 
    spaceName?: string; 
    memberCount?: number; 
  }) {
    const { renderJourneyComponent, ...journeyProps } = useAIUserJourney(
      props.spaceId, 
      props.spaceName, 
      props.memberCount
    );

    return (
      <>
        <WrappedComponent {...props} />
        {renderJourneyComponent()}
      </>
    );
  };
}; 