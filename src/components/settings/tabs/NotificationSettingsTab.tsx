import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function NotificationSettingsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Notification Settings</h2>
        <p className="text-gray-600">Manage how and when you receive notifications for this space.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Choose which email notifications you want to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="new-posts">New posts in space</Label>
            <Switch id="new-posts" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="new-comments">Comments on your posts</Label>
            <Switch id="new-comments" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="mentions">When you're mentioned</Label>
            <Switch id="mentions" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>Get notified instantly on your devices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="push-posts">New posts</Label>
            <Switch id="push-posts" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="push-comments">New comments</Label>
            <Switch id="push-comments" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>Save Preferences</Button>
      </div>
    </div>
  );
}