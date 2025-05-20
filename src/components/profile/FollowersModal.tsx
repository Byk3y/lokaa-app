import React from 'react';

interface FollowersModalProps {
  open: boolean;
  onClose: () => void;
  type: 'followers' | 'following';
  userId: string;
}

const FollowersModal: React.FC<FollowersModalProps> = ({ open, onClose, type, userId }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-8 min-w-[320px] max-w-[90vw]">
        <h3 className="text-lg font-semibold mb-4">{type === 'followers' ? 'Followers' : 'Following'}</h3>
        <div className="h-32 flex items-center justify-center text-gray-400">
          {/* Placeholder for followers/following list */}
          <span>List of {type} will appear here.</span>
        </div>
        <button className="mt-6 w-full bg-primary text-white rounded-lg py-2" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default FollowersModal; 