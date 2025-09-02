import React from 'react';
import { useParams } from 'react-router-dom';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import CalendarTab from '@/components/space/CalendarTab';

/**
 * CalendarTabWrapper - Provides required props to CalendarTab component
 */
export default function CalendarTabWrapper() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const { space } = useSpaceSettingsStore();

  if (!subdomain || !space) {
    return null;
  }

  return (
    <CalendarTab
      space={{
        id: space.id,
        name: space.name,
        owner_id: space.owner_id,
      }}
    />
  );
}
