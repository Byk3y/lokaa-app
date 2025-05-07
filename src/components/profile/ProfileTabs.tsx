import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileAbout from "./ProfileAbout";
import ProfilePosts from "./ProfilePosts";
import ProfileComments from "./ProfileComments";
import ProfileSpaces from "./ProfileSpaces";
import ProfileRewards from "./ProfileRewards";

interface ProfileTabsProps {
  profileData: any;
}

export default function ProfileTabs({ profileData }: ProfileTabsProps) {
  // Provide default values for potentially missing properties
  const userData = {
    ...profileData,
    activity_score: profileData.activity_score || 0,
    role: profileData.role || 'member'
  };

  return (
    <div className="flex-1 p-4">
      <Tabs defaultValue="about">
        <TabsList className="w-full flex justify-between bg-white">
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="spaces">Spaces {userData.role === 'creator' ? '4' : ''}</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
        </TabsList>

        <TabsContent value="about">
          <ProfileAbout profileData={userData} />
        </TabsContent>

        <TabsContent value="posts">
          <ProfilePosts userId={userData.id} />
        </TabsContent>

        <TabsContent value="comments">
          <ProfileComments userId={userData.id} />
        </TabsContent>

        <TabsContent value="spaces">
          <ProfileSpaces userId={userData.id} isCreator={userData.role === 'creator'} />
        </TabsContent>

        <TabsContent value="rewards">
          <ProfileRewards userId={userData.id} activityScore={userData.activity_score} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
