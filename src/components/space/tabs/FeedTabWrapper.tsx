import React from 'react';
import { useParams } from 'react-router-dom';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { useTrustToken } from '@/hooks/useTrustToken';
import { useCacheAccess } from '@/hooks/useCacheAccess';
import FeedTab from '@/components/space/FeedTab';

/**
 * FeedTabWrapper - Provides required props to FeedTab component
 */
export default function FeedTabWrapper() {
  const { user } = useOptimizedAuth();
  const { subdomain } = useParams<{ subdomain: string }>();
  const { permissions } = useSpaceSettingsStore();
  const { token: trustToken } = useTrustToken(subdomain, user?.id);
  const { hasInstantAccess } = useCacheAccess(user, subdomain || '', false);

  if (!user || !subdomain) {
    return null;
  }

  return (
    <FeedTab
      user={user}
      isOwner={permissions?.isOwner ?? false}
      isAdmin={permissions?.isAdmin ?? false}
      hasInstantAccess={!!(trustToken || hasInstantAccess)}
    />
  );
}
