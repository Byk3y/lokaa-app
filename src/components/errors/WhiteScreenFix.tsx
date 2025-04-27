import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import authDebug from '@/utils/authDebug';

// Initialize the authDebug utility with supabase client
authDebug.init(supabase);

interface WhiteScreenFixProps {
  message?: string;
}

const WhiteScreenFix: React.FC<WhiteScreenFixProps> = ({ 
  message = "It looks like you've encountered a white screen issue." 
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, any>>({});

  // Check session
  const checkSession = async () => {
    setLoading(prev => ({ ...prev, session: true }));
    try {
      const result = await authDebug.checkSession();
      setResults(prev => ({ ...prev, session: result }));
    } catch (error) {
      setResults(prev => ({ ...prev, session: { error } }));
    } finally {
      setLoading(prev => ({ ...prev, session: false }));
    }
  };

  // Clear auth storage
  const clearAuthStorage = async () => {
    setLoading(prev => ({ ...prev, storage: true }));
    try {
      const result = await authDebug.clearAuthStorage();
      setResults(prev => ({ ...prev, storage: result }));
    } catch (error) {
      setResults(prev => ({ ...prev, storage: { error } }));
    }
    // Don't set loading to false - page will reload
  };

  // Emergency sign out
  const emergencySignOut = async () => {
    setLoading(prev => ({ ...prev, signOut: true }));
    try {
      await authDebug.emergencySignOut();
      // No need to update results - page will reload
    } catch (error) {
      setLoading(prev => ({ ...prev, signOut: false }));
      setResults(prev => ({ ...prev, signOut: { error } }));
    }
  };

  // Create a result box component
  const ResultBox = ({ title, data }: { title: string, data: any }) => {
    if (!data) return null;
    
    const statusColor = data.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
    const textColor = data.success ? 'text-green-800' : 'text-red-800';
    
    return (
      <div className={`mt-2 p-3 rounded border ${statusColor}`}>
        <h4 className={`font-medium ${textColor}`}>{title}</h4>
        <pre className="mt-2 text-xs overflow-auto max-h-32 p-2 bg-gray-800 text-gray-200 rounded">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recovery Tools</h2>
          <button 
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>
        
        <p className="text-gray-600 mb-4">{message}</p>
        
        <div className="space-y-4">
          {/* Check Auth Session */}
          <div>
            <button
              onClick={checkSession}
              disabled={loading.session}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading.session ? 'Checking...' : 'Check Authentication'}
            </button>
            {results.session && <ResultBox title="Authentication Status" data={results.session} />}
          </div>
          
          {/* Clear Auth Storage */}
          <div>
            <button
              onClick={clearAuthStorage}
              disabled={loading.storage}
              className="w-full py-2 px-4 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              {loading.storage ? 'Clearing...' : 'Clear Auth Storage (Safe)'}
            </button>
            <p className="text-xs text-gray-500 mt-1">
              This will clear authentication data and refresh the page.
            </p>
            {results.storage && <ResultBox title="Storage Clear Result" data={results.storage} />}
          </div>
          
          {/* Emergency Sign Out */}
          <div>
            <button
              onClick={emergencySignOut}
              disabled={loading.signOut}
              className="w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {loading.signOut ? 'Signing Out...' : 'Emergency Sign Out'}
            </button>
            <p className="text-xs text-gray-500 mt-1">
              This will sign you out, clear all storage, and redirect to the home page.
            </p>
            {results.signOut && <ResultBox title="Sign Out Result" data={results.signOut} />}
          </div>
          
          {/* Navigate to Discover page */}
          <div className="pt-2 border-t border-gray-200">
            <button
              onClick={() => navigate('/discover')}
              className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Go to Discover Page
            </button>
          </div>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            If you continue to experience issues, please contact support at{' '}
            <a href="mailto:help@lokaa.com" className="text-blue-600 hover:underline">
              help@lokaa.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default WhiteScreenFix; 