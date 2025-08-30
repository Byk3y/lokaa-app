import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { log } from '@/utils/logger';

interface PhotoSelectionModalProps {
  onPhotoSelected: (file: File) => void;
}

export interface PhotoSelectionModalRef {
  openPhotoLibrary: () => void;
  openCamera: () => void;
  openPhotoOptions: () => void;
}

const PhotoSelectionModal = forwardRef<PhotoSelectionModalRef, PhotoSelectionModalProps>(
  ({ onPhotoSelected }, ref) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          log.error('Component', 'Invalid file type selected');
          return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          log.error('Component', 'File too large (max 5MB)');
          return;
        }

        onPhotoSelected(file);
      }
      
      // Reset the input
      event.target.value = '';
    };

    const handleCameraChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        onPhotoSelected(file);
      }
      
      // Reset the input
      event.target.value = '';
    };

    const openPhotoLibrary = () => {
      if (fileInputRef.current) {
        fileInputRef.current.accept = 'image/*';
        fileInputRef.current.capture = undefined; // Remove capture to allow photo library
        fileInputRef.current.click();
      }
    };

    const openCamera = () => {
      if (cameraInputRef.current) {
        cameraInputRef.current.accept = 'image/*';
        cameraInputRef.current.capture = 'environment'; // Force camera
        cameraInputRef.current.click();
      }
    };

    const openPhotoOptions = () => {
      if (fileInputRef.current) {
        fileInputRef.current.accept = 'image/*';
        fileInputRef.current.removeAttribute('capture'); // Remove capture to allow both camera and photo library
        fileInputRef.current.click();
      }
    };

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      openPhotoLibrary,
      openCamera,
      openPhotoOptions
    }));

    // Hidden file inputs for native device APIs
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraChange}
          className="hidden"
        />
      </>
    );
  }
);

PhotoSelectionModal.displayName = 'PhotoSelectionModal';

export default PhotoSelectionModal;
