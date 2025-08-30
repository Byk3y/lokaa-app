import { EmailService } from '@/services/emailService';
import { log } from '@/utils/logger';

/**
 * Test Resend email service status
 * This can be called from the browser console to diagnose email issues
 */
export const testResendStatus = async () => {
  console.log('🔍 Testing Resend email service...');
  
  try {
    const result = await EmailService.testEmailService();
    
    console.log('📧 Resend Test Result:', result);
    
    if (result.success) {
      console.log('✅ Email service is working correctly');
    } else {
      console.log('❌ Email service issue:', result.error);
      
      if (result.details?.errorType === 'rate_limit') {
        console.log('🚨 DAILY EMAIL LIMIT REACHED! You need to wait until tomorrow or upgrade your Resend plan.');
        console.log('💡 To check your usage, visit: https://resend.com/emails');
      }
    }
    
    return result;
  } catch (error) {
    console.error('💥 Error testing email service:', error);
    return { success: false, error: String(error) };
  }
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).testResendStatus = testResendStatus;
  console.log('🔧 Email testing available: window.testResendStatus()');
}
