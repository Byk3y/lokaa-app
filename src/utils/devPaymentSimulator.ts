/**
 * Development Payment Simulator
 * 
 * This utility allows testing paid features without implementing actual payment processing.
 * Use this to simulate different subscription states for development and testing.
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface PaymentSimulationOptions {
  userId: string;
  spaceId: string;
  action: 'grant_paid_access' | 'revoke_access' | 'start_trial' | 'expire_trial' | 'cancel_subscription';
  trialDays?: number;
}

export class DevPaymentSimulator {
  private static isDevMode(): boolean {
    return import.meta.env.DEV || import.meta.env.VITE_NODE_ENV === 'development';
  }

  /**
   * Invalidate membership-related cache for better testing
   */
  private static invalidateMembershipCache(spaceId: string): void {
    // Clear any cached membership data from localStorage
    const keysToRemove = Object.keys(localStorage).filter(key => 
      key.includes(spaceId) || key.includes('membership') || key.includes('space_member')
    );
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear session storage as well
    const sessionKeysToRemove = Object.keys(sessionStorage).filter(key => 
      key.includes(spaceId) || key.includes('membership') || key.includes('space_member')
    );
    sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
  }

  /**
   * Grant paid access to a user for testing
   */
  static async grantPaidAccess(userId: string, spaceId: string): Promise<boolean> {
    if (!this.isDevMode()) {
      console.warn('Payment simulator only available in development mode');
      return false;
    }

    try {
      // Check if user already has membership
      const { data: existingMembership } = await getSupabaseClient()
        .from('space_members')
        .select('id, status')
        .eq('user_id', userId)
        .eq('space_id', spaceId)
        .maybeSingle();

      if (existingMembership) {
        // Update existing membership to active
        const { error } = await getSupabaseClient()
          .from('space_members')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMembership.id);

        if (error) throw error;
      } else {
        // Create new membership
        const { error } = await getSupabaseClient()
          .from('space_members')
          .insert({
            user_id: userId,
            space_id: spaceId,
            role: 'member',
            status: 'active'
          });

        if (error) throw error;
      }

      // Clear cache and reload for immediate effect
      this.invalidateMembershipCache(spaceId);

      toast({
        title: "🧪 Dev Mode: Paid Access Granted",
        description: "User now has active paid membership. Page will reload to reflect changes.",
      });

      // Reload page to ensure membership is properly recognized
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      return true;
    } catch (error) {
      console.error('Error granting paid access:', error);
      toast({
        title: "Error",
        description: "Failed to grant paid access",
        variant: "destructive"
      });
      return false;
    }
  }

  /**
   * Simulate trial access (with expiration date)
   */
  static async startTrial(userId: string, spaceId: string, trialDays: number = 7): Promise<boolean> {
    if (!this.isDevMode()) {
      console.warn('Payment simulator only available in development mode');
      return false;
    }

    try {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + trialDays);

      // For trial simulation, we'll use the metadata field or create a custom table
      // For now, let's just grant active access and log the trial info
      const result = await this.grantPaidAccess(userId, spaceId);
      
      if (result) {
        // Store trial info in localStorage for development
        const trialInfo = {
          userId,
          spaceId,
          startDate: new Date().toISOString(),
          endDate: trialEnd.toISOString(),
          type: 'trial'
        };
        
        localStorage.setItem(`trial_${spaceId}_${userId}`, JSON.stringify(trialInfo));
        
        toast({
          title: "🧪 Dev Mode: Trial Started",
          description: `${trialDays}-day trial activated for testing`,
        });
      }

      return result;
    } catch (error) {
      console.error('Error starting trial:', error);
      return false;
    }
  }

  /**
   * Simulate subscription cancellation
   */
  static async cancelSubscription(userId: string, spaceId: string): Promise<boolean> {
    if (!this.isDevMode()) {
      console.warn('Payment simulator only available in development mode');
      return false;
    }

    try {
      const { error } = await getSupabaseClient()
        .from('space_members')
        .update({ 
          status: 'cancelling',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('space_id', spaceId);

      if (error) throw error;

      // Clear cache for immediate effect
      this.invalidateMembershipCache(spaceId);

      toast({
        title: "🧪 Dev Mode: Subscription Cancelled",
        description: "Membership set to 'cancelling' status. Page will reload to reflect changes.",
      });

      // Reload page to ensure status change is recognized
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      return true;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return false;
    }
  }

  /**
   * Simulate expired/churned subscription
   */
  static async expireSubscription(userId: string, spaceId: string): Promise<boolean> {
    if (!this.isDevMode()) {
      console.warn('Payment simulator only available in development mode');
      return false;
    }

    try {
      const { error } = await getSupabaseClient()
        .from('space_members')
        .update({ 
          status: 'churned',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('space_id', spaceId);

      if (error) throw error;

      // Remove trial info if exists
      localStorage.removeItem(`trial_${spaceId}_${userId}`);

      // Clear cache for immediate effect
      this.invalidateMembershipCache(spaceId);

      toast({
        title: "🧪 Dev Mode: Subscription Expired",
        description: "Membership set to 'churned' status. Page will reload to reflect changes.",
      });

      // Reload page to ensure status change is recognized
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      return true;
    } catch (error) {
      console.error('Error expiring subscription:', error);
      return false;
    }
  }

  /**
   * Completely revoke access
   */
  static async revokeAccess(userId: string, spaceId: string): Promise<boolean> {
    if (!this.isDevMode()) {
      console.warn('Payment simulator only available in development mode');
      return false;
    }

    try {
      const { error } = await getSupabaseClient()
        .from('space_members')
        .delete()
        .eq('user_id', userId)
        .eq('space_id', spaceId);

      if (error) throw error;

      // Remove trial info if exists
      localStorage.removeItem(`trial_${spaceId}_${userId}`);

      // Clear any membership-related cache
      this.invalidateMembershipCache(spaceId);

      toast({
        title: "🧪 Dev Mode: Access Revoked",
        description: "User membership removed. Page will reload to reflect changes.",
      });

      // In dev mode, reload the page to ensure all caches are cleared
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      return true;
    } catch (error) {
      console.error('Error revoking access:', error);
      return false;
    }
  }

  /**
   * Get current trial status
   */
  static getTrialStatus(userId: string, spaceId: string): {
    isInTrial: boolean;
    daysRemaining?: number;
    endDate?: string;
  } {
    const trialInfo = localStorage.getItem(`trial_${spaceId}_${userId}`);
    
    if (!trialInfo) {
      return { isInTrial: false };
    }

    try {
      const trial = JSON.parse(trialInfo);
      const now = new Date();
      const endDate = new Date(trial.endDate);
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        isInTrial: daysRemaining > 0,
        daysRemaining: Math.max(0, daysRemaining),
        endDate: trial.endDate
      };
    } catch {
      return { isInTrial: false };
    }
  }

  /**
   * Reset all simulation data for a space
   */
  static async resetSpaceSimulation(spaceId: string): Promise<void> {
    if (!this.isDevMode()) {
      console.warn('Payment simulator only available in development mode');
      return;
    }

    // Clear all trial data for this space
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`trial_${spaceId}_`)) {
        localStorage.removeItem(key);
      }
    });

    // Clear membership cache
    this.invalidateMembershipCache(spaceId);

    toast({
      title: "🧪 Dev Mode: Simulation Reset",
      description: "All payment simulation data cleared for this space. Page will reload.",
    });

    // Reload to ensure clean state
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
}

// Export convenience functions for easy use in components
export const {
  grantPaidAccess,
  startTrial,
  cancelSubscription,
  expireSubscription,
  revokeAccess,
  getTrialStatus,
  resetSpaceSimulation
} = DevPaymentSimulator; 