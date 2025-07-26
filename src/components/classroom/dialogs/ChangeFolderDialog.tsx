import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from '@/integrations/supabase/client';

interface Folder {
  id: string;
  title: string;
  module_order: number;
}

interface ChangeFolderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmChange: (folderId: string | null) => Promise<void>;
  isChanging: boolean;
  pageTitle: string;
  courseId: string;
  currentFolderId: string | null;
}

export default function ChangeFolderDialog({
  isOpen,
  onOpenChange,
  onConfirmChange,
  isChanging,
  pageTitle,
  courseId,
  currentFolderId,
}: ChangeFolderDialogProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFolders = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('course_modules')
          .select('id, title, module_order')
          .eq('course_id', courseId)
          .eq('module_type', 'folder')
          .order('module_order');

        if (error) throw error;
        setFolders(data || []);
      } catch (err) {
        console.error('Error fetching folders:', err);
        setError('Failed to load folders. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchFolders();
      setSelectedFolderId(currentFolderId);
    }
  }, [isOpen, courseId, currentFolderId]);

  const handleConfirm = async () => {
    await onConfirmChange(selectedFolderId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">Change Folder</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 mt-2">
            Choose a folder for "{pageTitle}". Select "No folder" to remove it from its current folder.
          </DialogDescription>
        </DialogHeader>
        
        {error ? (
          <div className="text-red-500 text-sm mt-2">{error}</div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="mt-4">
            <RadioGroup
              value={selectedFolderId || ''}
              onValueChange={(value) => setSelectedFolderId(value === 'null' ? null : value)}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="null" id="no-folder" />
                <Label htmlFor="no-folder" className="font-medium">No folder</Label>
              </div>
              {folders.map((folder) => (
                <div key={folder.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={folder.id} id={folder.id} />
                  <Label htmlFor={folder.id} className="font-medium">{folder.title}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isChanging}
            className="px-4 py-2"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isChanging || isLoading || !!error}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
          >
            {isChanging ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Changing...
              </>
            ) : (
              'Change Folder'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 