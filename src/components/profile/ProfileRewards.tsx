import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Star, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getSupabaseClient } from '@/integrations/supabase/client';

interface ProfileRewardsProps {
  userId: string;
  activityScore: number;
}

interface BadgeDef {
  code: string;
  name: string;
  description: string;
  icon_url?: string | null;
}

interface UserBadge {
  badge_code: string;
  awarded_at: string;
}

const badgeIcons = [
  Medal,
  Star,
  Trophy,
  Award,
];

const ProfileRewards: React.FC<ProfileRewardsProps> = ({ userId, activityScore }) => {
  const [badgeDefs, setBadgeDefs] = useState<BadgeDef[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Level calculation: based on points (activityScore)
  const calculateLevel = (score: number) => Math.floor(score / 100) + 1;
  const calculateProgress = (score: number) => {
    const currentLevel = calculateLevel(score);
    const pointsForCurrentLevel = (currentLevel - 1) * 100;
    const progress = ((score - pointsForCurrentLevel) / 100) * 100;
    return Math.min(progress, 100);
  };
  const pointsToNextLevel = () => {
    const currentLevel = calculateLevel(activityScore);
    const nextLevelPoints = currentLevel * 100;
    return nextLevelPoints - activityScore;
  };
  const userLevel = calculateLevel(activityScore);
  const progressToNextLevel = calculateProgress(activityScore);

  useEffect(() => {
    const fetchBadges = async () => {
      setLoading(true);
      const { data: defs } = await getSupabaseClient().from('badges').select('*');
      const { data: user } = await getSupabaseClient().from('user_badges').select('badge_code, awarded_at').eq('user_id', userId);
      if (defs) setBadgeDefs(defs);
      if (user) setUserBadges(user);
      setLoading(false);
    };
    if (userId) fetchBadges();
  }, [userId]);

  // Map badge_code to badge definition
  const badgeMap = Object.fromEntries(badgeDefs.map(b => [b.code, b]));
  const earnedBadges = userBadges.map(b => ({ ...badgeMap[b.badge_code], awarded_at: b.awarded_at })).filter(b => b.name);
  const badgesCount = earnedBadges.length;

  // Custom badge icon logic
  const getBadgeIcon = (idx: number, icon_url?: string | null, name?: string) => {
    if (icon_url) {
      return <img src={icon_url} alt={name || 'Badge'} className="w-9 h-9 object-contain rounded-full border border-amber-200 bg-amber-50 shadow" />;
    }
    const Icon = badgeIcons[idx % badgeIcons.length];
    return <Icon size={36} weight="duotone" className="text-amber-500 bg-amber-100 rounded-full p-1 shadow" />;
  };

  return (
    <div className="rounded-lg">
      {/* Level and Progress */}
      <div className="bg-gradient-to-br from-amber-50 via-amber-50/40 to-white p-6 rounded-xl border border-amber-100 shadow-[0_10px_30px_rgba(251,191,36,0.07)] hover:shadow-[0_15px_50px_rgba(251,191,36,0.12)] transition-all duration-300">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-amber-100 rounded-lg shadow-sm mr-3">
            <Trophy className="h-5 w-5 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-gray-900">Level {userLevel}</h3>
          <div className="ml-auto px-3 py-1 bg-amber-100 rounded-full text-amber-700 text-sm font-semibold shadow-inner">
            +{pointsToNextLevel()} to level up
          </div>
        </div>
        <Progress value={progressToNextLevel} className="h-3 mb-3 bg-amber-100 rounded-full" />
        <div className="flex justify-between text-sm text-gray-600 font-medium">
          <span className="flex items-center">
            <span className="inline-block h-2 w-2 bg-amber-400 rounded-full mr-2 animate-pulse"></span>
            {activityScore} points
          </span>
          <span className="flex items-center">
            <PhTrophy size={16} weight="fill" className="text-amber-500 mr-1.5" />
            {badgesCount} Badges Earned
          </span>
        </div>
        <div className="mt-5 text-sm text-gray-700 bg-white/70 p-3 rounded-lg border border-amber-100/50">
          <p>Keep engaging with the community to earn points and level up! Each contribution helps you progress.</p>
        </div>
        {badgesCount > 0 && (
          <div className="mt-5 flex justify-end">
            <button
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-white font-semibold hover:from-amber-600 hover:to-amber-500 transition shadow-sm hover:shadow disabled:opacity-60 transform hover:translate-y-[-2px] active:translate-y-[0px]"
              onClick={() => setModalOpen(true)}
              disabled={loading || badgesCount === 0}
            >
              View Badges
            </button>
          </div>
        )}
      </div>
      {/* Badges Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8 w-full max-w-md relative border border-amber-100 animate-fadeIn">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold bg-gray-100 h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-xl font-bold mb-6 text-amber-700 flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-lg shadow-sm">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
              Your Badges
            </h3>
            {loading ? (
              <div className="text-gray-400 h-40 flex items-center justify-center">
                <span className="animate-pulse">Loading badges...</span>
              </div>
            ) : badgesCount === 0 ? (
              <div className="text-gray-400 bg-gray-50 p-6 rounded-xl text-center h-40 flex flex-col items-center justify-center">
                <PhTrophy size={32} weight="light" className="text-gray-300 mb-3" />
                <span>No badges earned yet.</span>
                <span className="text-sm mt-2 text-gray-400">Keep engaging to earn your first badge!</span>
              </div>
            ) : (
              <ul className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 -mr-1">
                {earnedBadges.map((badge, i) => (
                  <li key={badge.code} className="flex items-center gap-4 p-3 rounded-lg hover:bg-amber-50 transition border border-transparent hover:border-amber-100">
                    <div className="transform transition-transform hover:scale-110 hover:rotate-3">
                      {getBadgeIcon(i, badge.icon_url, badge.name)}
                    </div>
                    <div>
                      <div className="font-semibold text-base text-gray-900">{badge.name}</div>
                      <div className="text-xs text-gray-600">{badge.description}</div>
                      <div className="text-xs text-gray-400 mt-1">Earned: {badge.awarded_at ? new Date(badge.awarded_at).toLocaleDateString() : ''}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileRewards;
