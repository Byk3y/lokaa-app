import useSpaceSettingsStore, { SpaceSettingsData } from '@/hooks/useSpaceSettingsStore';
import { resolveImageUrl } from '@/utils/preloadAssets';
import { IconUser, IconSettings, IconPhoto, IconPalette, IconLock, IconCreditCard, IconAlertTriangle, IconTrash, IconLoader2 } from '@tabler/icons-react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useSpaceSettingsModal } from '@/contexts/SpaceSettingsModalContext';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import { getSupabaseClient } from '@/integrations/supabase/client';

// Define a more specific type for the update payload
interface SpaceUpdatePayload {
  name?: string;
  description?: string | null;
  about_description?: string | null;
  icon_image?: string | null;
  cover_image?: string | null;
  is_private?: boolean;
  primary_color?: string | null;
  // Explicitly NOT including pricing_type, member_count, etc., which are not changed here
}

const SpaceSettingsModal = () => {
  const { isOpen, onClose, spaceId, subdomain } = useSpaceSettingsModal();
  const { 
    space: storeSpace, 
    permissions: storePermissions,
    formData,
    loadingSpace,
    loadingPermissions,
    error,
    loadActiveSpace, 
    setFormDataField
  } = useSpaceSettingsStore();
  const { user } = useOptimizedAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  useEffect(() => {
    if (isOpen && spaceId && user?.id) {
      loadActiveSpace({ spaceId }, user.id, true);
    } else if (!isOpen) {
      setActiveTab('general');
      setShowDeleteConfirm(false);
      setDeleteConfirmName('');
    }
  }, [isOpen, spaceId, user?.id, loadActiveSpace]);

  useEffect(() => {
    if (storeSpace) {
      setFormDataField('name', storeSpace.name);
      setFormDataField('description', storeSpace.description || '');
      setFormDataField('about_description', storeSpace.about_description || '');
      setFormDataField('is_private', storeSpace.is_private);
      setFormDataField('primary_color', storeSpace.primary_color || '#007bff');
    }
  }, [storeSpace, setFormDataField]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSaveChanges = async () => {
    if (!storeSpace || !user || !storePermissions?.canEditSpace) return;
    // console.log('[SpaceSettingsModal] Saving changes for space:', storeSpace.id);
    // console.log('[SpaceSettingsModal] Current formData:', formData);

    setIsSubmitting(true);
    try {
      // Construct the update object only with fields that are present in formData
      const updateData: SpaceUpdatePayload = {}; // Use the specific type
      if (formData.name !== undefined) updateData.name = formData.name;
      if (formData.description !== undefined) updateData.description = formData.description;
      if (formData.about_description !== undefined) updateData.about_description = formData.about_description;
      if (formData.icon_image !== undefined) updateData.icon_image = formData.icon_image;
      if (formData.cover_image !== undefined) updateData.cover_image = formData.cover_image;
      if (formData.is_private !== undefined) updateData.is_private = formData.is_private;
      if (formData.primary_color !== undefined) updateData.primary_color = formData.primary_color;
      
      const { error: updateError } = await getSupabaseClient()
        .from('spaces')
        .update(updateData)
        .eq('id', storeSpace.id);

      if (updateError) {
        throw updateError;
      }
      
      toast({ title: "Success", description: "Space settings updated." });
      await loadActiveSpace({ spaceId: storeSpace.id }, user.id, true);
      onClose();
    } catch (e: any) {
      console.error("Error saving space settings:", e);
      toast({ title: "Error", description: e.message || "Failed to update space settings.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteSpace = async () => {
    if (!storeSpace || !user || !storePermissions?.isOwner || deleteConfirmName !== storeSpace.name) {
      toast({ title: "Error", description: "Cannot delete space. Please check permissions or confirmation name.", variant: "destructive"});
      return;
    }
    setIsSubmitting(true);
    try {
      const { error: deleteError } = await getSupabaseClient()
        .from('spaces')
        .delete()
        .eq('id', storeSpace.id);

      if (deleteError) throw deleteError;

      toast({ title: "Success", description: `Space "${storeSpace.name}" has been deleted.`});
      onClose();
      window.location.reload();

    } catch (e: any) {
      console.error("Error deleting space:", e);
      toast({ title: "Error deleting space", description: e.message || "An unexpected error occurred.", variant: "destructive"});
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmName('');
    }
  };

  const isLoading = loadingSpace || loadingPermissions;

  if (!isOpen) return null;

  if (isLoading && !storeSpace) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[800px] h-[600px] flex flex-col items-center justify-center">
          <IconLoader2 className="h-12 w-12 animate-spin text-gray-500" />
          <p className="mt-4 text-lg text-gray-600">Loading Space Settings...</p>
        </DialogContent>
      </Dialog>
    );
  }

  if (error && !storeSpace) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[800px] h-[600px] flex flex-col items-center justify-center">
           <IconAlertTriangle className="h-12 w-12 text-yellow-500" />
          <DialogHeader>
            <DialogTitle>Space Settings</DialogTitle>
          </DialogHeader>
          <p className="mt-4 text-lg text-gray-600">Space data is not available. It might still be loading or an error occurred.</p>
          {isLoading && <p>Loading...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}
        </DialogContent>
      </Dialog>
    );
  }

  if (!storeSpace || !storePermissions) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[800px] h-[600px] flex flex-col items-center justify-center">
           <IconAlertTriangle className="h-12 w-12 text-yellow-500" />
          <DialogHeader>
            <DialogTitle>Space Settings</DialogTitle>
          </DialogHeader>
          <p className="mt-4 text-lg text-gray-600">Space data is not available. It might still be loading or an error occurred.</p>
          {isLoading && <p>Loading...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}
        </DialogContent>
      </Dialog>
    );
  }

  const canEditGeneral = storePermissions.canEditSpace;
  const canChangeAppearance = storePermissions.canEditSpace;
  const canManageAccess = storePermissions.canEditSpace;
  const canManageBilling = storePermissions.isOwner;
  const canDeleteSpace = storePermissions.isOwner;

  const renderTabContent = () => {
    const isContentLoading = loadingSpace || loadingPermissions;

    if (isContentLoading && activeTab !== 'danger') {
        return (
          <div className="flex-grow flex items-center justify-center">
            <IconLoader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        );
    }
    
    switch (activeTab) {
      case 'general':
        return (
          <div className="flex-grow p-6 relative">
            <h3 className="text-xl font-semibold mb-4">General</h3>
            {!canEditGeneral && <p className="text-sm text-yellow-600 mb-4">You do not have permission to edit general settings.</p>}
            
            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="label">Name</label>
                <input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={(e) => setFormDataField('name', e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="description" className="label">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={(e) => setFormDataField('description', e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="about_description" className="label">About Description</label>
                <textarea
                  id="about_description"
                  name="about_description"
                  value={formData.about_description}
                  onChange={(e) => setFormDataField('about_description', e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="is_private" className="label">Is Private</label>
                <input
                  id="is_private"
                  name="is_private"
                  type="checkbox"
                  checked={formData.is_private}
                  onChange={(e) => setFormDataField('is_private', e.target.checked)}
                />
              </div>
              <div>
                <label htmlFor="primary_color" className="label">Primary Color</label>
                <input
                  id="primary_color"
                  name="primary_color"
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormDataField('primary_color', e.target.value)}
                />
              </div>
            </div>
            {isContentLoading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><IconLoader2 className="h-6 w-6 animate-spin"/></div>}
          </div>
        );
      case 'appearance':
        return (
          <div className="flex-grow p-6 relative">
            <h3 className="text-xl font-semibold mb-4">Appearance</h3>
            {!canChangeAppearance && <p className="text-sm text-yellow-600 mb-4">You do not have permission to change appearance settings.</p>}
            
            <div className="space-y-6">
              <div>
                <label htmlFor="icon_image" className="label">Icon Image</label>
                <input
                  id="icon_image"
                  name="icon_image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setFormDataField('icon_image', url);
                    }
                  }}
                />
              </div>
              <div>
                <label htmlFor="cover_image" className="label">Cover Image</label>
                <input
                  id="cover_image"
                  name="cover_image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setFormDataField('cover_image', url);
                    }
                  }}
                />
              </div>
            </div>
            {isContentLoading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><IconLoader2 className="h-6 w-6 animate-spin"/></div>}
          </div>
        );
      case 'access':
        return (
          <div className="flex-grow p-6 relative">
            <h3 className="text-xl font-semibold mb-4">Access & Privacy</h3>
            {!canManageAccess && <p className="text-sm text-yellow-600 mb-4">You do not have permission to change access settings.</p>}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <label htmlFor="is_private" className="label">Is Private</label>
                  <input
                    id="is_private"
                    name="is_private"
                    type="checkbox"
                    checked={formData.is_private}
                    onChange={(e) => setFormDataField('is_private', e.target.checked)}
                  />
                </div>
              </div>
            </div>

            {isContentLoading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><IconLoader2 className="h-6 w-6 animate-spin"/></div>}
          </div>
        );
      case 'billing':
        return (
          <div className="flex-grow p-6 relative">
            <h3 className="text-xl font-semibold mb-4">Billing</h3>
            {!canManageBilling && <p className="text-sm text-yellow-600 mb-4">You do not have permission to manage billing.</p>}
            
            <div className="space-y-4">
              <div className="p-4 border border-red-300 rounded-lg">
                {/* Billing content */}
              </div>
            </div>
          </div>
        );
      case 'danger':
        return (
          <div className="flex-grow p-6 relative">
            <h3 className="text-xl font-semibold mb-4 text-red-600">Danger Zone</h3>
            {!canDeleteSpace && <p className="text-sm text-yellow-600 mb-4">You do not have permission to delete this space.</p>}
            
            <div className="space-y-4">
              <div className="p-4 border border-red-300 rounded-lg">
                {/* Danger zone content */}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[800px] h-[600px] flex flex-col items-center justify-center">
        <IconLoader2 className="h-12 w-12 animate-spin text-gray-500" />
        <p className="mt-4 text-lg text-gray-600">Loading Space Settings...</p>
      </DialogContent>
    </Dialog>
  );
};

export default SpaceSettingsModal; 