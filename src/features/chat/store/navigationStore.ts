/**
 * Navigation Store - Specialized store for mobile URL navigation
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  generateConversationSlug, 
  findConversationIdFromSlug, 
  navigateToConversation,
  parseConversationUrlParams 
} from '@/utils/conversationUrlUtils';

interface NavigationState {
  currentSlug: string | null;
  previousSlug: string | null;
  navigationHistory: string[];
  isMobileDevice: boolean;
  urlParsingEnabled: boolean;
}

interface NavigationActions {
  // URL Navigation
  navigateToConversationBySlug: (slug: string) => void;
  navigateToConversationById: (conversationId: string) => void;
  parseUrlParameters: () => { conversationId: string | null; slug: string | null };
  
  // Slug Management
  generateSlugForConversation: (conversationId: string) => string;
  findConversationFromSlug: (slug: string) => string | null;
  
  // Navigation History
  addToHistory: (slug: string) => void;
  goBack: () => void;
  clearHistory: () => void;
  
  // Device Detection
  setMobileDevice: (isMobile: boolean) => void;
  toggleUrlParsing: (enabled: boolean) => void;
  
  // State Management
  setCurrentSlug: (slug: string | null) => void;
  reset: () => void;
}

type NavigationStore = NavigationState & NavigationActions;

export const useNavigationStore = create<NavigationStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSlug: null,
      previousSlug: null,
      navigationHistory: [],
      isMobileDevice: false,
      urlParsingEnabled: true,

      // Navigate to conversation by slug
      navigateToConversationBySlug: (slug: string) => {
        const { isMobileDevice, urlParsingEnabled } = get();
        
        if (!isMobileDevice || !urlParsingEnabled) {
          console.log('[NavigationStore] URL navigation disabled for desktop or disabled state');
          return;
        }

        try {
          const conversationId = findConversationIdFromSlug(slug);
          
          if (conversationId) {
            // Update navigation state
            set(state => ({
              previousSlug: state.currentSlug,
              currentSlug: slug
            }));
            
            // Add to history
            get().addToHistory(slug);
            
                         // Perform navigation
             navigateToConversation(conversationId, slug);
            
            console.log('[NavigationStore] Navigated to conversation:', { slug, conversationId });
          } else {
            console.warn('[NavigationStore] No conversation found for slug:', slug);
          }
        } catch (error) {
          console.error('[NavigationStore] Navigation failed:', error);
        }
      },

      // Navigate to conversation by ID
      navigateToConversationById: (conversationId: string) => {
        const { isMobileDevice, urlParsingEnabled } = get();
        
        if (!isMobileDevice || !urlParsingEnabled) {
          console.log('[NavigationStore] Direct ID navigation for desktop');
          return;
        }

        try {
          const slug = generateConversationSlug(conversationId);
          get().navigateToConversationBySlug(slug);
        } catch (error) {
          console.error('[NavigationStore] Failed to generate slug for conversation:', conversationId, error);
        }
      },

      // Parse current URL parameters
      parseUrlParameters: () => {
        try {
          const params = parseConversationUrlParams();
          
          // Update current slug if we found one
          if (params.slug) {
            set({ currentSlug: params.slug });
          }
          
          return params;
        } catch (error) {
          console.error('[NavigationStore] Failed to parse URL parameters:', error);
          return { conversationId: null, slug: null };
        }
      },

      // Generate slug for conversation
      generateSlugForConversation: (conversationId: string) => {
        try {
          return generateConversationSlug(conversationId);
        } catch (error) {
          console.error('[NavigationStore] Failed to generate slug:', error);
          return '';
        }
      },

      // Find conversation from slug
      findConversationFromSlug: (slug: string) => {
        try {
          return findConversationIdFromSlug(slug);
        } catch (error) {
          console.error('[NavigationStore] Failed to find conversation from slug:', error);
          return null;
        }
      },

      // Add to navigation history
      addToHistory: (slug: string) => {
        set(state => {
          const newHistory = [...state.navigationHistory];
          
          // Remove slug if it already exists (move to end)
          const existingIndex = newHistory.indexOf(slug);
          if (existingIndex !== -1) {
            newHistory.splice(existingIndex, 1);
          }
          
          // Add to end
          newHistory.push(slug);
          
          // Keep only last 20 entries
          if (newHistory.length > 20) {
            newHistory.shift();
          }
          
          return { navigationHistory: newHistory };
        });
      },

      // Go back to previous conversation
      goBack: () => {
        const { navigationHistory, currentSlug } = get();
        
        if (navigationHistory.length < 2) {
          console.log('[NavigationStore] No previous conversation in history');
          return;
        }
        
        // Find current position and go to previous
        const currentIndex = navigationHistory.indexOf(currentSlug || '');
        const previousSlug = currentIndex > 0 
          ? navigationHistory[currentIndex - 1]
          : navigationHistory[navigationHistory.length - 2];
        
        if (previousSlug) {
          get().navigateToConversationBySlug(previousSlug);
        }
      },

      // Clear navigation history
      clearHistory: () => {
        set({
          navigationHistory: [],
          currentSlug: null,
          previousSlug: null
        });
      },

      // Set mobile device status
      setMobileDevice: (isMobile: boolean) => {
        set({ isMobileDevice: isMobile });
        console.log('[NavigationStore] Mobile device status:', isMobile);
      },

      // Toggle URL parsing
      toggleUrlParsing: (enabled: boolean) => {
        set({ urlParsingEnabled: enabled });
        console.log('[NavigationStore] URL parsing enabled:', enabled);
      },

      // Set current slug
      setCurrentSlug: (slug: string | null) => {
        set(state => ({
          previousSlug: state.currentSlug,
          currentSlug: slug
        }));
      },

      // Reset state
      reset: () => {
        set({
          currentSlug: null,
          previousSlug: null,
          navigationHistory: [],
          isMobileDevice: false,
          urlParsingEnabled: true
        });
      }
    }),
    {
      name: 'navigation-store',
      partialize: (state) => ({
        navigationHistory: state.navigationHistory,
        currentSlug: state.currentSlug,
        isMobileDevice: state.isMobileDevice,
        urlParsingEnabled: state.urlParsingEnabled
      })
    }
  )
);
