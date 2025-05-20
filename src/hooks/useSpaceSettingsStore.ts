import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SpaceSettingsData {
  id: string;
  name: string;
  description: string | null;
  about_description: string | null;
  cover_image: string | null;
  icon_image: string | null;
  subdomain: string;
  owner_id: string;
  is_private: boolean;
  primary_color?: string;
  pricing_type?: 'free' | 'paid' | string;
  price_per_month?: number;
  member_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface SpacePermissions {
  isOwner: boolean;
  isAdmin: boolean;
  canEditSpace: boolean;
  canManageMembers: boolean;
  canCreateContent: boolean;
  canAccessSettings: boolean;
}

interface SpaceSettingsState {
  space: SpaceSettingsData | null;
  permissions: SpacePermissions | null;
  formData: Partial<SpaceSettingsData>;
  loadingSpace: boolean;
  loadingPermissions: boolean;
  error: string | null;
  
  loadActiveSpace: (
    identifier: { subdomain?: string; spaceId?: string }, 
    userId: string, 
    force?: boolean
  ) => Promise<void>;

  fetchPermissionsForSpace: (spaceId: string, userId: string) => Promise<void>;
  
  setFormDataField: <K extends keyof Partial<SpaceSettingsData>>(
    field: K, 
    value: Partial<SpaceSettingsData>[K]
  ) => void;
  resetStore: () => void;
}

interface SpaceAccessRow {
  id: string;
  space_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | string;
  is_active: boolean;
}

const initialState: Pick<SpaceSettingsState, 'space' | 'permissions' | 'formData' | 'loadingSpace' | 'loadingPermissions' | 'error'> = {
  space: null,
  permissions: null,
  formData: {},
  loadingSpace: false,
  loadingPermissions: false,
  error: null,
};

const spaceCache = new Map<string, { data: SpaceSettingsData, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const useSpaceSettingsStore = create<SpaceSettingsState>((set, get) => ({
  ...initialState,

  loadActiveSpace: async (identifier, userId, force = false) => {
    if (!userId) {
      set({ error: "User ID is required to load space.", loadingSpace: false, loadingPermissions: false });
      return;
    }
    if (!identifier.subdomain && !identifier.spaceId) {
      set({ error: "Subdomain or Space ID is required.", loadingSpace: false, loadingPermissions: false });
      return;
    }

    const cacheKey = identifier.subdomain || identifier.spaceId!;
    
    if (!force) {
      const cached = spaceCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log(`[SpaceSettingsStore] Using cached data for ${cacheKey}`);
        set({ 
          space: cached.data, 
          loadingSpace: false, 
          error: null,
          formData: { ...cached.data }
        });
        if (get().space && (!get().permissions || force || get().permissions === null)) {
           await get().fetchPermissionsForSpace(get().space!.id, userId);
        }
        return;
      }
    }

    set({ loadingSpace: true, loadingPermissions: true, error: null, space: null, permissions: null });

    let spaceData: SpaceSettingsData | null = null;
    let fetchError: string | null = null;

    try {
      let query = supabase.from('spaces').select('id, name, description, about_description, cover_image, icon_image, subdomain, owner_id, is_private, primary_color, pricing_type, price_per_month, member_count, created_at, updated_at');
      
      if (identifier.subdomain) {
        query = query.eq('subdomain', identifier.subdomain);
      } else if (identifier.spaceId) {
        query = query.eq('id', identifier.spaceId);
      }
      
      const { data: fetchedSpace, error: spaceFetchError } = await query.single();

      if (spaceFetchError) {
        fetchError = `Failed to fetch space: ${spaceFetchError.message}`;
        if (spaceFetchError.code === 'PGRST116') {
          fetchError = "Space not found.";
        }
        throw new Error(fetchError);
      }

      if (!fetchedSpace) {
        fetchError = "Space not found or no data returned.";
        throw new Error(fetchError);
      }
      
      spaceData = fetchedSpace as unknown as SpaceSettingsData;
      spaceCache.set(cacheKey, { data: spaceData, timestamp: Date.now() });
      
      set({ space: spaceData, loadingSpace: false, formData: { ...spaceData } });

      await get().fetchPermissionsForSpace(spaceData.id, userId);

    } catch (error: any) {
      console.error("[SpaceSettingsStore] Error loading active space:", error);
      set({ error: fetchError || error.message || "An unknown error occurred", loadingSpace: false, loadingPermissions: false, space: null, permissions: null });
      toast({ title: "Error", description: fetchError || error.message, variant: "destructive" });
    }
  },
  
  fetchPermissionsForSpace: async (spaceId: string, userId: string) => {
    if(!spaceId || !userId) return;

    set({ loadingPermissions: true, error: null });
    try {
      const currentSpaceInStore = get().space;
      let userIsOwner = false;
      if (currentSpaceInStore && currentSpaceInStore.id === spaceId) {
        userIsOwner = currentSpaceInStore.owner_id === userId;
      } else {
        const { data: ownerCheckData, error: ownerCheckError } = await supabase
          .from('spaces')
          .select('owner_id')
          .eq('id', spaceId)
          .single();
        if (ownerCheckError) throw ownerCheckError;
        userIsOwner = ownerCheckData?.owner_id === userId;
      }

      let userIsAdmin = false;
      let userIsMember = false;

      if (userIsOwner) {
        userIsAdmin = true;
        userIsMember = true;
      } else {
        const { data: accessData, error: accessError } = await supabase
          .from('space_access')
          .select('role, is_active')
          .eq('space_id', spaceId)
          .eq('user_id', userId)
          .eq('is_active', true)
          .single();

        if (accessError && accessError.code !== 'PGRST116') {
          throw accessError;
        }
        
        if (accessData) {
          const typedAccessData = accessData as unknown as Pick<SpaceAccessRow, 'role' | 'is_active'>;
          userIsAdmin = typedAccessData.role === 'admin';
          userIsMember = true;
        }
      }
      
      const calculatedPermissions: SpacePermissions = {
        isOwner: userIsOwner,
        isAdmin: userIsAdmin,
        canEditSpace: userIsOwner || userIsAdmin,
        canManageMembers: userIsOwner || userIsAdmin,
        canCreateContent: userIsMember || userIsOwner || userIsAdmin,
        canAccessSettings: userIsOwner,
      };

      set({ permissions: calculatedPermissions, loadingPermissions: false, error: null });

    } catch (error: any) {
      console.error("[SpaceSettingsStore] Error fetching permissions:", error);
      const permissionError = `Failed to load permissions: ${error.message || 'Unknown error'}`;
      set({ error: permissionError, loadingPermissions: false, permissions: null });
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
  
  resetStore: () => {
    console.log("[SpaceSettingsStore] Resetting store to initial state.");
    set(initialState);
  },
}));

export default useSpaceSettingsStore; 