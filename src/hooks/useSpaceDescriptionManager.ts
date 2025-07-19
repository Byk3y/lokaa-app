import { log } from '@/utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

export interface UseSpaceDescriptionManagerReturn {
  editingDescription: boolean;
  setEditingDescription: React.Dispatch<React.SetStateAction<boolean>>;
  descriptionText: string;
  descriptionLength: number;
  handleDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  saveDescription: () => Promise<void>;
  cancelDescription: () => void;
  isSavingDescription: boolean; // To indicate loading state for save operation
}

export default function useSpaceDescriptionManager(): UseSpaceDescriptionManagerReturn {
  const { user } = useOptimizedAuth();
  const {
    space: storeSpace,
    loadActiveSpace,
    setFormDataField,
  } = useSpaceSettingsStore();

  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState("");
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  useEffect(() => {
    if (storeSpace?.description) {
      setDescriptionText(storeSpace.description);
      setDescriptionLength(storeSpace.description.length);
    } else {
      // If space data is loaded but description is null/undefined, reset to empty
      if (storeSpace) { 
        setDescriptionText("");
        setDescriptionLength(0);
      }
    }
  }, [storeSpace]); // Depend on the whole storeSpace to reset if space changes

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setDescriptionText(text);
    setDescriptionLength(text.length);
  }, []);

  const saveDescription = useCallback(async () => {
    if (!storeSpace?.id || !user) {
      toast({ title: "Error", description: "Cannot save description. Space or user not identified.", variant: "destructive" });
      return;
    }

    setIsSavingDescription(true);
    try {
      const { error } = await getSupabaseClient()
        .from('spaces')
        .update({ description: descriptionText })
        .eq('id', storeSpace.id);

      if (error) throw error;

      // Update formData in the store for immediate reflection in other components (e.g., settings modal)
      setFormDataField('description', descriptionText);
      
      // Reload the active space from the store to ensure all data is fresh and consistent
      // This will also update storeSpace.description which the useEffect above listens to.
      await loadActiveSpace({ spaceId: storeSpace.id }, user.id, true);

      setEditingDescription(false);
      toast({
        title: "Description saved",
        description: "Your space description has been updated.",
      });
    } catch (error) {
      log.error('Hook', "Error saving description:", error);
      toast({
        title: "Error",
        description: "Failed to save description. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingDescription(false);
    }
  }, [storeSpace, user, descriptionText, setFormDataField, loadActiveSpace]);

  const cancelDescription = useCallback(() => {
    // Reset to the description from the store
    setDescriptionText(storeSpace?.description || "");
    setDescriptionLength((storeSpace?.description || "").length);
    setEditingDescription(false);
  }, [storeSpace]);

  return {
    editingDescription,
    setEditingDescription,
    descriptionText,
    descriptionLength,
    handleDescriptionChange,
    saveDescription,
    cancelDescription,
    isSavingDescription,
  };
} 