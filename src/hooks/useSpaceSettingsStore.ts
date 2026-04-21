import { log } from '@/utils/logger';
import { create } from 'zustand';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import isEqual from 'lodash-es/isEqual';
import { sanitizeErrorMessage, sanitizeErrorForToast } from '@/utils/errorMessageSanitizer';

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
  intro_media_type?: 'image' | 'video' | 'none' | null;
  intro_media_url?: string | null;
  intro_media_thumbnail_url?: string | null;
}

interface SpacePermissions {
  isOwner: boolean;
  isAdmin: boolean;
  isMember: boolean;
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
  initialTab: string | null;

  openModal: () => void;
  openModalToTab: (tab: string) => void;
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

interface SpaceMemberRow {
  role: string;
  status: string;
}

const initialState: Pick<SpaceSettingsState, 'space' | 'permissions' | 'formData' | 'loadingSpace' | 'loadingPermissions' | 'error' | 'isOpen' | 'isSubmitting' | 'isDirty' | 'initialTab'> = {
  space: null,
  permissions: null,
  formData: {},
  loadingSpace: false,
  loadingPermissions: false,
  error: null,
  isOpen: false,
  isSubmitting: false,
  isDirty: false,
  initialTab: null,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Add navigation state tracking
interface NavigationState {
  lastRouteChange: number;
  isNavigatingBetweenRoutes: boolean;
  lastActiveSpace: string | null;
}

const navigationState: NavigationState = {
  lastRouteChange: Date.now(),
  isNavigatingBetweenRoutes: false,
  lastActiveSpace: null
};

// CRITICAL: Request deduplication map to prevent "Fetch Storms"
const pendingSpaceRequests = new Map<string, Promise<SpaceSettingsData | null>>();

// Enhanced cache with route-aware persistence
export const enhancedSpaceCache = new Map<string, {
  data: SpaceSettingsData,
  timestamp: number,
  routeTransitionData?: { fromRoute: string; toRoute: string; preserveUntil: number; }
}>();

const useSpaceSettingsStore = create<SpaceSettingsState>((set, get) => ({
  ...initialState,

  openModal: () => set({ isOpen: true, initialTab: null }),
  openModalToTab: (tab: string) => set({ isOpen: true, initialTab: tab }),
  closeModal: () => set({ isOpen: false, formData: get().space ? { ...get().space } : {}, isDirty: false, initialTab: null }),

  loadActiveSpace: async (identifier: { subdomain?: string; spaceId?: string }, userId: string, force = false) => {
    if (!userId) {
      set({ error: "User ID is required to load space.", loadingSpace: false, loadingPermissions: false });
      return;
    }
    if (!identifier.subdomain && !identifier.spaceId) {
      set({ error: "Subdomain or Space ID is required.", loadingSpace: false, loadingPermissions: false });
      return;
    }

    const cacheKey = identifier.subdomain || identifier.spaceId!;

    // MOBILE OPTIMIZATION: Always check cache first and use it immediately
    if (!force) {
      const cached = enhancedSpaceCache.get(cacheKey);
      const now = Date.now();

      if (cached) {
        const cacheAge = now - cached.timestamp;
        const isRecentCache = cacheAge < CACHE_TTL;
        const isReasonablyFresh = cacheAge < 15 * 60 * 1000; // 15 minutes

        if ((isRecentCache || isReasonablyFresh) && cached.data.id) {
          log.debug('Hook', `🚀 [Mobile Optimized] Using cached space data for ${cacheKey} (age: ${Math.round(cacheAge / 1000)}s)`);

          const originalSpaceData = cached.data;
          set({
            space: originalSpaceData,
            loadingSpace: false,
            error: null,
            formData: { ...originalSpaceData },
            isDirty: false
          });

          if (!get().permissions || get().permissions === null) {
            get().fetchPermissionsForSpace(originalSpaceData.id, userId);
          }

          if (cacheAge > 2 * 60 * 1000) {
            log.debug('Hook', `🔄 [Mobile] Background refresh for ${cacheKey}`);
            setTimeout(() => {
              get().loadActiveSpace(identifier, userId, true);
            }, 500);
          }

          return;
        } else if (cached && !cached.data.id) {
          log.warn('Hook', `🛡️ [SpaceSettings] Cache hit for ${cacheKey} but missing ID, skipping cache and fetching...`);
        }
      }
    }

    const existingSpace = get().space;
    const existingPermissions = get().permissions;

    const shouldPreserveSpace = existingSpace &&
      identifier.subdomain &&
      existingSpace.subdomain === identifier.subdomain;

    if (shouldPreserveSpace) {
      log.debug('Hook', `🔒 [SpaceSettings] Already have space data for ${identifier.subdomain}, skipping loading state`);
      if (!existingPermissions) {
        set({ loadingPermissions: true, error: null });
      }
    } else {
      log.debug('Hook', `🔄 [SpaceSettings] Loading new space data for ${cacheKey}`);
      set({
        loadingSpace: true,
        loadingPermissions: !existingPermissions,
        error: null
      });
    }

    navigationState.lastActiveSpace = cacheKey;

    let spaceData: SpaceSettingsData | null = null;

    try {
      // 🛡️ DEDUPLICATION: Check if there's already a request in flight for this space
      if (pendingSpaceRequests.has(cacheKey)) {
        log.debug('Hook', `🛡️ [Deduplication] Joining existing fetch for ${cacheKey}`);
        spaceData = await pendingSpaceRequests.get(cacheKey)!;
      } else {
        const fetchPromise = (async () => {
          const supabase = getSupabaseClient();

          if (identifier.subdomain) {
            const { data, error } = await supabase
              .from('spaces')
              .select('*')
              .eq('subdomain', identifier.subdomain)
              .single();

            if (error) throw error;
            return data as SpaceSettingsData;
          } else if (identifier.spaceId) {
            const { data, error } = await supabase
              .from('spaces')
              .select('*')
              .eq('id', identifier.spaceId)
              .single();

            if (error) throw error;
            return data as SpaceSettingsData;
          }
          return null;
        })();

        pendingSpaceRequests.set(cacheKey, fetchPromise);

        try {
          spaceData = await fetchPromise;
        } finally {
          pendingSpaceRequests.delete(cacheKey);
        }
      }

      if (spaceData && spaceData.id) {
        set({
          space: spaceData,
          loadingSpace: false,
          error: null,
          formData: { ...spaceData },
          isDirty: false
        });

        enhancedSpaceCache.set(cacheKey, {
          data: spaceData,
          timestamp: Date.now(),
        });

        // Save for quick access and fallback
        try {
          localStorage.setItem('lastActiveSpace', JSON.stringify({
            ...spaceData,
            timestamp: Date.now()
          }));

          if (spaceData.owner_id === userId) {
            localStorage.setItem(`user_owns_space_${spaceData.subdomain}`, 'true');
          }
        } catch (e) {
          // Ignore storage errors
        }

        get().fetchPermissionsForSpace(spaceData.id, userId);
      } else {
        throw new Error("Space not found or unauthorized");
      }
    } catch (error: any) {
      log.error('Hook', `❌ [SpaceSettings] Fetch failed for ${cacheKey}:`, error);

      // PHASE 1 FIX: Enhanced catastrophic error handling to preserve space data
      if (!existingSpace || (identifier.subdomain && existingSpace.subdomain !== identifier.subdomain)) {
        const sanitizedError = sanitizeErrorMessage(error, import.meta.env.PROD);
        set({ loadingSpace: false, error: sanitizedError, space: null });
      } else {
        log.debug('Hook', `🔒 [Phase1] Error but preserving existing space data for ${identifier.subdomain}`);
        set({ loadingSpace: false, error: null });
      }
    }
  },

  fetchPermissionsForSpace: async (spaceId: string, userId: string) => {
    if (!spaceId || !userId) {
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
        const { data: ownerCheckData, error: ownerCheckError } = await getSupabaseClient()
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
        const { data: accessData, error: accessError } = await getSupabaseClient()
          .from('space_members')
          .select('role, status')
          .eq('space_id', spaceId)
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        if (accessError && accessError.code !== 'PGRST116') {
          throw accessError;
        }

        if (accessData) {
          const typedAccessData = accessData as unknown as Pick<SpaceMemberRow, 'role' | 'status'>;
          userIsAdmin = typedAccessData.role === 'admin';
          userIsMember = true;
        }
      }

      const calculatedPermissions: SpacePermissions = {
        isOwner: userIsOwner,
        isAdmin: userIsAdmin,
        isMember: userIsMember,
        canEditSpace: userIsOwner || userIsAdmin,
        canManageMembers: userIsOwner || userIsAdmin,
        canCreateContent: userIsOwner || userIsAdmin || userIsMember,
        canAccessSettings: userIsOwner || userIsAdmin, // CORRECTED: Both owners and admins can access settings
      };

      // Add debugging for admin status detection
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 [useSpaceSettingsStore] Admin status detection:', {
          userId,
          spaceId,
          userIsOwner,
          userIsAdmin,
          userIsMember,
          calculatedPermissions,
          userEmail: 'Check auth context for email'
        });
      }
      set({ permissions: calculatedPermissions, loadingPermissions: false });
    } catch (error: any) {
      log.error('Hook', "[SpaceSettingsStore] Error fetching permissions:", error);
      // Sanitize error messages for users
      const sanitizedError = sanitizeErrorMessage(error, import.meta.env.PROD);
      const toastError = sanitizeErrorForToast(error, import.meta.env.PROD);
      set({ error: sanitizedError, loadingPermissions: false, permissions: null });
      toast({ title: toastError.title, description: toastError.description, variant: "destructive" });
    }
  },

  setFormDataField: <K extends keyof Partial<SpaceSettingsData>>(
    field: K,
    value: Partial<SpaceSettingsData>[K]
  ) => {
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
    const { space, formData, permissions } = get();
    if (!space || !permissions?.canEditSpace) {
      return { success: false, error: "No space loaded or insufficient permissions." };
    }

    set({ isSubmitting: true });

    const originalSpaceData = space; // The clean data loaded from DB
    const currentFormData = formData;   // The potentially modified data in the form

    // Determine what actually changed
    const changedFields: Partial<SpaceSettingsData> = {};
    (Object.keys(currentFormData) as Array<keyof SpaceSettingsData>).forEach(key => {
      if (!isEqual(currentFormData[key], originalSpaceData[key])) {
        // Ensure that rules_list is handled correctly, especially if it can be null
        if (key === 'rules_list') {
          if (currentFormData.rules_list === null && originalSpaceData.rules_list && originalSpaceData.rules_list.length > 0) {
            (changedFields as any)[key] = null; // Explicitly setting to null
          } else if (currentFormData.rules_list && !isEqual(currentFormData.rules_list, originalSpaceData.rules_list)) {
            (changedFields as any)[key] = currentFormData[key];
          } else if (!currentFormData.rules_list && originalSpaceData.rules_list) {
            // If current is empty/null but original was not, this is a change (clearing rules)
            (changedFields as any)[key] = []; // or null, depending on DB constraints
          }
        } else {
          // Use 'as any' to bypass the 'never' type error, assuming the logic correctly maps types.
          (changedFields as any)[key] = currentFormData[key];
        }
      }
    });

    // If rules_list was initially null/undefined and became an empty array, isEqual might consider it unchanged.
    // Explicitly check if rules_list was touched to become an empty array from a non-empty state or vice-versa.
    if (originalSpaceData.rules_list && currentFormData.rules_list?.length === 0 && originalSpaceData.rules_list.length > 0) {
      if (!changedFields.rules_list) changedFields.rules_list = [];
    }
    // if currentFormData.rules_list is null and original was not, it might be missed by isEqual if original was empty array
    if (currentFormData.rules_list === null && originalSpaceData.rules_list) {
      if (!changedFields.rules_list) changedFields.rules_list = null as any;
    }


    if (Object.keys(changedFields).length === 0) {
      set({ isSubmitting: false, isDirty: false });
      toast({ title: "No changes to save." });
      return { success: true };
    }

    // Ensure all necessary fields are present if they are not optional in DB but optional in type
    // For example, if 'name' cannot be null in DB
    if (changedFields.name === null || changedFields.name === '') {
      set({ isSubmitting: false, error: "Space name cannot be empty." });
      toast({ title: "Validation Error", description: "Space name cannot be empty.", variant: "destructive" });
      return { success: false, error: "Space name cannot be empty." };
    }
    if (changedFields.subdomain === null || changedFields.subdomain === '') {
      set({ isSubmitting: false, error: "Subdomain cannot be empty." });
      toast({ title: "Validation Error", description: "Subdomain cannot be empty.", variant: "destructive" });
      return { success: false, error: "Subdomain cannot be empty." };
    }

    // Prepare a payload with stricter typing for Supabase
    const updatePayload: { [K in keyof Partial<SpaceSettingsData>]: Partial<SpaceSettingsData>[K] } = { ...changedFields };

    if (updatePayload.hasOwnProperty('pricing_type')) {
      const pt = updatePayload.pricing_type;
      if (pt !== 'free' && pt !== 'paid') {
        updatePayload.pricing_type = null;
      }
      if (updatePayload.pricing_type === 'free' || updatePayload.pricing_type === null) {
        updatePayload.price_per_month = null as any;
      } else if (updatePayload.pricing_type === 'paid') {
        const ppmForm = currentFormData.price_per_month;
        const ppmNum = typeof ppmForm === 'string' ? parseFloat(ppmForm) : ppmForm;
        if (typeof ppmNum === 'number' && !isNaN(ppmNum) && ppmNum > 0) {
          updatePayload.price_per_month = ppmNum;
        } else {
          updatePayload.price_per_month = null as any; // Or handle as an error if price is required for 'paid'
        }
      }
    }
    // Ensure intro_media_url is null if type is none
    if (updatePayload.intro_media_type === 'none') {
      updatePayload.intro_media_url = null;
      updatePayload.intro_media_thumbnail_url = null;
    }

    // Remove any fields that are undefined, as Supabase might not like them
    Object.keys(updatePayload).forEach(key => {
      if (updatePayload[key as keyof typeof updatePayload] === undefined) {
        delete updatePayload[key as keyof typeof updatePayload];
      }
    });

    try {
      // Use the sanitized and more strictly typed updatePayload
      const { data: updatedSpace, error } = await getSupabaseClient()
        .from('spaces')
        .update(updatePayload as any) // Use 'as any' if TS still complains about the dynamic payload
        .eq('id', space.id)
        .select('id, name, description, about_description, cover_image, icon_image, subdomain, owner_id, is_private, pricing_type, price_per_month, member_count, created_at, updated_at, feature_classroom_enabled, feature_calendar_enabled, feature_map_enabled, feature_7_day_trial_enabled, rules_list, support_email, intro_media_type, intro_media_url, intro_media_thumbnail_url')
        .single();

      if (error) {
        log.error('Hook', "Error updating space settings:", error);
        throw error;
      }

      if (updatedSpace) {
        const newSpaceData = updatedSpace as unknown as SpaceSettingsData;
        enhancedSpaceCache.set(newSpaceData.subdomain, { data: newSpaceData, timestamp: Date.now() });
        enhancedSpaceCache.set(newSpaceData.id, { data: newSpaceData, timestamp: Date.now() });

        set({
          space: newSpaceData,
          formData: { ...newSpaceData },
          isSubmitting: false,
          isDirty: false,
          error: null,
        });
        toast({ title: "Success!", description: "Space settings saved." });
        return { success: true };
      }
      return { success: false, error: "Failed to update space, no data returned." };

    } catch (error: any) {
      log.error('Hook', "Error in saveSpaceSettings:", error);
      // Sanitize error messages for users
      const toastError = sanitizeErrorForToast(error, import.meta.env.PROD);
      const sanitizedError = sanitizeErrorMessage(error, import.meta.env.PROD);
      set({ isSubmitting: false, error: sanitizedError });
      toast({ title: toastError.title, description: toastError.description, variant: "destructive" });
      return { success: false, error: sanitizedError };
    }
  },

  resetStore: () => {
    set(initialState);
  },
}));

// Navigation tracker - call this whenever route changes occur
export const trackRouteChange = (fromRoute: string, toRoute: string) => {
  navigationState.lastRouteChange = Date.now();
  navigationState.isNavigatingBetweenRoutes = true;

  log.debug('Hook', `🧭 Route change tracked: ${fromRoute} → ${toRoute}`);

  // Reset navigation flag after a short delay
  setTimeout(() => {
    navigationState.isNavigatingBetweenRoutes = false;
  }, 1000);
};

// Cleanup function for cache maintenance
export const cleanupSpaceCache = () => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes

  for (const [key, entry] of enhancedSpaceCache.entries()) {
    if (now - entry.timestamp > maxAge) {
      enhancedSpaceCache.delete(key);
      log.debug('Hook', `🧹 Cleaned up stale cache entry: ${key}`);
    }
  }
};

// Auto cleanup every 5 minutes
setInterval(cleanupSpaceCache, 5 * 60 * 1000);

export default useSpaceSettingsStore;