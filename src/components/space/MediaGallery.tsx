import { useState } from 'react';
import { Play, X } from 'lucide-react';
import { MediaItem } from "@/utils/mediaStorageUtils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface OwnerInfo {
  id: string;
  full_name: string | null;
  avatar_url?: string | null;
}

interface MediaGalleryProps {
  mediaItems: MediaItem[];
  className?: string;
  readOnly?: boolean;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onDelete?: (index: number) => void;
  activeIndex?: number;
  onActiveChange?: (index: number) => void;
  ownerData?: OwnerInfo | null;
  showOwner?: boolean;
}

export default function MediaGallery({ 
  mediaItems, 
  className = '', 
  readOnly = true,
  onReorder,
  onDelete,
  activeIndex: externalActiveIndex,
  onActiveChange,
  ownerData,
  showOwner = true
}: MediaGalleryProps) {
  // Use internal state if no external control is provided
  const [internalActiveIndex, setInternalActiveIndex] = useState<number>(
    mediaItems.length > 0 ? 0 : -1
  );
  
  // Determine if using controlled or uncontrolled active index
  const isControlled = externalActiveIndex !== undefined;
  const activeMediaIndex = isControlled ? externalActiveIndex : internalActiveIndex;
  
  // Handle thumbnail click
  const handleThumbnailClick = (index: number) => {
    if (isControlled && onActiveChange) {
      onActiveChange(index);
    } else {
      setInternalActiveIndex(index);
    }
  };
  
  // Handle drag start
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (readOnly) return;
    e.dataTransfer.setData('text/plain', index.toString());
    e.currentTarget.classList.add('opacity-50');
  };
  
  // Handle drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (readOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  // Handle drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    if (readOnly) return;
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (dragIndex === dropIndex) return;
    
    if (onReorder) {
      onReorder(dragIndex, dropIndex);
    }
  };
  
  // Handle drag end
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (readOnly) return;
    e.currentTarget.classList.remove('opacity-50');
  };
  
  // Handle delete
  const handleDelete = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(index);
    }
  };
  
  if (mediaItems.length === 0) {
    return null;
  }

  const activeMedia = activeMediaIndex >= 0 ? mediaItems[activeMediaIndex] : null;
  const ownerDisplayName = ownerData?.full_name || 'Space Owner';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main media display */}
      {activeMedia && (
        <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
          {activeMedia.type === 'video' ? (
            <div className="aspect-video w-full">
              <iframe 
                src={activeMedia.url} 
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                title="Media content"
              ></iframe>
            </div>
          ) : (
            <img 
              src={activeMedia.url} 
              alt="Media content"
              className="w-full h-auto max-h-[500px] object-contain"
            />
          )}
          
          {/* Combined thumbnails and owner info row */}
          <div className="flex items-center px-4 py-3 border-t">
            {/* Thumbnails */}
            {mediaItems.length > 1 && (
              <div className="flex overflow-x-auto space-x-2 flex-grow">
                {mediaItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    className={`relative flex-shrink-0 cursor-pointer border-2 rounded-md overflow-hidden ${
                      activeMediaIndex === index ? 'border-teal-500' : 'border-transparent'
                    }`}
                    onClick={() => handleThumbnailClick(index)}
                    draggable={!readOnly}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <img
                      src={item.type === 'video' ? item.thumbnail : item.url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-16 h-16 object-cover"
                    />
                    {item.type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                        <Play className="w-6 h-6 text-white" />
                      </div>
                    )}
                    {!readOnly && onDelete && (
                      <button
                        className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl-md"
                        onClick={(e) => handleDelete(e, index)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Owner info */}
            {ownerData && showOwner && (
              <div className="flex items-center gap-3 ml-auto">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={ownerData.avatar_url || undefined} alt={ownerDisplayName} />
                  <AvatarFallback>{(ownerDisplayName || 'O').substring(0, 1)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col justify-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Created by</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 text-base">{ownerDisplayName}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 