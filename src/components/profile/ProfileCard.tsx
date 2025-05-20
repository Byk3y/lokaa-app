import React, { useState } from 'react';
import { Calendar, Circle, User, Edit2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col items-center w-full">
      {/* Avatar with level badge */}
      <div className="relative mb-2">
        <div className="h-28 w-28 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
          {profileData.avatar_url ? (
            <img src={profileData.avatar_url} alt={profileData.full_name} className="h-full w-full object-cover" />
          ) : (
            <User className="h-16 w-16 text-gray-400" />
          )}
        </div>
        {/* Level badge overlay */}
        <div
          className="absolute bottom-2 right-2 text-white rounded-full h-8 w-8 flex items-center justify-center border-4 border-white shadow"
          style={{ background: BRAND_TEAL }}
        >
          <span className="font-bold text-lg">{level}</span>
        </div>
      </div>
      {/* Level & Progress */}
      <div className="flex flex-col items-center mt-2 mb-2">
        <span className="font-semibold text-base flex items-center gap-1" style={{ color: BRAND_TEAL }}>
          Level {level}
          <button
            type="button"
            className="ml-1 p-0.5 rounded-full hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-200"
            aria-label="What are levels?"
            onClick={() => setModalOpen(true)}
          >
            <Info className="h-4 w-4" style={{ color: BRAND_TEAL }} />
          </button>
        </span>
        <span className="text-teal-700 text-sm mt-1">{pointsToNext} points to level up</span>
        <div className="w-40 h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress * 100}%`, background: BRAND_TEAL }}
          />
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
      <div className="text-center mt-2 mb-2">
        <div className="text-xl font-bold text-gray-900">{profileData.full_name || 'User Name'}</div>
        <div className="text-gray-500 text-sm mb-1">@{profileData.profile_url || 'username'}</div>
        <div className="text-gray-700 text-base mb-2">{profileData.bio || <span className="text-gray-400">Here to learn</span>}</div>
      </div>
      {/* Edit Profile Button */}
      {isCurrentUser && (
        <button
          className="w-full bg-teal-50 border border-teal-100 text-teal-800 font-semibold rounded-lg py-2 mb-2 flex items-center justify-center gap-2 hover:bg-teal-100 transition"
          onClick={() => navigate('/settings/profile')}
        >
          <Edit2 className="h-4 w-4" /> EDIT PROFILE
        </button>
      )}
      {/* Active status and joined date */}
      <div className="flex items-center justify-center gap-4 text-gray-500 text-sm mb-2">
        <span className="flex items-center gap-1"><Circle className="h-3 w-3 text-green-500" />Active 1m ago</span>
        <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Joined {profileData.created_at ? new Date(profileData.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}</span>
      </div>
      {/* Stats Row */}
      <div className="flex w-full border-t pt-4 mt-2 justify-around">
        <button className="flex-1 flex flex-col items-center" onClick={onShowFollowers}>
          <span className="font-bold text-lg text-gray-900">{profileData.followers ?? 0}</span>
          <span className="text-xs text-gray-500">Followers</span>
        </button>
        <button className="flex-1 flex flex-col items-center" onClick={onShowFollowing}>
          <span className="font-bold text-lg text-gray-900">{profileData.following ?? 0}</span>
          <span className="text-xs text-gray-500">Following</span>
        </button>
        <div className="flex-1 flex flex-col items-center">
          <span className="font-bold text-lg text-gray-900">{profileData.contributions ?? 0}</span>
          <span className="text-xs text-gray-500">Contributions</span>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard; 