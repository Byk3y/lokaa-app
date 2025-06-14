import React from 'react';
import { Play } from 'lucide-react';

interface SpaceIntroDisplayProps {
  name: string;
  introMediaType?: 'image' | 'video' | 'none' | null;
  introMediaUrl?: string | null;
  coverPhotoUrl?: string | null;
  spaceIconUrl?: string | null;
  className?: string;
}

const SpaceIntroDisplay: React.FC<SpaceIntroDisplayProps> = ({
  name,
  introMediaType,
  introMediaUrl,
  coverPhotoUrl,
  spaceIconUrl,
  className = '',
}) => {
  // Only show intro media if it exists and has a type
  const hasIntroMedia = introMediaType && introMediaType !== 'none' && introMediaUrl;
  
  return (
    <div className={`rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 ${className}`}>
      {/* Case 1: Intro Media - Video */}
      {introMediaType === 'video' && introMediaUrl && (
        <div className="aspect-video w-full">
          <iframe 
            src={introMediaUrl} 
            className="w-full h-full"
            title={`${name} intro video`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
          ></iframe>
        </div>
      )}
      
      {/* Case 2: Intro Media - Image */}
      {introMediaType === 'image' && introMediaUrl && (
        <div className="relative aspect-video w-full">
          <img 
            src={introMediaUrl} 
            alt={`${name} intro image`}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Case 3: No intro media - show placeholder */}
      {!hasIntroMedia && (
        <div className="aspect-video w-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
          {spaceIconUrl ? (
            <div className="text-center">
              <img 
                src={spaceIconUrl} 
                alt={`${name} icon`} 
                className="h-24 w-24 mx-auto object-contain opacity-70" 
              />
              <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm">
                Welcome to {name ? name.charAt(0).toUpperCase() + name.slice(1) : ""}
              </p>
            </div>
          ) : (
            <div className="text-center p-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l-1.586-1.586a2 2 0 00-2.828 0L6 16m6-6l2-2m0 0l2 2m-2-2v6" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Welcome to {name ? name.charAt(0).toUpperCase() + name.slice(1) : ""}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                A space to build and learn together and grow
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SpaceIntroDisplay; 