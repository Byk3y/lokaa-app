import React from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

export default function DiscoverSimple() {
  const { user } = useOptimizedAuth();
  
  console.log('DiscoverSimple rendering for user:', user?.id);
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          Discover Spaces - DEBUG VERSION
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <div className="space-y-2">
            <p><strong>User ID:</strong> {user?.id || 'Not logged in'}</p>
            <p><strong>User Email:</strong> {user?.email || 'No email'}</p>
            <p><strong>Current Time:</strong> {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Simple Spaces List</h2>
          <p className="text-gray-600">This is a minimal version to test if the page renders correctly.</p>
          
          <div className="mt-4 space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">Sample Space 1</h3>
              <p className="text-gray-600">This is a test space for debugging</p>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">Sample Space 2</h3>
              <p className="text-gray-600">Another test space for debugging</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 