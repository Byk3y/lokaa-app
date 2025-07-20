# New Customer Ka-Ching Notifications Integration Guide

## 🎯 Overview

The notification system now supports **"ka-ching" notifications** for when new customers subscribe/pay for space access. This creates Skool-style revenue notifications for space owners and admins.

## 🔧 Current Implementation

### **✅ Ready Components:**
- **Notification Type**: `new_customer` added to `NotificationType`
- **Space Preferences**: `new_customers` preference (owner/admin only)
- **Trigger Function**: `NotificationTriggers.onNewCustomer()`
- **Service Method**: `NotificationService.createNewCustomerNotification()`
- **Space Preference Checking**: Respects user's `new_customers` notification setting

### **🎨 Notification Format:**
- **Title Examples**:
  - `"subscribed to Music Business for $29.99"`
  - `"subscribed to Nocode Devils (Pro Plan)"`  
  - `"joined Automation Studio"` (fallback)
- **Recipients**: Space owners and admins only
- **Sound**: Ready for ka-ching sound integration
- **Batching**: Not batched (each payment is individual revenue event)

## 💳 Payment Integration Examples

### **Stripe Integration**
```typescript
// In your Stripe webhook handler
import { NotificationTriggers } from '@/utils/notificationTriggers';

async function handleStripePayment(event: Stripe.Event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Get space info from session metadata
    const spaceId = session.metadata?.space_id;
    const customerId = session.customer as string;
    
    if (spaceId && customerId) {
      // Get space owners/admins
      const spaceOwners = await getSpaceOwners(spaceId);
      
      // Trigger ka-ching notification
      await NotificationTriggers.onNewCustomer({
        spaceId,
        spaceName: session.metadata?.space_name || 'Premium Space',
        customerId,
        spaceOwnerIds: spaceOwners.map(owner => owner.id),
        customerEmail: session.customer_details?.email,
        amount: (session.amount_total! / 100).toString(),
        currency: '$',
        planName: session.metadata?.plan_name
      });
    }
  }
}
```

### **Paddle Integration**
```typescript
// In your Paddle webhook handler
import { NotificationTriggers } from '@/utils/notificationTriggers';

async function handlePaddlePayment(webhook: PaddleWebhook) {
  if (webhook.event_type === 'subscription_created') {
    const subscription = webhook.subscription;
    
    // Get space info from custom data
    const spaceId = subscription.custom_data?.space_id;
    const customerId = subscription.user_id;
    
    if (spaceId && customerId) {
      const spaceOwners = await getSpaceOwners(spaceId);
      
      await NotificationTriggers.onNewCustomer({
        spaceId,
        spaceName: subscription.custom_data?.space_name || 'Premium Space',
        customerId,
        spaceOwnerIds: spaceOwners.map(owner => owner.id),
        customerEmail: subscription.customer_email,
        amount: subscription.unit_price,
        currency: subscription.currency,
        planName: subscription.plan_name
      });
    }
  }
}
```

### **Manual Payment Integration**
```typescript
// For manual payments or other payment systems
import { NotificationTriggers } from '@/utils/notificationTriggers';

async function recordManualPayment(paymentData: {
  spaceId: string;
  customerId: string;
  amount: string;
  currency: string;
  planName?: string;
}) {
  // Get space details
  const space = await getSpace(paymentData.spaceId);
  const spaceOwners = await getSpaceOwners(paymentData.spaceId);
  
  // Trigger ka-ching notification
  await NotificationTriggers.onNewCustomer({
    spaceId: paymentData.spaceId,
    spaceName: space.name,
    customerId: paymentData.customerId,
    spaceOwnerIds: spaceOwners.map(owner => owner.id),
    amount: paymentData.amount,
    currency: paymentData.currency,
    planName: paymentData.planName
  });
}
```

## 🔊 Sound Integration

### **Frontend Sound Implementation**
```typescript
// In your notification UI component
import { useNotifications } from '@/hooks/useNotifications';

export function NotificationCenter() {
  const { notifications } = useNotifications();
  
  useEffect(() => {
    // Play ka-ching sound for new customer notifications
    const newCustomerNotifications = notifications.filter(
      n => n.type === 'new_customer' && !n.read
    );
    
    if (newCustomerNotifications.length > 0) {
      playKaChingSound();
    }
  }, [notifications]);
  
  const playKaChingSound = () => {
    const audio = new Audio('/sounds/ka-ching.mp3');
    audio.play().catch(console.error);
  };
}
```

### **Push Notification with Sound**
```typescript
// In your push notification service
export async function sendNewCustomerPushNotification(notification: NotificationWithActor) {
  if (notification.type === 'new_customer') {
    await sendPushNotification({
      title: '💰 New Customer!',
      body: `${notification.actor.full_name} ${notification.title}`,
      sound: 'ka-ching.wav', // Custom sound file
      badge: 1,
      data: {
        type: 'new_customer',
        space_id: notification.space_id,
        amount: notification.content_preview // Contains payment amount
      }
    });
  }
}
```

## 🎛️ User Preferences

The notification respects the `new_customers` preference in space settings:

```typescript
// Users can disable new customer notifications per space
const spacePreferences = await useSpaceNotificationPreferences(spaceId);

// Only owners/admins see this preference option
if (userRole === 'owner' || userRole === 'admin') {
  await spacePreferences.updatePreference('new_customers', false);
}
```

## 🚀 Testing

### **Test the Implementation**
```typescript
// Test ka-ching notification
await NotificationTriggers.onNewCustomer({
  spaceId: 'your-space-id',
  spaceName: 'Test Space',
  customerId: 'test-customer-id',
  spaceOwnerIds: ['owner-id-1', 'admin-id-2'],
  customerEmail: 'customer@example.com',
  amount: '29.99',
  currency: '$',
  planName: 'Pro Plan'
});
```

### **Check Database**
```sql
-- Verify notification was created
SELECT * FROM notifications 
WHERE type = 'new_customer' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check space preferences
SELECT * FROM space_notification_preferences 
WHERE space_id = 'your-space-id' 
AND new_customers = true;
```

## 🔮 Future Enhancements

1. **Revenue Tracking**: Add total revenue metrics to notifications
2. **Monthly/Weekly Summaries**: Batch revenue notifications in digest emails
3. **Goal Celebrations**: Special notifications when revenue milestones are hit
4. **Refund Notifications**: Handle refund/cancellation notifications
5. **Analytics Integration**: Track conversion rates from notifications

The system is now ready for payment integration! Just implement the webhook handlers for your chosen payment processor and the ka-ching notifications will work automatically. 💰🔔