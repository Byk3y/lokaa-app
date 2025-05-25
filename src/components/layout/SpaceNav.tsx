import { ReactNode, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Newspaper, GraduationCap, CalendarDays, Users2, Award, Info, MapPin } from 'lucide-react';
import { LocationState } from '@/pages/Space';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { useAuth } from '@/contexts/AuthContext';

interface SpaceNavProps {
  subdomain: string | undefined;
  activeTab: string;
  onTabChange: (tabKey: string) => void;
}

interface TabConfig {
  key: string;
  icon: ReactNode;
  label: string;
  urlPath: string;
  featureFlag?: keyof Pick<ReturnType<typeof useSpaceSettingsStore.getState>['formData'], 'feature_classroom_enabled' | 'feature_calendar_enabled' | 'feature_map_enabled'>;
}

const TABS_CONFIG: TabConfig[] = [
  { key: "community", icon: <Newspaper className="h-4 w-4" />, label: "Feed", urlPath: "feed" },
  { key: "classroom", icon: <GraduationCap className="h-4 w-4" />, label: "Classroom", urlPath: "classroom", featureFlag: "feature_classroom_enabled" },
  { key: "calendar", icon: <CalendarDays className="h-4 w-4" />, label: "Calendar", urlPath: "calendar", featureFlag: "feature_calendar_enabled" },
  { key: "members", icon: <Users2 className="h-4 w-4" />, label: "Members", urlPath: "members" },
  { key: "leaderboard", icon: <Award className="h-4 w-4" />, label: "Leaderboards", urlPath: "leaderboard" },
  { key: "about", icon: <Info className="h-4 w-4" />, label: "About", urlPath: "about" },
];

export default function SpaceNav({ subdomain, activeTab, onTabChange }: SpaceNavProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { space, loadActiveSpace, formData } = useSpaceSettingsStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (subdomain && user?.id && (!space || space.subdomain !== subdomain)) {
      loadActiveSpace({ subdomain }, user.id);
    }
  }, [subdomain, user?.id, space, loadActiveSpace]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        container.scrollBy({ left: -100, behavior: 'smooth' });
      } else if (event.key === 'ArrowRight') {
        container.scrollBy({ left: 100, behavior: 'smooth' });
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleInternalTabChange = (tabKey: string, urlPath: string) => {
    onTabChange(tabKey);
    const url = `/${subdomain}/space/${urlPath}`;
    navigate(url, {
      replace: true,
      state: { preserveSpace: true, activeTab: tabKey } as LocationState,
    });
  };

  if (!subdomain) return null;

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-14 z-30" aria-label="Main navigation">
      <div
        ref={scrollContainerRef}
        className="flex flex-nowrap overflow-x-auto scroll-smooth snap-x snap-mandatory hide-scrollbar sm:justify-center"
        role="tablist"
        tabIndex={0}
      >
        {TABS_CONFIG.map((tab) => {
          if (tab.featureFlag && formData && formData[tab.featureFlag] === false) {
            return null;
          }

          const isActive = activeTab === tab.key;
          const url = `/${subdomain}/space/${tab.urlPath}`;
          return (
            <Link
              key={tab.key}
              to={url}
              state={{ preserveSpace: true, activeTab: tab.key } as LocationState}
              onClick={(e) => {
                e.preventDefault();
                handleInternalTabChange(tab.key, tab.urlPath);
              }}
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
              className={`snap-start flex-shrink-0 relative inline-flex items-center justify-center px-3 py-3 text-sm whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-lokaa-500 dark:focus-visible:ring-offset-gray-900 min-w-max h-[45px] transition-colors duration-150
                ${isActive
                  ? 'font-semibold text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white'
                  : 'font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}
              `}
            >
              <span className="mr-1.5 flex items-center">{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
} 