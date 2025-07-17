import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { CourseModuleWithLessons } from '@/types/classroom';

interface EditModuleDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  moduleToEdit: CourseModuleWithLessons | null;
  onUpdateModule: (moduleId: string, title: string, description: string, releaseDelay: number | null) => Promise<void>;
  isUpdating: boolean;
  primaryColor: string;
}

export default function EditModuleDialog({
  isOpen,
  onOpenChange,
  moduleToEdit,
  onUpdateModule,
  isUpdating,
  primaryColor
}: EditModuleDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [releaseDelayDays, setReleaseDelayDays] = useState<number | null>(0);

  useEffect(() => {
    if (isOpen && moduleToEdit) {
      setTitle(moduleToEdit.title);
      setDescription(moduleToEdit.description || "");
      setReleaseDelayDays(moduleToEdit.release_delay_days === undefined ? null : moduleToEdit.release_delay_days);
    } else if (!isOpen) {
      // Optionally reset fields when dialog is closed, though moduleToEdit changing also handles this
      setTitle("");
      setDescription("");
      setReleaseDelayDays(0);
    }
  }, [isOpen, moduleToEdit]);

  const handleSubmit = async () => {
    if (!moduleToEdit) return;
    await onUpdateModule(moduleToEdit.id, title, description, releaseDelayDays);
  };

  if (!moduleToEdit) return null; // Don't render if no module is selected

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Module</DialogTitle>
          {moduleToEdit && (
            <DialogDescription>
              Update the details for "{moduleToEdit.title}".
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-module-title-dialog">Module Title</Label>
            <Input 
              id="edit-module-title-dialog" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="e.g., Advanced Concepts"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-module-description-dialog">Module Description (Optional)</Label>
            <Textarea 
              id="edit-module-description-dialog" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Refine the module's description..."
              rows={3}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-module-release-delay-dialog">Release Delay (Days After Enrollment)</Label>
            <Input 
              id="edit-module-release-delay-dialog"
              type="number"
              value={releaseDelayDays === null ? '' : String(releaseDelayDays)}
              onChange={(e) => setReleaseDelayDays(e.target.value === '' ? null : parseInt(e.target.value, 10))}
              placeholder="e.g., 0 for immediate, 7 for 1 week"
              min="0"
            />
            <p className="text-xs text-gray-500 pl-1">Set to 0 or leave blank for immediate release.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isUpdating} style={{ backgroundColor: primaryColor, color: 'white'}}>
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isUpdating ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 