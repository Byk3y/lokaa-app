import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Trophy, Award, Medal, Star, MessageSquare, 
  ThumbsUp, Activity, Clock, Calendar, ChevronDown 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface LeaderboardsTabProps {
  space: {
    id: string;
    name: string;
  };
}

// Mock data for leaderboard
const mockMembers = [
  { 
    id: '1', 
    name: 'Jane Smith',
    avatar: null,
    points: 1250,
    posts: 18,
    likes: 47,
    comments: 32,
    streak: 23,
    badges: ['top_contributor', 'helpful', 'streak_master']
  },
  { 
    id: '2', 
    name: 'You',
    avatar: null,
    points: 980,
    posts: 12,
    likes: 36,
    comments: 28,
    streak: 15,
    badges: ['streak_master']
  },
  { 
    id: '3', 
    name: 'John Doe',
    avatar: null,
    points: 750,
    posts: 8,
    likes: 29,
    comments: 18,
    streak: 7,
    badges: ['helpful']
  },
  { 
    id: '4', 
    name: 'Alice Johnson',
    avatar: null,
    points: 520,
    posts: 5,
    likes: 19,
    comments: 14,
    streak: 3,
    badges: []
  },
  { 
    id: '5', 
    name: 'Bob Williams',
    avatar: null,
    points: 320,
    posts: 3,
    likes: 8,
    comments: 7,
    streak: 1,
    badges: []
  }
];

export default function LeaderboardsTab({ space }: LeaderboardsTabProps) {
  const [leaderboardType, setLeaderboardType] = useState<'points' | 'posts' | 'likes' | 'comments' | 'streaks'>('points');
  const [timeframe, setTimeframe] = useState<'all_time' | 'this_month' | 'this_week'>('all_time');
  
  // Get sorted members based on leaderboard type
  const getSortedMembers = () => {
    switch (leaderboardType) {
      case 'posts':
        return [...mockMembers].sort((a, b) => b.posts - a.posts);
      case 'likes':
        return [...mockMembers].sort((a, b) => b.likes - a.likes);
      case 'comments':
        return [...mockMembers].sort((a, b) => b.comments - a.comments);
      case 'streaks':
        return [...mockMembers].sort((a, b) => b.streak - a.streak);
      case 'points':
      default:
        return [...mockMembers].sort((a, b) => b.points - a.points);
    }
  };
  
  // Get timeframe text
  const getTimeframeText = () => {
    switch (timeframe) {
      case 'this_month':
        return 'This Month';
      case 'this_week':
        return 'This Week';
      case 'all_time':
      default:
        return 'All Time';
    }
  };
  
  // Get badge icon
  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'top_contributor':
        return <Trophy className="h-4 w-4 text-amber-500" />;
      case 'helpful':
        return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'streak_master':
        return <Activity className="h-4 w-4 text-purple-500" />;
      default:
        return <Star className="h-4 w-4 text-gray-400" />;
    }
  };
  
  // Get badge text
  const getBadgeText = (badge: string) => {
    switch (badge) {
      case 'top_contributor':
        return 'Top Contributor';
      case 'helpful':
        return 'Helpful';
      case 'streak_master':
        return 'Streak Master';
      default:
        return 'Badge';
    }
  };
  
  // Get value based on leaderboard type
  const getValue = (member: typeof mockMembers[0]) => {
    switch (leaderboardType) {
      case 'posts':
        return member.posts;
      case 'likes':
        return member.likes;
      case 'comments':
        return member.comments;
      case 'streaks':
        return member.streak;
      case 'points':
      default:
        return member.points;
    }
  };
  
  // Get metric icon based on leaderboard type
  const getMetricIcon = () => {
    switch (leaderboardType) {
      case 'posts':
        return <MessageSquare className="h-4 w-4 text-[#26A69A]" />;
      case 'likes':
        return <ThumbsUp className="h-4 w-4 text-[#26A69A]" />;
      case 'comments':
        return <MessageSquare className="h-4 w-4 text-[#26A69A]" />;
      case 'streaks':
        return <Activity className="h-4 w-4 text-[#26A69A]" />;
      case 'points':
      default:
        return <Award className="h-4 w-4 text-[#26A69A]" />;
    }
  };
  
  const sortedMembers = getSortedMembers();
  const maxValue = sortedMembers.length > 0 ? sortedMembers[0][leaderboardType === 'points' ? 'points' : leaderboardType === 'streaks' ? 'streak' : leaderboardType] : 1;
  
  return (
    <div className="flex-1 space-y-6">
      {/* Leaderboard Header */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden"
      >
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <Trophy className="h-5 w-5 text-[#26A69A] mr-2" />
            <h2 className="text-lg font-medium text-[#37474F]">Leaderboards</h2>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Button 
                variant="outline"
                className="border-[#E0F2F1] text-[#37474F] bg-[#F5FAFA] rounded-lg text-sm flex items-center h-9"
                onClick={() => setTimeframe(timeframe === 'all_time' ? 'this_month' : timeframe === 'this_month' ? 'this_week' : 'all_time')}
              >
                {timeframe === 'all_time' ? (
                  <Calendar className="h-4 w-4 mr-2 text-[#26A69A]" />
                ) : (
                  <Clock className="h-4 w-4 mr-2 text-[#26A69A]" />
                )}
                {getTimeframeText()}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Leaderboard Tabs and Content */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)]"
      >
        <Tabs defaultValue="points" className="w-full" onValueChange={(value) => setLeaderboardType(value as any)}>
          <div className="border-b border-[#E0F2F1]">
            <TabsList className="bg-[#F5FAFA] p-1 w-full flex rounded-none justify-start space-x-1">
              <TabsTrigger 
                value="points" 
                className="data-[state=active]:bg-white data-[state=active]:text-[#26A69A] data-[state=active]:shadow-sm rounded-lg"
              >
                <Award className="h-4 w-4 mr-2" />
                Points
              </TabsTrigger>
              <TabsTrigger 
                value="posts" 
                className="data-[state=active]:bg-white data-[state=active]:text-[#26A69A] data-[state=active]:shadow-sm rounded-lg"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Posts
              </TabsTrigger>
              <TabsTrigger 
                value="likes" 
                className="data-[state=active]:bg-white data-[state=active]:text-[#26A69A] data-[state=active]:shadow-sm rounded-lg"
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Likes
              </TabsTrigger>
              <TabsTrigger 
                value="comments" 
                className="data-[state=active]:bg-white data-[state=active]:text-[#26A69A] data-[state=active]:shadow-sm rounded-lg"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Comments
              </TabsTrigger>
              <TabsTrigger 
                value="streaks" 
                className="data-[state=active]:bg-white data-[state=active]:text-[#26A69A] data-[state=active]:shadow-sm rounded-lg"
              >
                <Activity className="h-4 w-4 mr-2" />
                Streaks
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="points" className="m-0">
            <div className="p-4">
              <LeaderboardList 
                members={sortedMembers}
                leaderboardType={leaderboardType}
                getValue={getValue}
                maxValue={maxValue}
                getMetricIcon={getMetricIcon}
                getBadgeIcon={getBadgeIcon}
                getBadgeText={getBadgeText}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="posts" className="m-0">
            <div className="p-4">
              <LeaderboardList 
                members={sortedMembers}
                leaderboardType={leaderboardType}
                getValue={getValue}
                maxValue={maxValue}
                getMetricIcon={getMetricIcon}
                getBadgeIcon={getBadgeIcon}
                getBadgeText={getBadgeText}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="likes" className="m-0">
            <div className="p-4">
              <LeaderboardList 
                members={sortedMembers}
                leaderboardType={leaderboardType}
                getValue={getValue}
                maxValue={maxValue}
                getMetricIcon={getMetricIcon}
                getBadgeIcon={getBadgeIcon}
                getBadgeText={getBadgeText}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="comments" className="m-0">
            <div className="p-4">
              <LeaderboardList 
                members={sortedMembers}
                leaderboardType={leaderboardType}
                getValue={getValue}
                maxValue={maxValue}
                getMetricIcon={getMetricIcon}
                getBadgeIcon={getBadgeIcon}
                getBadgeText={getBadgeText}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="streaks" className="m-0">
            <div className="p-4">
              <LeaderboardList 
                members={sortedMembers}
                leaderboardType={leaderboardType}
                getValue={getValue}
                maxValue={maxValue}
                getMetricIcon={getMetricIcon}
                getBadgeIcon={getBadgeIcon}
                getBadgeText={getBadgeText}
              />
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
      
      {/* Your Achievements */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-gradient-to-br from-[#E0F2F1] to-[#B2DFDB] rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)] p-6"
      >
        <h3 className="text-lg font-medium text-[#37474F] mb-4">Your Achievements</h3>
        
        <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4">
          <div className="flex flex-col md:flex-row items-center gap-6 mb-4">
            <div className="h-16 w-16 bg-[#F5FAFA] rounded-full flex items-center justify-center">
              <Trophy className="h-8 w-8 text-[#26A69A]" />
            </div>
            
            <div className="flex-grow text-center md:text-left">
              <h4 className="font-medium text-[#37474F] mb-1">Your Ranking: #2</h4>
              <p className="text-[#78909C] text-sm mb-2">
                You're in the top 20% of members in this space. Keep it up!
              </p>
              
              <div className="relative pt-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-medium text-[#26A69A]">
                    980 pts - Next rank: 1250 pts
                  </div>
                  <div className="text-xs font-medium text-[#26A69A]">
                    78%
                  </div>
                </div>
                <Progress 
                  value={78} 
                  className="h-2 rounded-full shadow-sm bg-[#F5FAFA] [&>*]:bg-[#26A69A]" 
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-[#F5FAFA] rounded-lg p-3 flex items-center">
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center mr-3">
                <Activity className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="text-xs text-[#78909C]">Current Streak</div>
                <div className="text-lg font-medium text-[#37474F]">15 days</div>
              </div>
            </div>
            <div className="bg-[#F5FAFA] rounded-lg p-3 flex items-center">
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center mr-3">
                <MessageSquare className="h-5 w-5 text-[#26A69A]" />
              </div>
              <div>
                <div className="text-xs text-[#78909C]">Posts & Comments</div>
                <div className="text-lg font-medium text-[#37474F]">40</div>
              </div>
            </div>
            <div className="bg-[#F5FAFA] rounded-lg p-3 flex items-center">
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center mr-3">
                <ThumbsUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-xs text-[#78909C]">Reactions Received</div>
                <div className="text-lg font-medium text-[#37474F]">36</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Component for Leaderboard List
interface LeaderboardListProps {
  members: typeof mockMembers;
  leaderboardType: string;
  getValue: (member: typeof mockMembers[0]) => number;
  maxValue: number;
  getMetricIcon: () => JSX.Element;
  getBadgeIcon: (badge: string) => JSX.Element;
  getBadgeText: (badge: string) => string;
}

function LeaderboardList({ 
  members, 
  leaderboardType, 
  getValue, 
  maxValue,
  getMetricIcon,
  getBadgeIcon,
  getBadgeText
}: LeaderboardListProps) {
  return (
    <div className="space-y-3">
      {members.map((member, index) => {
        const value = getValue(member);
        const percentage = (value / maxValue) * 100;
        
        return (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={`p-4 rounded-lg ${
              index === 0 ? 'bg-amber-50 border border-amber-200' :
              index === 1 ? 'bg-slate-50 border border-slate-200' :
              index === 2 ? 'bg-amber-50/50 border border-amber-100' :
              'bg-[#F5FAFA] border border-[#E0F2F1]'
            }`}
          >
            <div className="flex items-center mb-3">
              {/* Rank */}
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mr-3 text-sm font-bold ${
                index === 0 ? 'bg-amber-500 text-white' :
                index === 1 ? 'bg-slate-400 text-white' :
                index === 2 ? 'bg-amber-400 text-white' :
                'bg-[#E0F2F1] text-[#26A69A]'
              }`}>
                {index + 1}
              </div>
              
              {/* Member info */}
              <div className="flex items-center flex-grow">
                <Avatar className="h-8 w-8 rounded-full mr-3">
                  <AvatarImage src={member.avatar || undefined} />
                  <AvatarFallback className="bg-[#26A69A] text-white">
                    {member.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-[#37474F]">
                    {member.name}
                    {member.name === 'You' && <span className="text-[#78909C] text-xs ml-1">(You)</span>}
                  </div>
                </div>
              </div>
              
              {/* Value */}
              <div className="flex items-center gap-1 ml-auto">
                {getMetricIcon()}
                <div className="font-medium text-[#37474F]">{value}</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <Progress 
              value={percentage} 
              className="h-2 rounded-full shadow-sm bg-[#F5FAFA] [&>*]:bg-[#26A69A]" 
            />
            
            {/* Badges */}
            {member.badges.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {member.badges.map((badge, badgeIndex) => (
                  <div 
                    key={`${member.id}-${badge}-${badgeIndex}`}
                    className="flex items-center px-2 py-1 bg-white rounded-full border border-[#E0F2F1] text-xs"
                  >
                    {getBadgeIcon(badge)}
                    <span className="ml-1 text-[#37474F]">{getBadgeText(badge)}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
} 