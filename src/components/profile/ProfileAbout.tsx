import { Trophy, MapPin } from "lucide-react";

interface ProfileAboutProps {
  profileData: any;
}

export default function ProfileAbout({ profileData }: ProfileAboutProps) {
  // Provide defaults for missing fields
  const activityScore = profileData.activity_score || 0;
  const userLevel = Math.floor(activityScore / 100) + 1;
  const pointsToNextLevel = 100 - (activityScore % 100);
  
  return (
    <div className="mt-6">
      {/* Level and points info */}
      <div className="mb-6 flex items-center">
        <div className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full flex items-center">
          <Trophy className="h-4 w-4 mr-1" /> 
          <span className="font-medium">Level {userLevel}</span>
        </div>
        <div className="ml-4 text-sm text-gray-500">
          <span>{activityScore} points</span> • <span>{pointsToNextLevel} to level up</span>
        </div>
      </div>

      {/* Biography */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Biography</h3>
        <p className="text-gray-700">
          {profileData.bio || "No biography provided yet."}
        </p>
      </div>

      {/* Location */}
      {profileData.location && (
        <div className="flex items-center text-gray-600 mb-4">
          <MapPin className="h-4 w-4 mr-2" />
          <span>{profileData.location}</span>
        </div>
      )}
    </div>
  );
}
