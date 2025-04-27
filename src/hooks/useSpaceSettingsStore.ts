import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SpaceSettingsData {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  subdomain: string;
  owner_id: string;
  is_private: boolean;
}

interface SpaceSettingsState {
  space: SpaceSettingsData | null;
  formData: Partial<SpaceSettingsData>;
  loading: boolean;
  error: string | null;
  fetchSpaceSettings: (spaceId: string, userId: string) => Promise<void>;
  setFormDataField: <K extends keyof Partial<SpaceSettingsData>>(field: K, value: Partial<SpaceSettingsData>[K]) => void;
  resetStore: () => void; // To clear data when needed
}

const initialState = {
  space: null,
  formData: {},
  loading: false,
  error: null,
};

const useSpaceSettingsStore = create<SpaceSettingsState>((set, get) => ({
  ...initialState,

  fetchSpaceSettings: async (spaceId: string, userId: string) => {
    if (!spaceId || !userId) {
      console.error("fetchSpaceSettings called with missing params:", { spaceId, userId });
      set({ error: "User or Space ID missing.", loading: false });
      return;
    }
    
    console.log("fetchSpaceSettings called with params:", { spaceId, userId });
    
    // Avoid refetch if data for the same space is already loaded
    if (get().space?.id === spaceId && !get().loading) {
       console.log("Settings data already loaded for space:", spaceId);
       return;
    }

    console.log("Fetching settings data for space:", spaceId);
    set({ loading: true, error: null });

    try {
      console.log("Starting spaces query for spaceId:", spaceId);
      const { data, error } = await supabase
        .from('spaces')
        .select('id, name, description, cover_image, subdomain, owner_id, is_private') // Select specific fields
        .eq('id', spaceId)
        .single();

      if (error) {
        console.error("Error fetching space settings:", error);
        
        if (error.code === 'PGRST116') {
          console.log("Space not found with ID:", spaceId);
          toast({ title: "Not Found", description: "Could not find settings for this space.", variant: "destructive" });
          set({ error: "Space not found", loading: false });
        } else {
          console.error("Database error fetching space:", error.message);
          toast({ title: "Error", description: `Failed to load settings: ${error.message}`, variant: "destructive" });
          set({ error: `Failed to load settings: ${error.message}`, loading: false });
        }
        return;
      }

      if (!data) {
        console.error("No data returned for space ID:", spaceId);
        set({ error: "No data returned", loading: false });
        return;
      }

      console.log("Space data successfully retrieved:", data);
      const spaceData = data as SpaceSettingsData;

      // First check if user is the owner
      const isOwner = spaceData.owner_id === userId;
      console.log("Is user the owner?", isOwner);
      
      // If not owner, check if user has access via space_access table
      let hasAccess = isOwner;
      
      if (!isOwner) {
        console.log("User is not the owner, checking space_access table");
        try {
          const { data: accessData, error: accessError } = await supabase
            .from('space_access')
            .select('id, role, is_active')
            .eq('space_id', spaceId)
            .eq('user_id', userId)
            .eq('is_active', true);
            
          if (accessError) {
            console.error("Error checking space access:", accessError);
            // Don't fail completely, just log the error
          } else {
            hasAccess = accessData && accessData.length > 0;
            console.log("Access check result:", hasAccess ? "Has access" : "No access", accessData);
          }
        } catch (accessCheckError) {
          console.error("Exception checking space access:", accessCheckError);
          // Continue as if no access - this is safer
        }
      }

      if (!hasAccess) {
        console.error("User does not have access to this space");
        toast({ 
          title: "Unauthorized", 
          description: "You don't have permission to access this space.", 
          variant: "destructive" 
        });
        set({ error: "Unauthorized", loading: false });
        return;
      }

      console.log("Setting space data in store:", spaceData);
      
      set({
        space: spaceData,
        formData: {
          name: spaceData.name,
          description: spaceData.description,
          cover_image: spaceData.cover_image,
          is_private: spaceData.is_private ?? false,
          // Subdomain is part of space, not formData directly for editing
        },
        loading: false,
        error: null,
      });
      console.log("Settings data fetched successfully for:", spaceId);

    } catch (error: any) {
      console.error("Exception fetching space settings:", error);
      toast({ 
        title: "Error", 
        description: `Failed to load settings: ${error.message || 'Unknown error'}`, 
        variant: "destructive" 
      });
      set({ error: `Failed to load settings: ${error.message || 'Unknown error'}`, loading: false });
    }
  },

  setFormDataField: (field, value) => {
    set((state) => ({
      formData: {
        ...state.formData,
        [field]: value,
      },
    }));
  },
  
  // Allow resetting the store, e.g., when user logs out or modal closes definitively
  resetStore: () => set(initialState), 

}));

export default useSpaceSettingsStore; 