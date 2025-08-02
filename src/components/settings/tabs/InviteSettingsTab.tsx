import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function InviteSettingsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Invite Settings</h2>
        <p className="text-gray-600">Manage member invitations and join settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite Options</CardTitle>
          <CardDescription>Configure how people can join your space</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Invite settings coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}