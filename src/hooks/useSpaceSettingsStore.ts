import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { isEqual } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

export interface RuleItem {
  id: string;
  text: string;
}

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
  pricing_type?: 'free' | 'paid' | string;
  price_per_month?: number;
  member_count?: number;
  created_at?: string;
  updated_at?: string;
  feature_classroom_enabled?: boolean;
  feature_calendar_enabled?: boolean;
  feature_map_enabled?: boolean;
  feature_7_day_trial_enabled?: boolean;
  rules_list?: RuleItem[] | null;
  support_email?: string | null;
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
  isOpen: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  
  openModal: () => void;
  closeModal: () => void;
  
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
  saveSpaceSettings: () => Promise<{ success: boolean; error?: string }>;
  resetStore: () => void;
}

interface SpaceAccessRow {
  id: string;
  space_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | string;
  is_active: boolean;
}

const initialState: Pick<SpaceSettingsState, 'space' | 'permissions' | 'formData' | 'loadingSpace' | 'loadingPermissions' | 'error' | 'isOpen' | 'isSubmitting' | 'isDirty'> = {
  space: null,
  permissions: null,
  formData: {},
  loadingSpace: false,
  loadingPermissions: false,
  error: null,
  isOpen: false,
  isSubmitting: false,
  isDirty: false,
};

const spaceCache = new Map<string, { data: SpaceSettingsData, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const useSpaceSettingsStore = create<SpaceSettingsState>((set, get) => ({
  ...initialState,

  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false, formData: get().space ? { ...get().space } : {}, isDirty: false }),

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
        const originalSpaceData = cached.data;
        set({ 
          space: originalSpaceData, 
          loadingSpace: false, 
          error: null,
          formData: { ...originalSpaceData },
          isDirty: false
        });
        if (get().space && (!get().permissions || force || get().permissions === null)) {
           await get().fetchPermissionsForSpace(get().space!.id, userId);
        }
        return;
      }
    }

    set({ loadingSpace: true, loadingPermissions: true, error: null, space: null, permissions: null, formData: {}, isDirty: false });

    let spaceData: SpaceSettingsData | null = null;
    let fetchError: string | null = null;

    try {
      let query = supabase.from('spaces').select('id, name, description, about_description, cover_image, icon_image, subdomain, owner_id, is_private, pricing_type, price_per_month, member_count, created_at, updated_at, feature_classroom_enabled, feature_calendar_enabled, feature_map_enabled, feature_7_day_trial_enabled, rules_list, support_email');
      
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

      // Default rules population
      if (!spaceData.rules_list || spaceData.rules_list.length === 0) {
        spaceData.rules_list = [
          { id: uuidv4(), text: "Be positive" },
          { id: uuidv4(), text: "No self-promotion" },
          { id: uuidv4(), text: "Make an effort" },
        ];
      }

      spaceCache.set(cacheKey, { data: spaceData, timestamp: Date.now() });
      
      set({ space: spaceData, loadingSpace: false, formData: { ...spaceData }, isDirty: false });

      await get().fetchPermissionsForSpace(spaceData.id, userId);

    } catch (error: any) {
      console.error("[SpaceSettingsStore] Error loading active space:", error);
      set({ error: fetchError || error.message || "An unknown error occurred", loadingSpace: false, loadingPermissions: false, space: null, permissions: null, formData: {}, isDirty: false });
      toast({ title: "Error", description: fetchError || error.message, variant: "destructive" });
    }
  },
  
  fetchPermissionsForSpace: async (spaceId: string, userId: string) => {
    if(!spaceId || !userId) {
        set({ loadingPermissions: false });
        return;
    }

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
        canCreateContent: userIsOwner || userIsAdmin || userIsMember,
        canAccessSettings: userIsOwner || userIsAdmin,
      };
      set({ permissions: calculatedPermissions, loadingPermissions: false });
    } catch (error: any) {
      console.error("[SpaceSettingsStore] Error fetching permissions:", error);
      set({ error: error.message || "Failed to fetch permissions.", loadingPermissions: false, permissions: null });
      toast({ title: "Permissions Error", description: error.message, variant: "destructive" });
    }
  },

  setFormDataField: (field, value) => {
    set(state => {
      let processedValue = value;
      // Coerce empty string for pricing_type to undefined for consistent comparison
      if (field === 'pricing_type' && value === '') {
        processedValue = undefined;
      }

      const newFormData = { ...state.formData, [field]: processedValue };
      let trulyDirty = false;

      if (state.space) {
        // Iterate over the keys of the original space data to ensure we compare defined fields
        for (const key in state.space) {
          if (Object.prototype.hasOwnProperty.call(state.space, key)) {
            const originalValue = state.space[key as keyof SpaceSettingsData];
            const formValue = newFormData[key as keyof SpaceSettingsData];
            
            // Handle cases where formValue might be undefined if not yet set in formData
            // but originalValue exists. They are different if formValue is not explicitly set to originalValue.
            if (!isEqual(formValue, originalValue)) {
                // Exception: if formValue is undefined (field not touched in form yet or cleared)
                // and originalValue is null, consider them equal for dirtiness check.
                // Or if formValue is empty string and original is null for certain text fields.
                if (formValue === undefined && originalValue === null) {
                    // treat as same for dirtiness for optional fields
                } else if (typeof formValue === 'string' && formValue.trim() === '' && originalValue === null && 
                           ['description', 'about_description', 'cover_image', 'icon_image'].includes(key)) {
                    // treat empty string and null as same for these specific optional string fields
                } else {
                    trulyDirty = true;
                    break;
                }
            }
          }
        }
        // Also check if formData has keys not in original space data (newly added, though less common for settings)
        if (!trulyDirty) {
            for (const key in newFormData) {
                if (Object.prototype.hasOwnProperty.call(newFormData, key) && !Object.prototype.hasOwnProperty.call(state.space, key)) {
                    if (newFormData[key as keyof SpaceSettingsData] !== undefined && newFormData[key as keyof SpaceSettingsData] !== null) { // If new key has a meaningful value
                        trulyDirty = true;
                        break;
                    }
                }
            }
        }

      } else {
        // If there's no original space, any field in formData with a non-undefined/non-null value makes it dirty.
        for (const key in newFormData) {
            if (newFormData[key as keyof SpaceSettingsData] !== undefined && newFormData[key as keyof SpaceSettingsData] !== null) {
                trulyDirty = true;
                break;
            }
        }
      }
      return { formData: newFormData, isDirty: trulyDirty };
    });
  },

  saveSpaceSettings: async () => {
    const { space, formData } = get();
    if (!space || !space.id) {
      toast({ title: "Error", description: "No active space to save.", variant: "destructive" });
      return { success: false, error: "No active space to save." };
    }

    set({ isSubmitting: true, error: null });

    const changedFields: Partial<SpaceSettingsData> = {};
    let hasChanges = false;
    for (const key in formData) {
      if (Object.prototype.hasOwnProperty.call(formData, key)) {
        const formValue = formData[key as keyof SpaceSettingsData];
        const originalValue = space[key as keyof SpaceSettingsData];
        if (!isEqual(formValue, originalValue)) {
          if (formValue === null && originalValue === undefined && 
              ['description', 'about_description', 'cover_image', 'icon_image', 'price_per_month'].includes(key)) {
             (changedFields as any)[key] = formValue;
             hasChanges = true;
          } else if (formValue !== originalValue) {
            (changedFields as any)[key] = formValue;
            hasChanges = true;
          }
        }
      }
    }

    if (changedFields.id) delete changedFields.id;
    delete changedFields.owner_id;
    delete changedFields.member_count;
    delete changedFields.created_at;
    delete changedFields.updated_at;

    if (!hasChanges || Object.keys(changedFields).length === 0) {
      toast({ title: "No Changes", description: "There were no changes to save." });
      set({ isSubmitting: false });
      return { success: true };
    }

    try {
      // Create a new object for the Supabase update with strictly typed fields
      const finalUpdatePayload: {
        name?: string;
        description?: string | null;
        about_description?: string | null;
        cover_image?: string | null;
        icon_image?: string | null;
        subdomain?: string;
        is_private?: boolean;
        pricing_type?: 'free' | 'paid' | null;
        price_per_month?: number | null;    
        feature_classroom_enabled?: boolean;
        feature_calendar_enabled?: boolean;
        feature_map_enabled?: boolean;
        feature_7_day_trial_enabled?: boolean;
        rules_list?: any;
        support_email?: string | null;
      } = {};

      for (const key in changedFields) {
        if (Object.prototype.hasOwnProperty.call(changedFields, key)) {
          const k = key as keyof SpaceSettingsData;
          
          if (k === 'pricing_type') {
            const ptValue = changedFields[k];
            if (ptValue === 'free' || ptValue === 'paid') {
              finalUpdatePayload.pricing_type = ptValue;
            } else {
              finalUpdatePayload.pricing_type = null;
            }
          } else if (k === 'price_per_month') {
            const ppmValue = changedFields[k];
            if (typeof ppmValue === 'number') {
              finalUpdatePayload.price_per_month = !isNaN(ppmValue) ? ppmValue : null;
            } else if (typeof ppmValue === 'string') {
              if ((ppmValue as string).trim() !== '') {
                const parsed = parseFloat(ppmValue as string);
                finalUpdatePayload.price_per_month = !isNaN(parsed) ? parsed : null;
              } else {
                finalUpdatePayload.price_per_month = null;
              }
            } else {
              finalUpdatePayload.price_per_month = null;
            }
          } else if (k === 'rules_list') {
            finalUpdatePayload.rules_list = changedFields[k] as any;
          } else if (k !== 'id' && k !== 'owner_id' && k !== 'member_count' && k !== 'created_at' && k !== 'updated_at') {
            if (k in finalUpdatePayload) {
                 (finalUpdatePayload as any)[k] = changedFields[k];
            } else {
                 (finalUpdatePayload as any)[k] = changedFields[k];
            }
          }
        }
      }
      
      // If pricing_type is set to 'free', ensure price_per_month is null
      if (finalUpdatePayload.pricing_type === 'free') {
        finalUpdatePayload.price_per_month = null;
      }

      // If there are no relevant changes in finalUpdatePayload after filtering
      if (Object.keys(finalUpdatePayload).length === 0) {
        toast({ title: "No Effective Changes", description: "No changes to save after processing." });
        set({ isSubmitting: false });
        return { success: true };
      }

      const { error: updateError } = await supabase
        .from('spaces')
        .update(finalUpdatePayload) // Use the strictly typed payload
        .eq('id', space.id);

      if (updateError) throw updateError;

      const updatedSpaceData = { ...space, ...changedFields };
      spaceCache.set(updatedSpaceData.subdomain, { data: updatedSpaceData, timestamp: Date.now() });
      if (space.id) spaceCache.set(space.id, { data: updatedSpaceData, timestamp: Date.now() });

      set({
        space: updatedSpaceData,
        formData: { ...updatedSpaceData }, 
        isSubmitting: false,
        isDirty: false, 
        error: null,
      });
      return { success: true };
    } catch (error: any) {
      console.error("[SpaceSettingsStore] Error saving space settings:", error);
      set({ error: error.message || "Could not save settings.", isSubmitting: false });
      toast({ title: "Save Error", description: error.message, variant: "destructive" });
      return { success: false, error: error.message };
    }
  },
  
  resetStore: () => {
    set(initialState);
  },
}));

export default useSpaceSettingsStore; 

// Helper function to determine which fields have changed
function getChangedFields(
  original: Partial<SpaceSettingsData>, 
  current: Partial<SpaceSettingsData>
): Partial<SpaceSettingsData> {
  const changed: Partial<SpaceSettingsData> = {};
  const booleanFieldKeys: (keyof SpaceSettingsData)[] = ['is_private', 'feature_classroom_enabled', 'feature_calendar_enabled', 'feature_map_enabled', 'feature_7_day_trial_enabled'];

  (Object.keys(current) as Array<keyof SpaceSettingsData>).forEach(key => {
    let originalValue = original[key];
    let currentValue = current[key];

    if (booleanFieldKeys.includes(key)) {
      const currentBoolValue = currentValue === undefined || currentValue === null ? false : !!currentValue;
      const originalBoolValue = originalValue === undefined || originalValue === null ? false : !!originalValue;
      if (originalBoolValue !== currentBoolValue) {
        (changed as any)[key] = currentBoolValue;
      }
    } else if (key === 'rules_list') {
      const currentRules = Array.isArray(currentValue) ? currentValue : [];
      const originalRules = Array.isArray(originalValue) ? originalValue : [];
      if (!isEqual(currentRules, originalRules)) {
        (changed as any)[key] = currentRules;
      }
    } else if (!isEqual(originalValue, currentValue)) {
      if (key === 'pricing_type' && currentValue === '' && (originalValue === null || originalValue === undefined)) {
        // Explicitly do nothing
      } else {
        (changed as any)[key] = currentValue;
      }
    }
  });

  // Sanitize pricing_type: convert empty string to null
  if (changed.pricing_type === '') {
    changed.pricing_type = null;
  }

  // If price_per_month is included and pricing_type is 'free' or null, set price_per_month to null
  if (changed.pricing_type === 'free' || changed.pricing_type === null) {
    if (original.price_per_month !== null || (current.price_per_month !== null && current.price_per_month !== undefined)) {
       if (current.price_per_month !== null) (changed as any).price_per_month = null;
    } else if (changed.hasOwnProperty('price_per_month') && current.price_per_month !== null){
       (changed as any).price_per_month = null;
    }
  } else if (changed.pricing_type === 'paid') {
    const ppm = Number(current.price_per_month);
    if (isNaN(ppm) || ppm <= 0) {
      if (current.price_per_month !== null && current.price_per_month !== undefined) {
         (changed as any).price_per_month = isNaN(ppm) || ppm <=0 ? null : ppm;
      }
    } else {
      if (current.price_per_month !== original.price_per_month) {
        (changed as any).price_per_month = ppm;
      }
    }
  }
  
  // Sanitize boolean fields: ensure they are true or false, not undefined
  // This loop might be redundant if the first loop correctly handles booleans,
  // but it serves as a final correctness check.
  booleanFieldKeys.forEach(field => {
    if (changed.hasOwnProperty(field)) {
      (changed as any)[field] = !!changed[field]; // Coerce to boolean
    } else if (current.hasOwnProperty(field) && typeof current[field] === 'boolean' && current[field] !== original[field]) {
      // If not in `changed` yet but different from original and is a boolean
      (changed as any)[field] = !!current[field]; // Corrected: changed[field]
    }
  });

  console.log("Original for changedFields:", original);
  console.log("Current for changedFields:", current);
  console.log("Determined changed fields:", changed);
  return changed;
} 