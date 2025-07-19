import { log } from '@/utils/logger';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import SpaceCardPreview from "@/components/spaces/SpaceCardPreview";
import { useSpaceAboutData, SpaceAboutData } from "@/hooks/useSpaceAboutData";
import { Loader2, X } from "lucide-react";
import { useEffect } from "react";

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
  const { spaceAboutData, loading, error } = useSpaceAboutData({ spaceId });
  
  // Debug logging to track modal data flow
  useEffect(() => {
    if (open) {
      log.debug('Component', `🔍 [SpacePreviewModal] Modal opened with:`, {
        spaceId,
        loading,
        error,
        spaceAboutData: spaceAboutData ? {
          id: spaceAboutData.id,
          name: spaceAboutData.name,
          subdomain: spaceAboutData.subdomain
        } : null
      });
    }
  }, [open, spaceId, loading, error, spaceAboutData]);
  
  return (
    <>
      {/* Custom close button above modal */}
      {open && (
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close preview"
          style={{
            position: 'fixed',
            top: 24,
            right: 32,
            zIndex: 10050,
            background: 'rgba(255,255,255,0.95)',
            border: 'none',
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          <X size={22} color="#222" />
        </button>
      )}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden max-h-[80vh] w-[90vw] rounded-xl" hideCloseButton={true}>
          <DialogHeader className="sr-only">
            <DialogTitle>{spaceAboutData?.name || 'Space Preview'}</DialogTitle>
            <DialogDescription>Preview space information and details</DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">
              <p>Failed to load space information</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : spaceAboutData ? (
            <SpaceCardPreview 
              space={spaceAboutData} 
              onJoin={() => {
                onOpenChange(false);
                if (spaceAboutData) {
                  onJoin(spaceAboutData.id);
                }
              }} 
            />
          ) : (
            <div className="p-6 text-center text-gray-500">
              <p>Space not found</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 