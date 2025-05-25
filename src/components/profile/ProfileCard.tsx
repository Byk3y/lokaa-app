import React, { useState } from 'react';
import { Calendar, Circle, User, Edit2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FollowButton from './FollowButton';
import FollowStats from './FollowStats';
import ChatButton from '@/components/chat/ChatButton';
import { MessageSquare } from 'lucide-react';

interface ProfileCardProps {
  profileData: any;
  isCurrentUser: boolean;
  onShowFollowers: () => void;
  onShowFollowing: () => void;
  level?: number;
  pointsToNext?: number;
  progress?: number;
}

const BRAND_TEAL = '#00A389';

const ProfileCard: React.FC<ProfileCardProps> = ({ profileData, isCurrentUser, onShowFollowers, onShowFollowing, level = 1, pointsToNext = 0, progress = 0 }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col items-center w-full max-w-[280px] mx-auto">
      {/* Avatar with level badge */}
      <div className="relative mb-4">
        <div className="h-40 w-40 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center shadow-md">
          {profileData.avatar_url ? (
            <img src={profileData.avatar_url} alt={profileData.full_name} className="h-full w-full object-cover" />
          ) : (
            <User className="h-24 w-24 text-gray-400" />
          )}
        </div>
        {/* Level badge overlay */}
        <div
          className="absolute -bottom-2 right-3 text-white rounded-full h-12 w-12 flex items-center justify-center border-4 border-white shadow-md"
          style={{ background: BRAND_TEAL }}
        >
          <span className="font-bold text-xl">{level}</span>
        </div>
      </div>
      {/* Level & Progress */}
      <div className="w-full mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-500">Level {level}</span>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-1">{pointsToNext} points to Level {level + 1}</span>
            <button 
              className="text-gray-400 hover:text-gray-600" 
              onClick={() => setModalOpen(true)}
              aria-label="Learn about levels"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div 
            className="h-2.5 rounded-full" 
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${BRAND_TEAL} 0%, #2DD4BF 100%)`
            }}
          ></div>
        </div>
      </div>
      {/* Level Info Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm relative border border-teal-100 animate-fadeIn">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-lg font-bold mb-3" style={{ color: BRAND_TEAL }}>
              <Info className="h-5 w-5 mr-1 inline-block" style={{ color: BRAND_TEAL }} /> What are Levels?
            </h3>
            <div className="text-gray-700 text-sm space-y-3">
              <p><strong>Levels</strong> are a way to track your progress and engagement in the community.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>You earn <b>1 point</b> for every post, comment, or like.</li>
                <li>Every <b>100 points</b> increases your level by 1.</li>
                <li>Your current level is shown on your profile and helps you unlock new badges and recognition.</li>
              </ul>
              <p>Keep participating to level up and earn rewards!</p>
            </div>
          </div>
        </div>
      )}
      {/* Name, Username, Bio */}
      <div className="text-center mt-2 mb-3 w-full">
        <div className="text-xl font-bold text-gray-900">{profileData.full_name || 'User Name'}</div>
        <div className="text-gray-500 text-sm mb-1">@{profileData.profile_url || 'username'}</div>
        <div className="text-gray-700 text-base mb-2">{profileData.bio || <span className="text-gray-400">Here to learn</span>}</div>
      </div>
      {/* Edit Profile Button */}
      {isCurrentUser ? (
        <button
          className="w-full bg-teal-50 border border-teal-100 text-teal-800 font-semibold rounded-lg py-2 mb-3 flex items-center justify-center gap-2 hover:bg-teal-100 transition"
          onClick={() => navigate('/settings/profile')}
        >
          <Edit2 className="h-4 w-4" /> EDIT PROFILE
        </button>
      ) : (
        <div className="w-full mb-3 flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <FollowButton userId={profileData.id} size="lg" className="flex-1" withIcon={true} />
          <ChatButton variant="textButton" className="flex-1" targetUserId={profileData.id} />
        </div>
      )}
      {/* Active status and joined date */}
      <div className="flex flex-col items-center justify-center gap-2 text-gray-500 text-sm mb-3">
        <span className="flex items-center gap-1"><Circle className="h-3 w-3 text-green-500" />Active 1m ago</span>
        <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Joined {profileData.created_at ? new Date(profileData.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}</span>
      </div>
      {/* Stats Row */}
      <div className="flex w-full border-t pt-4 mt-2 justify-around">
        <div className="flex-1 flex flex-col items-center">
          <FollowStats 
            userId={profileData.id} 
            showLabels={true}
            showTooltip={false}
            onStatsLoaded={(stats) => {
              // Update parent component with follower/following counts if needed
              profileData.followers = stats.followers;
              profileData.following = stats.following;
            }}
          />
        </div>
        <div className="flex-1 flex flex-col items-center">
          <span className="font-bold text-lg text-gray-900">{profileData.contributions ?? 0}</span>
          <span className="text-xs text-gray-500">Contributions</span>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard; 