# Testing Paid Features - Development Guide

This guide explains how to test paid features in development mode without implementing actual payment processing.

## Overview

The app has a comprehensive paid space system with:
- **Pricing Configuration**: Spaces can be set as `free` or `paid` with monthly pricing
- **Access Control**: Membership verification through `space_members` table
- **Trial System**: 7-day trial feature for paid spaces
- **Development Tools**: Utilities to simulate payment states

## Testing Tools

### 1. Payment Testing Panel (Development Only)

A floating control panel that appears in development mode:

**Features:**
- Grant/revoke paid access
- Start/manage trials
- Cancel/expire subscriptions
- Test different membership states

**How to Access:**
1. Navigate to any space in development mode
2. Look for "Payment Testing" button in bottom-right corner
3. Click to open the control panel

### 2. Payment Simulator (Code)

Programmatic utilities for testing:

```typescript
import { DevPaymentSimulator } from '@/utils/devPaymentSimulator';

// Grant paid access
await DevPaymentSimulator.grantPaidAccess(userId, spaceId);

// Start trial
await DevPaymentSimulator.startTrial(userId, spaceId, 7);

// Cancel subscription
await DevPaymentSimulator.cancelSubscription(userId, spaceId);

// Expire subscription
await DevPaymentSimulator.expireSubscription(userId, spaceId);

// Check trial status
const status = DevPaymentSimulator.getTrialStatus(userId, spaceId);
```

## Testing Scenarios

### Scenario 1: Create and Test a Paid Space

1. **Create a Paid Space:**
   ```bash
   1. Go to space creation flow
   2. Set pricing_type = 'paid'
   3. Set price_per_month = 10.00
   4. Save the space
   ```

2. **Test Access Denial:**
   ```bash
   1. Log out and create a new test user
   2. Try to access the paid space
   3. Should see access denied or paywall
   ```

3. **Grant Access via Testing Panel:**
   ```bash
   1. Open Payment Testing Panel
   2. Enter target user ID
   3. Click "Grant Access"
   4. User should now have access
   ```

### Scenario 2: Trial System Testing

1. **Enable Trials:**
   ```bash
   1. Go to space settings → Pricing
   2. Enable "7-day trial" feature
   3. Save settings
   ```

2. **Test Trial Flow:**
   ```bash
   1. Use testing panel to start trial
   2. Verify user gets temporary access
   3. Check trial status and days remaining
   4. Test trial expiration
   ```

### Scenario 3: Subscription State Testing

Test different membership states:

```bash
# Active subscription
- Use "Grant Access" → status: 'active'

# Cancelling subscription
- Use "Cancel Sub" → status: 'cancelling'

# Expired subscription
- Use "Expire Sub" → status: 'churned'

# No access
- Use "Revoke Access" → removes membership record
```

### Scenario 4: Space Settings Testing

1. **Pricing Configuration:**
   ```bash
   1. Go to Space Settings → Pricing
   2. Toggle between free/paid
   3. Set different price points
   4. Test with/without trials
   ```

2. **Access Control:**
   ```bash
   1. Test existing members when switching to paid
   2. Verify new members need payment
   3. Test owner/admin access
   ```

## Database States

### Member Status Values
- `active`: Full access to paid content
- `cancelling`: Access but subscription will end
- `churned`: Subscription expired, no access
- `banned`: Blocked from space

### Testing Member States

```sql
-- Check current member status
SELECT user_id, space_id, role, status, created_at 
FROM space_members 
WHERE space_id = 'your-space-id';

-- Manually update status for testing
UPDATE space_members 
SET status = 'cancelling' 
WHERE user_id = 'user-id' AND space_id = 'space-id';
```

## API Endpoints for Testing

### Space Access Verification
```typescript
// Check if user has access to space
const { data, error } = await supabase
  .from('space_members')
  .select('*')
  .eq('user_id', userId)
  .eq('space_id', spaceId)
  .eq('status', 'active')
  .maybeSingle();
```

### Membership Management
```typescript
// Grant membership
const { error } = await supabase
  .from('space_members')
  .insert({
    user_id: userId,
    space_id: spaceId,
    role: 'member',
    status: 'active'
  });

// Update subscription status
const { error } = await supabase
  .from('space_members')
  .update({ status: 'cancelling' })
  .eq('user_id', userId)
  .eq('space_id', spaceId);
```

## Paywall Component Testing

The `PaywallModal` component shows when users access paid content:

```typescript
import { usePaywall } from '@/components/payment/PaywallModal';

function MyComponent() {
  const { showPaywall, PaywallComponent } = usePaywall();
  
  const handlePaidFeatureClick = () => {
    if (!userHasPaidAccess) {
      showPaywall({
        spaceId: 'space-id',
        spaceName: 'My Space',
        pricePerMonth: 10,
        hasTrialEnabled: true,
        trialDays: 7
      });
    }
  };
  
  return (
    <>
      <button onClick={handlePaidFeatureClick}>
        Access Premium Feature
      </button>
      {PaywallComponent}
    </>
  );
}
```

## What Works vs What Doesn't

### ✅ What Works (Testable)
- Space pricing configuration
- Access control and verification
- Trial period simulation
- Member status management
- Paywall UI components
- Development testing tools

### ❌ What Needs Payment Integration
- Actual payment processing
- Stripe/payment gateway integration
- Real subscription billing
- Automatic trial expiration
- Payment webhooks
- Subscription management

## Future Payment Integration

When ready to implement real payments:

1. **Choose Payment Provider** (Stripe recommended)
2. **Add Payment Tables** to database
3. **Implement Webhooks** for subscription events
4. **Replace Simulator** with real payment calls
5. **Add Billing Dashboard** for users
6. **Implement Subscription Management**

## Troubleshooting

### Common Issues

1. **Testing Panel Not Showing:**
   - Ensure you're in development mode
   - Check `import.meta.env.DEV` is true

2. **Access Not Working After Grant:**
   - Check membership context refresh
   - Verify space ID matches
   - Clear browser cache if needed

3. **Database Permissions:**
   - Ensure RLS policies allow testing operations
   - Check user has proper permissions

### Debug Tools

```typescript
// Check current user membership
console.log('User membership:', await getCurrentUserMembership(spaceId));

// Verify space pricing
console.log('Space pricing:', space.pricing_type, space.price_per_month);

// Check trial status
console.log('Trial status:', DevPaymentSimulator.getTrialStatus(userId, spaceId));
```

## Next Steps

1. Test all scenarios above
2. Document any bugs or issues found
3. Prepare payment integration requirements
4. Plan subscription management features
5. Design billing dashboard UI 