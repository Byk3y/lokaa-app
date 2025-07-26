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

interface RevertToDraftDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmRevert: () => Promise<void>;
  isReverting: boolean;
  pageTitle: string;
  isPublished?: boolean;
}

export default function RevertToDraftDialog({
  isOpen,
  onOpenChange,
  onConfirmRevert,
  isReverting,
  pageTitle,
  isPublished = true,
}: RevertToDraftDialogProps) {
  const actionText = isPublished ? 'Revert to draft' : 'Publish';
  const description = isPublished
    ? `Are you sure you want to revert "${pageTitle}" to draft? This will make the page private and only visible to you.`
    : `Are you sure you want to publish "${pageTitle}"? This will make the page visible to all members.`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {isPublished ? 'Revert to Draft' : 'Publish Page'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isReverting}
            className="px-4 py-2"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirmRevert}
            disabled={isReverting}
            className={`px-4 py-2 ${isPublished 
              ? 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500'
              : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
            }`}
          >
            {isReverting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isPublished ? 'Reverting...' : 'Publishing...'}
              </>
            ) : (
              actionText
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 