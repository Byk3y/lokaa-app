import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { CourseModuleWithLessons } from "../ClassroomTab"; // Adjust if necessary

interface DeleteModuleConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  moduleToDelete: CourseModuleWithLessons | null;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
}

export default function DeleteModuleConfirmDialog({
  isOpen,
  onOpenChange,
  moduleToDelete,
  onConfirmDelete,
  isDeleting
}: DeleteModuleConfirmDialogProps) {

  const handleCancel = () => {
    onOpenChange(false);
    // It's good practice for the parent to handle setting moduleToDelete to null 
    // when onOpenChange(false) is called, but we ensure dialog doesn't try to operate on it if parent forgets.
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogDescription>
            {moduleToDelete ? (
              <>
                Are you sure you want to delete the module "<strong>{moduleToDelete.title}</strong>"?
                This will also delete all lessons within this module. This action cannot be undone.
              </>
            ) : (
              "Module to delete not specified. This dialog should not be visible."
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirmDelete} 
            disabled={isDeleting || !moduleToDelete} // Also disable if moduleToDelete is somehow null
          >
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isDeleting ? "Deleting..." : "Delete Module"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 