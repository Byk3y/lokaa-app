import React, { createContext, useState, useContext, useCallback } from 'react';

interface SpaceMembershipContextType {
  refreshSpacesTrigger: number;
  triggerSpacesRefresh: () => void;
}

const SpaceMembershipContext = createContext<SpaceMembershipContextType | undefined>(undefined);

export const SpaceMembershipProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [refreshSpacesTrigger, setRefreshSpacesTrigger] = useState(0);

  const triggerSpacesRefresh = useCallback(() => {
    setRefreshSpacesTrigger(prev => prev + 1);
  }, []);

  return (
    <SpaceMembershipContext.Provider value={{ refreshSpacesTrigger, triggerSpacesRefresh }}>
      {children}
    </SpaceMembershipContext.Provider>
  );
};

export const useSpaceMembership = (): SpaceMembershipContextType => {
  const context = useContext(SpaceMembershipContext);
  if (context === undefined) {
    throw new Error('useSpaceMembership must be used within a SpaceMembershipProvider');
  }
  return context;
}; 