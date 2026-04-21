import { log } from '@/utils/logger';
import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Profile from '@/views/Profile';
import { shouldAllowProfileRedirect } from '@/shared/services/debug/profile-redirect';

// Profile entry handler. Only used by the `/@:slug` legacy route; the
// canonical `/profile/:slug` route renders <Profile /> directly. This
// component exists to translate `/@francis` → `/profile/francis` once,
// with a redirect-loop guard.
export default function ProfileRouteHandler() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!slug) {
      navigate('/discover', { replace: true });
      return;
    }

    // Only redirect when we actually arrived via the `/@slug` path;
    // the canonical `/profile/slug` case should just render <Profile />.
    if (location.pathname.startsWith('/@')) {
      const username = location.pathname.substring(2);
      if (shouldAllowProfileRedirect(username)) {
        navigate(`/profile/${username}`, { replace: true });
      } else {
        log.warn('Component', `[ProfileRouteHandler] prevented redirect loop to /profile/${username}`);
      }
    }
  }, [slug, location.pathname, navigate]);

  if (!slug) return null;
  return <Profile key={`profile-route-${slug}`} />;
}
