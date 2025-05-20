import React from 'react';
import { useSpace, SpaceData } from '@/contexts/SpaceContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * SpaceComponentAdapter wraps existing components that expect space prop data
 * allowing them to be used with the new SpaceContext
 */
interface SpaceComponentAdapterProps {
  component: React.ComponentType<Record<string, unknown>>;
  componentProps?: Record<string, unknown>;
  includeUser?: boolean;
}

export function SpaceComponentAdapter({
  component: Component,
  componentProps = {},
  includeUser = false
}: SpaceComponentAdapterProps) {
  const { spaceData, loading, error } = useSpace();
  const { user } = useAuth();
  
  if (loading) {
    return <div className="p-4 text-center">Loading space data...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-center text-red-500">Error: {error.message}</div>;
  }
  
  if (!spaceData) {
    return <div className="p-4 text-center">No space data available</div>;
  }
  
  // Assemble the component props with space data from context
  const props = {
    ...componentProps,
    space: spaceData,
    ...(includeUser ? { user } : {})
  };
  
  return <Component {...props} />;
} 