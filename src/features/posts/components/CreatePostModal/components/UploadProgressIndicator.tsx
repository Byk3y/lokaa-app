import React from 'react';

interface UploadProgressIndicatorProps {
  fileId: string;
}

/**
 * Component to show upload progress for files being uploaded
 */
export const UploadProgressIndicator: React.FC<UploadProgressIndicatorProps> = ({
  fileId
}) => {
  return (
    <div className="relative w-[210px] min-w-[210px] h-[210px] rounded-lg border bg-gray-50 dark:bg-gray-700 shadow-sm group overflow-hidden flex-shrink-0">
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="w-12 h-12 text-teal-500 mb-2 animate-spin">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </div>
        <p className="text-xs font-medium text-teal-600 dark:text-teal-400">Uploading...</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Please wait</p>
      </div>
    </div>
  );
}; 