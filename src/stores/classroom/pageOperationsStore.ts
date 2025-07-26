import { create } from 'zustand';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PageOperationsState {
  // Delete operation
  deletePage: (pageId: string) => Promise<void>;
  
  // Draft status
  revertToDraft: (pageId: string) => Promise<void>;
  
  // Duplication
  duplicatePage: (pageId: string) => Promise<string>; // Returns new page ID
  
  // Folder management
  changeFolder: (pageId: string, folderId: string | null) => Promise<void>;
  
  // Drip settings
  toggleDripStatus: (pageId: string, enabled: boolean) => Promise<void>;
  
  // Loading states
  isDeleting: boolean;
  isDuplicating: boolean;
  isChangingFolder: boolean;
  isTogglingDrip: boolean;
}

export const usePageOperationsStore = create<PageOperationsState>((set, get) => ({
  isDeleting: false,
  isDuplicating: false,
  isChangingFolder: false,
  isTogglingDrip: false,

  deletePage: async (pageId: string) => {
    set({ isDeleting: true });
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('course_modules')
        .delete()
        .eq('id', pageId);

      if (error) throw error;

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete page",
        variant: "destructive"
      });
      throw error;
    } finally {
      set({ isDeleting: false });
    }
  },

  revertToDraft: async (pageId: string) => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('course_modules')
        .update({ is_published: false })
        .eq('id', pageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Page reverted to draft",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to revert page to draft",
        variant: "destructive"
      });
      throw error;
    }
  },

  duplicatePage: async (pageId: string) => {
    set({ isDuplicating: true });
    try {
      const supabase = getSupabaseClient();
      
      // First get the page data
      const { data: originalPage, error: fetchError } = await supabase
        .from('course_modules')
        .select('*')
        .eq('id', pageId)
        .single();

      if (fetchError) throw fetchError;

      // Create new page with copied data
      const { data: newPage, error: createError } = await supabase
        .from('course_modules')
        .insert({
          ...originalPage,
          id: undefined, // Let Supabase generate new ID
          title: `Copy of ${originalPage.title}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          module_order: originalPage.module_order + 1,
        })
        .select()
        .single();

      if (createError) throw createError;

      toast({
        title: "Success",
        description: "Page duplicated successfully",
        variant: "default"
      });

      return newPage.id;
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to duplicate page",
        variant: "destructive"
      });
      throw error;
    } finally {
      set({ isDuplicating: false });
    }
  },

  changeFolder: async (pageId: string, folderId: string | null) => {
    set({ isChangingFolder: true });
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('course_modules')
        .update({ parent_module_id: folderId })
        .eq('id', pageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Page moved successfully",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to move page",
        variant: "destructive"
      });
      throw error;
    } finally {
      set({ isChangingFolder: false });
    }
  },

  toggleDripStatus: async (pageId: string, enabled: boolean) => {
    set({ isTogglingDrip: true });
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('course_modules')
        .update({ 
          drip_enabled: enabled,
          release_delay_days: enabled ? 1 : 0 // Default to 1 day delay when enabling
        })
        .eq('id', pageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Drip status ${enabled ? 'enabled' : 'disabled'}`,
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update drip status",
        variant: "destructive"
      });
      throw error;
    } finally {
      set({ isTogglingDrip: false });
    }
  },
})); 