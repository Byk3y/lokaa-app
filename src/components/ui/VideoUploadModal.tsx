import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Link } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoInsert: (videoData: { url: string; type: 'embed' | 'upload'; file?: File }) => void;
  spaceId?: string;
  lessonId?: string;
}

const VideoUploadModal: React.FC<VideoUploadModalProps> = ({
  isOpen,
  onClose,
  onVideoInsert,
  spaceId,
  lessonId
}) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setVideoUrl('');
      setUploading(false);
      setDragActive(false);
    }
  }, [isOpen]);

  // Validate video URL for supported platforms
  const isValidVideoUrl = (url: string) => {
    if (!url) return false;
    
    const patterns = [
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
      /(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?))/,
      /(?:loom\.com\/share\/)([\w-]+)/,
      /(?:wistia\.(?:com|net)\/.*\/([a-zA-Z0-9]+))/
    ];
    
    return patterns.some(pattern => pattern.test(url));
  };

  // Handle URL submission
  const handleUrlSubmit = () => {
    if (!videoUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a video URL",
        variant: "destructive"
      });
      return;
    }

    if (!isValidVideoUrl(videoUrl.trim())) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube, Vimeo, Loom, or Wistia URL",
        variant: "destructive"
      });
      return;
    }

    onVideoInsert({
      url: videoUrl.trim(),
      type: 'embed'
    });
    
    onClose();
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (!file) return;

    // Check if upload is available
    if (!spaceId) {
      toast({
        title: "Upload not available",
        description: "Video upload requires space context",
        variant: "destructive"
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please select a video file (MP4, MOV, AVI, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a video smaller than 100MB",
        variant: "destructive"
      });
      return;
    }

    onVideoInsert({
      url: URL.createObjectURL(file), // Temporary URL for preview
      type: 'upload',
      file
    });
    
    onClose();
  };

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Handle click on file area
  const handleFileAreaClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Add a video
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* URL Input */}
          <div className="space-y-3">
            <div className="relative">
              <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="url"
                placeholder="YouTube, Loom, Vimeo, or Wistia link"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="pl-10 h-12 text-base"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUrlSubmit();
                  }
                }}
              />
            </div>
          </div>

          {/* File Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              !spaceId 
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
                : dragActive 
                  ? 'border-blue-400 bg-blue-50 cursor-pointer' 
                  : 'border-gray-300 hover:border-gray-400 cursor-pointer'
            }`}
            onDragEnter={spaceId ? handleDrag : undefined}
            onDragLeave={spaceId ? handleDrag : undefined}
            onDragOver={spaceId ? handleDrag : undefined}
            onDrop={spaceId ? handleDrop : undefined}
            onClick={spaceId ? handleFileAreaClick : undefined}
          >
            <Upload className={`mx-auto h-8 w-8 mb-3 ${!spaceId ? 'text-gray-300' : 'text-gray-400'}`} />
            <p className={`mb-1 ${!spaceId ? 'text-gray-400' : 'text-gray-600'}`}>
              {!spaceId ? 'Upload not available' : 'Drag and drop video here'}
            </p>
            <p className={`text-sm ${!spaceId ? 'text-gray-400' : 'text-gray-500'}`}>
              {!spaceId ? 'Requires space context' : (
                <span className="underline cursor-pointer">or select file</span>
              )}
            </p>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={uploading}
          >
            CANCEL
          </Button>
          <Button
            onClick={handleUrlSubmit}
            disabled={!videoUrl.trim() || uploading}
            className="bg-black text-white hover:bg-gray-800"
          >
            ADD
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoUploadModal; 