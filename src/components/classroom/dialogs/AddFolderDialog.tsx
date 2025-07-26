import { log } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

interface AddFolderDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreateFolder: (name: string, isPublished: boolean) => Promise<void>;
  isCreating: boolean;
  primaryColor: string;
}

export default function AddFolderDialog({ 
  isOpen, 
  onOpenChange, 
  onCreateFolder, 
  isCreating, 
  primaryColor 
}: AddFolderDialogProps) {
  const [folderName, setFolderName] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setFolderName("");
      setIsPublished(true);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!folderName.trim()) {
      log.error('Component', "Folder name is required");
      return;
    }
    
    try {
      await onCreateFolder(folderName.trim(), isPublished);
      onOpenChange(false);
    } catch (error) {
      log.error('Component', "Failed to create folder:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCreating) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-lg"
        onOpenAutoFocus={(e) => {
          // Prevent default focus behavior
          e.preventDefault();
          // Find and focus the name input
          const nameInput = document.getElementById('folder-name');
          if (nameInput) nameInput.focus();
        }}
      >
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold text-gray-900">Add folder</DialogTitle>
          <DialogDescription className="sr-only">
            Create a new folder to organize your course content
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <Label htmlFor="folder-name" className="text-sm font-medium text-gray-700">
              Name
            </Label>
            <Input 
              id="folder-name" 
              value={folderName} 
              onChange={(e) => setFolderName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., course 2"
              className="text-base py-3 px-4 border-gray-300 focus:border-primary focus:ring-primary rounded-lg shadow-sm"
              maxLength={50}
              aria-label="Folder name"
              aria-required="true"
            />
            <div className="text-xs text-gray-500 text-right pr-1" aria-live="polite">
              {folderName.length} / 50
            </div>
          </div>
        </div>

        <div className="flex items-center pt-4">
          <div className="flex items-center gap-2">
            <span id="published-label" className="text-sm font-medium text-gray-700">Published</span>
            <Switch
              id="published-toggle"
              checked={isPublished}
              onCheckedChange={setIsPublished}
              className="data-[state=checked]:bg-primary"
              aria-labelledby="published-label"
            />
          </div>
          
          <div className="flex-1" />
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
              className="px-6 py-2"
            >
              CANCEL
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isCreating || !folderName.trim()}
              className="px-6 py-2 font-medium"
              style={{ backgroundColor: primaryColor, color: 'white' }}
              aria-busy={isCreating}
            >
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {isCreating ? "ADDING..." : "ADD"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 