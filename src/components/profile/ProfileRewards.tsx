
import { Trophy, Award, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProfileRewardsProps {
  userId: string;
  activityScore: number;
}

export default function ProfileRewards({ userId, activityScore }: ProfileRewardsProps) {
  // Calculate user level based on activity score
  const calculateLevel = (score: number) => {
    return Math.floor(score / 100) + 1;
  };

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

  // Mock badges data
  const badges = [
    { id: 1, name: "Early Adopter", icon: <Star className="h-5 w-5" />, unlocked: true },
    { id: 2, name: "Conversation Starter", icon: <Award className="h-5 w-5" />, unlocked: activityScore >= 50 },
    { id: 3, name: "Community Builder", icon: <Trophy className="h-5 w-5" />, unlocked: activityScore >= 100 },
  ];

  return (
    <div className="mt-6">
      {/* Level and Progress */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex items-center mb-3">
          <Trophy className="h-5 w-5 text-amber-500 mr-2" />
          <h3 className="text-lg font-medium">Level {userLevel}</h3>
        </div>
        
        <Progress value={progressToNextLevel} className="h-2 mb-2" />
        
        <div className="flex justify-between text-sm text-gray-500">
          <span>{activityScore} points</span>
          <span>{pointsToNextLevel()} points to Level {userLevel + 1}</span>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p>Keep engaging with the community to earn points and level up!</p>
        </div>
      </div>
      
      {/* Badges */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium mb-4">Badges</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {badges.map(badge => (
            <div 
              key={badge.id} 
              className={`p-4 rounded-lg border text-center ${badge.unlocked ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${badge.unlocked ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                {badge.icon}
              </div>
              <h4 className="font-medium">{badge.name}</h4>
              <p className="text-xs text-gray-500 mt-1">
                {badge.unlocked ? 'Unlocked' : 'Locked'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
