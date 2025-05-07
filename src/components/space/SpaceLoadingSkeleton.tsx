import React from "react";

interface SpaceLoadingSkeletonProps {
  activeTab?: string;
}

/**
 * A loading skeleton for the Space component
 * Displays a realistic loading state that matches the Space layout
 */
export function SpaceLoadingSkeleton({ activeTab = "community" }: SpaceLoadingSkeletonProps) {
  return (
    <div className="min-h-screen bg-[#F5FAFA] flex flex-col animate-pulse">
      {/* Header skeleton */}
      <header className="bg-white border-b py-3 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-gray-200 rounded-lg mr-3" />
            <div className="h-5 w-32 bg-gray-200 rounded" />
          </div>
          
          <div className="flex-1 max-w-xl mx-8">
            <div className="h-10 w-full bg-gray-200 rounded-full" />
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="h-5 w-5 bg-gray-200 rounded-full" />
            <div className="h-5 w-5 bg-gray-200 rounded-full" />
            <div className="h-9 w-9 bg-gray-200 rounded-full" />
          </div>
        </div>
      </header>

      {/* Tab navigation skeleton */}
      <nav className="bg-white border-b sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex overflow-x-auto py-2">
            {['community', 'classroom', 'calendar', 'members', 'leaderboard', 'about'].map((tab) => (
              <div 
                key={tab}
                className={`h-10 mx-2 px-4 ${tab === activeTab ? 'bg-gray-300' : 'bg-gray-200'} rounded-md flex-shrink-0`}
                style={{ width: tab === 'community' ? '80px' : '100px' }}
              />
            ))}
          </div>
        </div>
      </nav>

      {/* Main content area */}
      <main className="flex-grow py-6">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="md:col-span-2 space-y-4">
              <div className="h-16 w-full bg-gray-200 rounded-xl" />
              
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="h-10 w-10 bg-gray-200 rounded-full" />
                  <div className="ml-3">
                    <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-24 bg-gray-200 rounded" />
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-11/12 bg-gray-200 rounded" />
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                </div>
                <div className="h-40 bg-gray-200 rounded-lg mb-4" />
                <div className="flex justify-between">
                  <div className="h-8 w-20 bg-gray-200 rounded" />
                  <div className="h-8 w-20 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="space-y-3">
              <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                <div className="h-36 bg-gray-200" />
                <div className="p-4">
                  <div className="h-6 w-full bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 border border-gray-200 rounded-lg overflow-hidden bg-white">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="text-center p-3">
                    <div className="h-6 w-8 bg-gray-200 rounded mx-auto mb-1" />
                    <div className="h-3 w-12 bg-gray-200 rounded mx-auto" />
                  </div>
                ))}
              </div>
              
              <div className="h-10 w-full bg-gray-200 rounded-lg" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Export both as named and default export for flexibility
export default SpaceLoadingSkeleton; 