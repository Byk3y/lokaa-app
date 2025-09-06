import React from 'react';
import { useParams } from 'react-router-dom';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { ClassroomTabRefactored as ClassroomTab } from '@/components/classroom/ClassroomTabRefactored';

/**
 * ClassroomTabWrapper - Provides required props to ClassroomTab component
 */
export default function ClassroomTabWrapper() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const { space } = useSpaceSettingsStore();

  if (!subdomain || !space) {
    return null;
  }

  return (
    <ClassroomTab
      space={{
        id: space.id,
        name: space.name,
        owner_id: space.owner_id,
      }}
    />
  );
}
