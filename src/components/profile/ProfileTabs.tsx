
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
  return (
    <div className="flex-1 p-4">
      <Tabs defaultValue="about">
        <TabsList className="w-full flex justify-between bg-white">
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="spaces">Spaces {profileData.role === 'creator' ? '4' : ''}</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
        </TabsList>

        <TabsContent value="about">
          <ProfileAbout profileData={profileData} />
        </TabsContent>

        <TabsContent value="posts">
          <ProfilePosts userId={profileData.id} />
        </TabsContent>

        <TabsContent value="comments">
          <ProfileComments userId={profileData.id} />
        </TabsContent>

        <TabsContent value="spaces">
          <ProfileSpaces userId={profileData.id} isCreator={profileData.role === 'creator'} />
        </TabsContent>

        <TabsContent value="rewards">
          <ProfileRewards userId={profileData.id} activityScore={profileData.activity_score || 0} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
