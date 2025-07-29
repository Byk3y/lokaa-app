import React from 'react';

interface MobileErrorStateProps {
  error?: string;
  onBack: () => void;
}

/**
 * Mobile Error State Component
 * 
 * Provides consistent error handling UI for mobile course views
 */
const MobileErrorState: React.FC<MobileErrorStateProps> = ({ error, onBack }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-screen p-4">
      <div className="text-center max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Course</h3>
        <p className="text-gray-600 mb-4">{error || 'Course not found'}</p>
        <button 
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          aria-label="Go back to courses"
        >
          ← Back to Courses
        </button>
      </div>
    </div>
  );
};

export default MobileErrorState;