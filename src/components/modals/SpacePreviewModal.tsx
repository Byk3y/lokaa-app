import { Dialog, DialogContent } from "@/components/ui/dialog";
import SpaceCardPreview from "@/components/spaces/SpaceCardPreview";
import { useSpaceData } from "@/hooks/useSpaceData";
import { Loader2 } from "lucide-react";

interface SpacePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string | null;
  onJoin: (spaceId: string) => void;
}

export function SpacePreviewModal({ 
  open, 
  onOpenChange, 
  spaceId, 
  onJoin 
}: SpacePreviewModalProps) {
  const { spaceData, loading, error } = useSpaceData(spaceId);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden max-h-[80vh] w-[90vw] rounded-xl">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500">
            <p>Failed to load space information</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : spaceData ? (
          <SpaceCardPreview 
            space={spaceData} 
            onJoin={() => {
              onOpenChange(false);
              onJoin(spaceData.id);
            }} 
          />
        ) : (
          <div className="p-6 text-center text-gray-500">
            <p>Space not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 