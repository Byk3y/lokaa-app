import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useOptimizedAuth } from '../../contexts/AuthContext';

export function RouterTest() {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const { user, loading, userDetails } = useOptimizedAuth();
  const renderCount = useRef(0);
  const prevPathname = useRef(location.pathname);
  
  const routeInfo = {
    pathname: location.pathname,
    hash: location.hash,
    search: location.search,
    isProfileRoute: location.pathname.startsWith('/profile/'),
    profileSlug: location.pathname.startsWith('/profile/') ? location.pathname.substring('/profile/'.length) : null,
    subdomain: location.pathname.split('/')[1]?.startsWith('@') 
      ? location.pathname.split('/')[1]
      : null
  };
  
  useEffect(() => {
    console.log("[RouterTest] Location changed:", location.pathname);
    const isProfileRoute = location.pathname.startsWith('/profile/');
    console.log("[RouterTest] Is profile route?", isProfileRoute);
    if (isProfileRoute) {
      const slug = location.pathname.substring('/profile/'.length);
      console.log("[RouterTest] Profile slug:", slug);
    }
    // Only log if the pathname actually changed
    if (prevPathname.current !== location.pathname) {
      renderCount.current += 1;
      prevPathname.current = location.pathname;
      
      // Log extensive details about this route
      console.log('🧪 ROUTER TEST - Route Details:', {
        pathname: location.pathname,
        params,
        isProfileRoute: location.pathname.startsWith('/@'),
        profileSlug: location.pathname.startsWith('/@') ? location.pathname.substring(2) : null,
        search: location.search,
        hash: location.hash,
        state: location.state,
        key: location.key,
        renderCount: renderCount.current
      });
    }
  }, [location.pathname, params, location.search, location.hash, location.state, location.key]);
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  const isProfileRoute = location.pathname.startsWith('/@');
  const profileSlug = isProfileRoute ? location.pathname.substring(2) : null;
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      zIndex: 9999,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      maxWidth: '300px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
    }}>
      <div><strong>Path:</strong> {location.pathname}</div>
      <div><strong>Profile?</strong> {isProfileRoute ? '✅' : '❌'}</div>
      {isProfileRoute && <div><strong>Slug:</strong> {profileSlug}</div>}
      <div><strong>Params:</strong> {JSON.stringify(params)}</div>
      <div><strong>Renders:</strong> {renderCount.current}</div>
    </div>
  );
} 