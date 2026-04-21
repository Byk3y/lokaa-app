import React from 'react';
import {
  Newspaper,
  GraduationCap,
  CalendarDays,
  Users,
  Trophy,
  Info,
  Bell,
  Bookmark,
  Search,
  Menu,
  MoreHorizontal,
  Home,
  MessageCircle,
  Plus,
  User,
  Briefcase,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavIconProps {
  className?: string;
  strokeWidth?: number;
}

// Space Navigation Icons
export const FeedIcon: React.FC<NavIconProps> = ({ className, strokeWidth = 2 }) => (
  <Newspaper className={cn("h-4 w-4 sm:h-5 sm:w-5", className)} strokeWidth={strokeWidth} />
);

export const ClassroomIcon: React.FC<NavIconProps> = ({ className, strokeWidth = 2 }) => (
  <GraduationCap className={cn("h-4 w-4 sm:h-5 sm:w-5", className)} strokeWidth={strokeWidth} />
);

export const CalendarIcon: React.FC<NavIconProps> = ({ className, strokeWidth = 2 }) => (
  <CalendarDays className={cn("h-4 w-4 sm:h-5 sm:w-5", className)} strokeWidth={strokeWidth} />
);

export const MembersIcon: React.FC<NavIconProps> = ({ className, strokeWidth = 2 }) => (
  <Users className={cn("h-4 w-4 sm:h-5 sm:w-5", className)} strokeWidth={strokeWidth} />
);

export const LeaderboardIcon: React.FC<NavIconProps> = ({ className, strokeWidth = 2 }) => (
  <Trophy className={cn("h-4 w-4 sm:h-5 sm:w-5", className)} strokeWidth={strokeWidth} />
);

export const AboutIcon: React.FC<NavIconProps> = ({ className, strokeWidth = 2 }) => (
  <Info className={cn("h-4 w-4 sm:h-5 sm:w-5", className)} strokeWidth={strokeWidth} />
);

// Top Navigation Icons
export const NotificationIcon: React.FC<NavIconProps> = ({ className, strokeWidth = 2 }) => (
  <Bell className={cn("w-5 h-5", className)} strokeWidth={strokeWidth} />
);

export const NavBookmarkIcon: React.FC<NavIconProps> = ({ className, strokeWidth = 2 }) => (
  <Bookmark className={cn("w-5 h-5", className)} strokeWidth={strokeWidth} />
);

export const SearchIcon: React.FC<NavIconProps> = ({ className, strokeWidth = 2 }) => (
  <Search className={cn("w-5 h-5", className)} strokeWidth={strokeWidth} />
);

export const MenuIcon: React.FC<NavIconProps> = ({ className, strokeWidth = 2 }) => (
  <Menu className={cn("w-5 h-5", className)} strokeWidth={strokeWidth} />
);

export const MoreIcon: React.FC<NavIconProps> = ({ className, strokeWidth = 2 }) => (
  <MoreHorizontal className={cn("w-5 h-5", className)} strokeWidth={strokeWidth} />
);

// Chat and Message Icons - for top nav usage (same as post cards)
export const TopNavChatIcon: React.FC<NavIconProps> = ({ className, strokeWidth = 2 }) => (
  <MessageCircle className={cn("w-5 h-5", className)} strokeWidth={strokeWidth} />
);

export const TopNavBellIcon: React.FC<NavIconProps> = ({ className, strokeWidth = 2 }) => (
  <Bell className={cn("w-5 h-5", className)} strokeWidth={strokeWidth} />
);

// Mobile Navigation Icons
export const NavHomeIcon: React.FC<NavIconProps> = ({ className, strokeWidth = 2 }) => (
  <Home className={cn("w-[22px] h-[22px]", className)} strokeWidth={strokeWidth} />
);

export const ChatIcon: React.FC<NavIconProps> = ({ className, strokeWidth = 2 }) => (
  <MessageCircle className={cn("w-[22px] h-[22px]", className)} strokeWidth={strokeWidth} />
);

export const AddIcon: React.FC<NavIconProps> = ({ className, strokeWidth = 2 }) => (
  <Plus className={cn("w-6 h-6", className)} strokeWidth={strokeWidth} />
);

export const ProfileIcon: React.FC<NavIconProps> = ({ className, strokeWidth = 2 }) => (
  <User className={cn("w-5 h-5", className)} strokeWidth={strokeWidth} />
);

// Space Switcher Icons
export const SpaceIcon: React.FC<NavIconProps> = ({ className, strokeWidth = 2 }) => (
  <Briefcase className={cn("mr-2 h-4 w-4", className)} strokeWidth={strokeWidth} />
);

export const DiscoverIcon: React.FC<NavIconProps> = ({ className, strokeWidth = 2 }) => (
  <Globe className={cn("mr-2 h-4 w-4", className)} strokeWidth={strokeWidth} />
);

// Helper function to get space tab icon by tab name
export const getSpaceTabIcon = (tab: string, className?: string, strokeWidth = 2) => {
  switch(tab.toLowerCase()) {
    case 'feed':
      return <FeedIcon className={className} strokeWidth={strokeWidth} />;
    case 'classroom':
      return <ClassroomIcon className={className} strokeWidth={strokeWidth} />;
    case 'calendar':
      return <CalendarIcon className={className} strokeWidth={strokeWidth} />;
    case 'members':
      return <MembersIcon className={className} strokeWidth={strokeWidth} />;
    case 'leaderboard':
    case 'leaderboards':
      return <LeaderboardIcon className={className} strokeWidth={strokeWidth} />;
    case 'about':
      return <AboutIcon className={className} strokeWidth={strokeWidth} />;
    default:
      return <FeedIcon className={className} strokeWidth={strokeWidth} />;
  }
};
