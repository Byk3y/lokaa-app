import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface DeleteCourseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  courseName: string;
  isDeleting: boolean;
}

export function DeleteCourseDialog({
  isOpen,
  onClose,
  onConfirm,
  courseName,
  isDeleting
}: DeleteCourseDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Course
          </DialogTitle>
          <DialogDescription className="text-base">
            Are you sure you want to delete <span className="font-semibold">{courseName}</span>?
          </DialogDescription>
        </DialogHeader>
        <div className="py-3">
          <p className="text-sm text-gray-700">
            This action cannot be undone. All course content, including:
          </p>
          <ul className="mt-2 text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>Course pages and lessons</li>
            <li>Student progress data</li>
            <li>Course folders and modules</li>
            <li>Associated files and media</li>
          </ul>
        </div>
        <DialogFooter>
          <div className="flex gap-2 justify-end w-full">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Course'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 