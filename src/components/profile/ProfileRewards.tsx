import React, { useEffect, useState } from 'react';
import { Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from '@/integrations/supabase/client';
import { Medal, Star, Trophy as PhTrophy, Certificate } from '@phosphor-icons/react';

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
  PhTrophy,
  Certificate
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
      const { data: defs } = await supabase.from('badges').select('*');
      const { data: user } = await supabase.from('user_badges').select('badge_code, awarded_at').eq('user_id', userId);
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
    <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
      {/* Level and Progress */}
      <div className="bg-gradient-to-br from-amber-50 to-white p-5 rounded-xl shadow-sm mb-6 border border-amber-100">
        <div className="flex items-center mb-3">
          <Trophy className="h-5 w-5 text-amber-500 mr-2" />
          <h3 className="text-lg font-semibold tracking-tight text-gray-900">Level {userLevel}</h3>
        </div>
        <Progress value={progressToNextLevel} className="h-2 mb-2 bg-amber-100" />
        <div className="flex justify-between text-sm text-gray-600 font-medium">
          <span>{activityScore} points</span>
          <span>Badges Earned: {badgesCount}</span>
        </div>
        <div className="mt-4 text-sm text-gray-700">
          <p>Keep engaging with the community to earn points and level up!</p>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            className="px-4 py-1.5 rounded bg-amber-100 text-amber-700 font-semibold hover:bg-amber-200 transition border border-amber-200 shadow-sm disabled:opacity-60"
            onClick={() => setModalOpen(true)}
            disabled={loading || badgesCount === 0}
          >
            View Badges
          </button>
        </div>
      </div>
      {/* Badges Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-2xl shadow-2xl p-7 w-full max-w-md relative border border-amber-100 animate-fadeIn">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-xl font-bold mb-5 text-amber-700 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" /> Your Badges
            </h3>
            {loading ? (
              <div className="text-gray-400">Loading badges...</div>
            ) : badgesCount === 0 ? (
              <div className="text-gray-400">No badges earned yet.</div>
            ) : (
              <ul className="space-y-4">
                {earnedBadges.map((badge, i) => (
                  <li key={badge.code} className="flex items-center gap-4 p-2 rounded-lg hover:bg-amber-50 transition">
                    {getBadgeIcon(i, badge.icon_url, badge.name)}
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
