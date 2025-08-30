import { Resend } from 'resend';
import { log } from '@/utils/logger';

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export class EmailService {
  private static fromEmail = process.env.VITE_FROM_EMAIL || 'Lokaa <onboarding@resend.dev>';

  /**
   * Send email using Resend
   */
  static async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      if (!process.env.RESEND_API_KEY) {
        log.error('Service', 'RESEND_API_KEY not configured');
        return { success: false, error: 'Email service not configured' };
      }

      const { data, error } = await resend.emails.send({
        from: options.from || this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (error) {
        log.error('Service', 'Resend error:', error);
        return { success: false, error: error.message };
      }

      log.debug('Service', 'Email sent successfully:', data);
      return { success: true };
    } catch (error: any) {
      log.error('Service', 'Email service error:', error);
      return { success: false, error: error.message };
    }
  }

  // TODO: Onboarding/lifecycle emails will be handled via database-driven triggers 
  // and scheduled edge functions, not client-side events

  /**
   * Send email verification email
   */
  static async sendVerificationEmail(to: string, confirmationUrl: string, firstName?: string): Promise<{ success: boolean; error?: string }> {
    const html = this.getVerificationEmailTemplate(confirmationUrl, firstName);
    
    return this.sendEmail({
      to,
      subject: 'Verify your Lokaa account',
      html,
    });
  }



  /**
   * Email verification template
   */
  private static getVerificationEmailTemplate(confirmationUrl: string, firstName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your Lokaa account</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #059669; margin: 0;">Verify Your Account</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #374151;">
              ${firstName ? `Hi ${firstName}!` : 'Hello!'}
            </h2>
            
            <p>Thanks for signing up for Lokaa! Please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationUrl}" 
                 style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
            </p>
            
            <p style="color: #6b7280; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${confirmationUrl}" style="color: #059669; word-break: break-all;">${confirmationUrl}</a>
            </p>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px;">
            <p>Questions? Reply to this email or visit our <a href="${process.env.VITE_APP_DOMAIN}/help" style="color: #059669;">help center</a>.</p>
            <p>© 2024 Lokaa. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }
}