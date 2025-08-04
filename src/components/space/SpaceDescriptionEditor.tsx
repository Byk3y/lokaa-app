import React, { useState, useEffect, memo } from "react";
import { Settings, Edit, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
import { log } from '@/utils/logger';
import type { Database } from "@/types/database.types";

interface SpaceDescriptionEditorProps {
  /** Space data containing the description */
  spaceData: {
    id: string;
    subdomain: string;
    about_description?: string | null;
  };
  /** Whether user can edit space description */
  canEditSpace: boolean;
}

export const SpaceDescriptionEditor = memo(function SpaceDescriptionEditor({
  spaceData,
  canEditSpace
}: SpaceDescriptionEditorProps) {
  const { user } = useOptimizedAuth();
  const { loadActiveSpace } = useSpaceSettingsStore();
  
  // About description state
  const [aboutDescription, setAboutDescription] = useState(spaceData?.about_description || "");
  const [aboutCharCount, setAboutCharCount] = useState((spaceData?.about_description || "").length);
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutChanged, setAboutChanged] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);

  // Update aboutDescription when spaceData.about_description changes
  useEffect(() => {
    setAboutDescription(spaceData?.about_description || "");
    setAboutCharCount((spaceData?.about_description || "").length);
    setAboutChanged(false); // Reset changed status when underlying data changes
  }, [spaceData?.about_description]);

  // Handle about description changes
  const handleAboutChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setAboutDescription(val);
    setAboutCharCount(val.length);
    setAboutChanged(val !== (spaceData?.about_description || ""));
  };

  // Save about description
  const handleSaveAbout = async () => {
    if (!aboutChanged || !aboutDescription.trim() || !spaceData?.id || !user) return;
    
    setSavingAbout(true);
    try {
      // Create an update object with proper type assertion
      const updateData: Partial<Database['public']['Tables']['spaces']['Row']> = { 
        about_description: aboutDescription.trim() 
      };
      
      const { error } = await getSupabaseClient()
        .from('spaces')
        .update(updateData)
        .eq('id', spaceData.id);
      
      if (error) throw error;
      
      toast({
        title: "Changes saved",
        description: "Your space description has been updated",
      });
      
      setEditingAbout(false);
      setAboutChanged(false);
      
      // Refresh data using loadActiveSpace from the store
      if (spaceData?.subdomain && user?.id) {
        loadActiveSpace({ subdomain: spaceData.subdomain }, user.id, true);
      }
      
    } catch (err) {
      log.error('Component', 'Error saving about description:', err);
      toast({
        title: "Save failed",
        description: "Failed to update description. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingAbout(false);
    }
  };

  // Cancel about editing
  const handleCancelAbout = () => {
    setAboutDescription(spaceData?.about_description || "");
    setAboutCharCount((spaceData?.about_description || "").length);
    setEditingAbout(false);
    setAboutChanged(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">About This Space</h2>
        {canEditSpace && !editingAbout && (
          <Button variant="outline" size="sm" onClick={() => setEditingAbout(true)}>
            <Edit className="w-4 h-4 mr-2" /> Edit About
          </Button>
        )}
      </div>

      {/* About Description Editor/Display */}
      {editingAbout && canEditSpace ? (
        <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800">
          <textarea
            value={aboutDescription}
            onChange={handleAboutChange}
            placeholder="Tell everyone about your space..."
            className="w-full p-3 min-h-[150px] focus:ring-0 border-0 focus:outline-none resize-none bg-transparent dark:text-gray-200"
            maxLength={2000} // Example max length
          />
          <div className="flex justify-between items-center p-3 border-t dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">{aboutCharCount}/2000</span>
            <div className="space-x-2">
              <Button variant="ghost" size="sm" onClick={handleCancelAbout} disabled={savingAbout}>
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSaveAbout} 
                disabled={!aboutChanged || savingAbout || !aboutDescription.trim()}
              >
                {savingAbout ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} 
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-200 whitespace-pre-line">
          {spaceData.about_description ? (
            <p>{spaceData.about_description}</p>
          ) : (
            <div className="text-center py-8">
              {canEditSpace ? (
                // Admin/Owner empty state
                <div className="max-w-md mx-auto">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-6 w-6 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Tell your story
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    Help members understand what your space is about and what they can expect to find here.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setEditingAbout(true)}
                    className="inline-flex items-center"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Add description
                  </Button>
                </div>
              ) : (
                // Member view - simpler message
                <p className="italic text-gray-500 dark:text-gray-400">
                  The space creator hasn't added a detailed description yet.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default SpaceDescriptionEditor;