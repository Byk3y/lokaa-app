import React from 'react';

interface UploadProgressIndicatorProps {
  fileId: string;
  progress: number;
}

/**
 * Component to show upload progress for files being uploaded
 */
export const UploadProgressIndicator: React.FC<UploadProgressIndicatorProps> = ({
  fileId,
  progress
}) => {
  return (
    <div className="relative w-[210px] min-w-[210px] h-[210px] rounded-lg border bg-gray-50 dark:bg-gray-800 shadow-sm group overflow-hidden flex-shrink-0 p-3 flex flex-col justify-center items-center">
      <div className="w-full">
        <p className="text-xs font-medium text-teal-600 dark:text-teal-400 text-center truncate px-2">Uploading...</p>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 my-2">
          <div
            className="bg-teal-500 h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{progress}%</p>
      </div>
    </div>
  );
}; 