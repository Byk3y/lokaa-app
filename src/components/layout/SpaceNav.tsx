import { log } from '@/utils/logger';
import { ReactNode, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { LocationState } from '@/pages/Space';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { extractTabFromPathname, buildSpaceUrl, type SpaceTab } from '@/utils/tabUtils';
import { 
  FeedIcon, 
  ClassroomIcon, 
  CalendarIcon, 
  MembersIcon, 
  LeaderboardIcon, 
  AboutIcon 
} from '@/components/ui/nav-icons';

interface SpaceNavProps {
  subdomain: string | undefined;
  activeTab: string;
  onTabChange: (tabKey: string) => void;
}

interface TabConfig {
  key: SpaceTab;
  icon: ReactNode;
  label: string;
  urlPath: string;
  featureFlag?: keyof Pick<ReturnType<typeof useSpaceSettingsStore.getState>['formData'], 'feature_classroom_enabled' | 'feature_calendar_enabled' | 'feature_map_enabled'>;
}

const TABS_CONFIG: TabConfig[] = [
  { key: 'feed', icon: <FeedIcon className="h-4 w-4" />, label: 'Feed', urlPath: '' },
  { key: 'classroom', icon: <ClassroomIcon className="h-4 w-4" />, label: 'Classroom', urlPath: 'classroom', featureFlag: 'feature_classroom_enabled' },
  { key: 'calendar', icon: <CalendarIcon className="h-4 w-4" />, label: 'Calendar', urlPath: 'calendar', featureFlag: 'feature_calendar_enabled' },
  { key: 'members', icon: <MembersIcon className="h-4 w-4" />, label: 'Members', urlPath: 'members' },
  { key: 'leaderboard', icon: <LeaderboardIcon className="h-4 w-4" />, label: 'Leaderboard', urlPath: 'leaderboard' },
  { key: 'about', icon: <AboutIcon className="h-4 w-4" />, label: 'About', urlPath: 'about' },
];

export default function SpaceNav({ subdomain, activeTab, onTabChange }: SpaceNavProps) {
  const { user } = useOptimizedAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { loadActiveSpace, space, formData } = useSpaceSettingsStore();
  const lastLoadedKey = useRef('');
  const tabRefs = useRef<{ [key: string]: HTMLAnchorElement | null }>({});

  // Memoized space loading key to prevent redundant API calls
  const spaceLoadingKey = useMemo(() => {
    return `${subdomain || ''}_${user?.id || ''}`;
  }, [subdomain, user?.id]);

  // Load space data only when needed
  useEffect(() => {
    if (subdomain && user?.id && (!space || space.subdomain !== subdomain)) {
      // Prevent duplicate loading calls
      if (lastLoadedKey.current === spaceLoadingKey) {
        return;
      }
      
      lastLoadedKey.current = spaceLoadingKey;
      loadActiveSpace({ subdomain }, user.id);
    }
  }, [spaceLoadingKey, space, loadActiveSpace]);

  // 🚀 FIXED: Remove duplicate navigation - let SpaceShellLayout handle all navigation
  const handleInternalTabChange = useCallback((tabKey: string, urlPath: string) => {
    const newTab = tabKey as SpaceTab;
    
    if (activeTab === newTab) {
      return; // Skip if already on this tab
    }
    
    if (process.env.NODE_ENV === 'development') {
      log.debug('Component', `🔄 [SpaceNav] Tab change requested: ${activeTab} -> ${newTab}`);
    }
    
    // Call the parent's tab change handler - SpaceShellLayout will handle the navigation
    onTabChange(newTab);
    
  }, [activeTab, onTabChange]);

  // 🚀 FIXED: More accurate active tab detection
  const getIsActive = useCallback((tabKey: SpaceTab) => {
    // Primary check: match against activeTab prop
    if (activeTab === tabKey) {
      return true;
    }
    
    // Secondary check: extract from current pathname for accuracy
    const extractedTab = extractTabFromPathname(location.pathname);
    if (extractedTab === tabKey) {
      return true;
    }
    
    // Special case for feed tab with root space paths
    if (tabKey === 'feed' && (location.pathname.endsWith('/space') || extractedTab === 'feed')) {
      return true;
    }
    
    return false;
  }, [activeTab, location.pathname]);

  // FIXED: Memoized visible tabs to prevent recalculation on every render
  const visibleTabs = useMemo(() => {
    return TABS_CONFIG.filter(tab => {
      if (tab.featureFlag && formData && formData[tab.featureFlag] === false) {
        return false;
      }
      return true;
    });
  }, [formData]);

  // Scroll active tab into view on change (mobile only)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      const activeRef = tabRefs.current[activeTab];
      if (activeRef) {
        activeRef.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeTab]);

  if (!subdomain) return null;

  return (
    <nav className="bg-white dark:bg-gray-900 border-b sticky top-14 z-40 p-0 mb-0 shadow-sm mt-0 pt-0 !mt-0 !pt-0 -mt-1 sm:mt-0">
      <div className="max-w-6xl mx-auto px-0 sm:px-4">
        <div
          className="flex flex-nowrap overflow-x-auto whitespace-nowrap scrollbar-none gap-1 sm:gap-2 relative
            h-14 sm:h-auto min-h-[56px] sm:min-h-0
            !mb-0 !pb-0 !pt-0
            justify-center sm:justify-start
            pl-4 sm:pl-0
          "
          role="tablist"
          aria-label="Space navigation tabs"
        >
          {visibleTabs.map((tab, idx) => {
            const isActive = getIsActive(tab.key);
            const url = buildSpaceUrl(subdomain, tab.key);
            
            return (
              <Link
                key={tab.key}
                ref={el => { tabRefs.current[tab.key] = el; }}
                to={url}
                state={{ preserveSpace: true, activeTab: tab.key } as LocationState}
                onClick={(e) => {
                  e.preventDefault();
                  handleInternalTabChange(tab.key, tab.urlPath);
                }}
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                className={`relative inline-flex items-center px-3 py-2 min-w-max text-sm rounded-md transition-all duration-200 whitespace-nowrap focus:outline-none
                  focus:text-gray-900 focus:bg-gray-100 active:text-gray-900 active:bg-gray-100 
                  ${isActive
                    ? 'font-semibold text-gray-900 dark:text-white border-b-2 border-gray-500 dark:border-gray-300 sm:border-gray-900 dark:sm:border-white bg-white dark:bg-gray-800 shadow-sm z-10 sm:hover:text-gray-900 sm:hover:bg-white'
                    : 'font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent sm:hover:text-gray-700 dark:sm:hover:text-gray-200 sm:hover:bg-gray-100 dark:sm:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-500 hover:bg-transparent'}
                  h-12 sm:h-auto justify-center`}
                style={{WebkitTapHighlightColor: 'rgba(0,0,0,0)'}}
              >
                <span className="hidden sm:flex sm:items-center sm:mr-2">{tab.icon}</span>
                <span className="text-sm">{tab.label}</span>
                {isActive && (
                  <span className="absolute left-2 right-2 -bottom-[2px] h-0.5 rounded-full bg-gray-500 dark:bg-gray-300 sm:bg-gray-900 dark:sm:bg-white" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
} 