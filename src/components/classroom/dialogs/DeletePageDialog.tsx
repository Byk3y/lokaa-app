import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface DeletePageDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
  pageTitle: string;
}

export default function DeletePageDialog({
  isOpen,
  onOpenChange,
  onConfirmDelete,
  isDeleting,
  pageTitle,
}: DeletePageDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">Delete page</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 mt-2">
            Are you sure you want to delete "{pageTitle}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="px-4 py-2"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirmDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 