import React from 'react';
import { useParams } from 'react-router-dom';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import LeaderboardsTab from '@/components/space/LeaderboardsTab';

/**
 * LeaderboardTabWrapper - Provides required props to LeaderboardsTab component
 */
export default function LeaderboardTabWrapper() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const { space } = useSpaceSettingsStore();

  if (!subdomain || !space) {
    return null;
  }

  return (
    <LeaderboardsTab
      spaceId={space.id}
      spaceName={space.name}
    />
  );
}
