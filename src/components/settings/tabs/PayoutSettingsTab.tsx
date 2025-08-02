import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PayoutSettingsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Payout Settings</h2>
        <p className="text-gray-600">Configure payment methods and payout preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Manage your payout methods</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Payout settings coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}