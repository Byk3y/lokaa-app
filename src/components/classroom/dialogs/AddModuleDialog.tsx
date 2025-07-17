import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface AddModuleDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreateModule: (title: string, description: string, releaseDelay: number | null) => Promise<void>;
  isCreating: boolean;
  primaryColor: string;
}

export default function AddModuleDialog({ 
  isOpen, 
  onOpenChange, 
  onCreateModule, 
  isCreating, 
  primaryColor 
}: AddModuleDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [releaseDelayDays, setReleaseDelayDays] = useState<number | null>(0);

  useEffect(() => {
    if (isOpen) {
      // Reset form when dialog opens
      setTitle("");
      setDescription("");
      setReleaseDelayDays(0);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    await onCreateModule(title, description, releaseDelayDays);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Module</DialogTitle>
          <DialogDescription>
            Organize your course content by adding a new module.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="module-title-add">Module Title</Label>
            <Input 
              id="module-title-add" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="e.g., Introduction to Topic X"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="module-description-add">Module Description (Optional)</Label>
            <Textarea 
              id="module-description-add" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Briefly describe what this module covers..."
              rows={3}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="module-release-delay-add">Release Delay (Days After Enrollment)</Label>
            <Input 
              id="module-release-delay-add"
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating} style={{ backgroundColor: primaryColor, color: 'white'}}>
            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isCreating ? "Adding..." : "Add Module"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 