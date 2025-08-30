import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  type: 'verification';
  to: string;
  firstName?: string;
  confirmationUrl?: string;
  userId?: string; // Added for analytics tracking
  variant?: string; // Added for A/B testing
}

interface EmailAnalytics {
  userId: string;
  emailType: string;
  variant?: string;
  sentAt: string;
  delivered: boolean;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, to, firstName, confirmationUrl, userId, variant }: EmailRequest = await req.json()

    // Read and sanitize Resend API key (trim to avoid hidden whitespace/newlines)
    const resendApiKeyRaw = Deno.env.get('RESEND_API_KEY')
    const resendApiKey = (resendApiKeyRaw || '').trim()
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured')
    }
    // Basic format validation to surface copy/paste issues early
    // Allow common key characters; Resend keys are typically alphanumeric, but be tolerant of dashes/underscores
    if (!/^re_[A-Za-z0-9_-]+$/.test(resendApiKey)) {
      throw new Error('RESEND_API_KEY appears malformed. Ensure it starts with "re_" and contains no quotes or spaces.')
    }

    const fromEmail = Deno.env.get('FROM_EMAIL') || 'Lokaa <noreply@lokaa.app>'
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const admin = (supabaseUrl && serviceRoleKey)
      ? createClient(supabaseUrl, serviceRoleKey)
      : null
    
    let subject: string
    let html: string
    let text: string
    const entityRefId = crypto.randomUUID()

    if (type === 'verification') {
      subject = 'Verify your Lokaa account'
      html = getVerificationEmailTemplate(confirmationUrl!, firstName, entityRefId)
      text = getVerificationEmailText(confirmationUrl!, firstName)
    } else {
      throw new Error('Invalid email type')
    }

    // TODO: Onboarding/lifecycle emails will be handled via database-driven triggers 
    // and scheduled edge functions, not client-side events

    // 1) Optionally create contact in Resend Audience (best-effort)
    const audienceId = Deno.env.get('RESEND_AUDIENCE_ID');
    if (audienceId) {
      try {
        await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            email: to,
            firstName: firstName || undefined,
            unsubscribed: false,
          })
        });
      } catch (_) {
        // ignore audience errors
      }
    }

    // 2) Send email using Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject,
        html,
        text,
        headers: {
          'X-Entity-Ref-ID': entityRefId,
          'X-Email-Type': type,
          'X-User-ID': userIdFromDb || '',
          'X-Variant': variant || ''
        }
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Resend API error: ${error}`)
    }

    const data = await res.json()

    // TODO: Onboarding/lifecycle emails will be handled via database-driven triggers 
    // and scheduled edge functions, not client-side events

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    // Record failed send in analytics if possible
    try {
      const { type, to, userId, variant }: EmailRequest = await req.json()
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const admin = (supabaseUrl && serviceRoleKey)
        ? createClient(supabaseUrl, serviceRoleKey)
        : null
        
      if (admin && userId) {
        await admin.from('email_analytics')
          .insert({
            user_id: userId,
            email_type: type,
            variant: variant || null,
            sent_at: new Date().toISOString(),
            delivered: false,
            error: error.message
          })
      }
    } catch (_) {
      // Ignore analytics errors
    }
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})



function getVerificationEmailTemplate(confirmationUrl: string, firstName: string | undefined, entityRefId: string): string {
  const appDomain = Deno.env.get('APP_DOMAIN') || 'https://lokaa.app'
  const year = new Date().getFullYear()
  
  // Extract the token from the confirmation URL for display
  const urlParams = new URL(confirmationUrl).searchParams
  const token = urlParams.get('token') || '123456' // Fallback for display purposes
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your Lokaa account</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px; font-size: 14px;">
        <!-- Preheader (hidden) -->
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;visibility:hidden;">${firstName ? `${firstName}, ` : ''}enter code ${token} to verify your Lokaa account. · ${entityRefId}</div>
        <!-- Header wordmark (top-left) -->
        <div style="margin: 6px 0 16px;">
          <div style="font-size:30px; font-weight:900; letter-spacing:0.2px; color:#059669; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Lokaa</div>
        </div>
        <!-- Title -->
        <div style="margin: 0 0 20px; font-size:20px; font-weight:600; color:#111827;">Verify your account</div>
        
        <div style="background: #f8fafc; padding: 24px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 12px; color: #111827;">${firstName ? `Hi ${firstName},` : 'Hello,'}</p>
          
          <p>Thanks for signing up for Lokaa! Please verify your email address using the 6-digit code below:</p>
          
          <!-- PRIMARY: Large, prominent verification code -->
          <div style="text-align: center; margin: 30px 0; padding: 20px; background: white; border-radius: 8px; border: 2px solid #059669;">
            <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
            <div style="font-size: 32px; font-weight: 700; color: #059669; letter-spacing: 4px; font-family: 'Courier New', monospace;">${token}</div>
            <p style="margin: 8px 0 0; color: #6b7280; font-size: 12px;">Enter this code on the verification page</p>
          </div>
          
          <!-- SECONDARY: Button as alternative method -->
          <div style="text-align: center; margin: 30px 0;">
            <p style="margin: 0 0 12px; color: #6b7280; font-size: 13px;">Or click the button below to verify automatically:</p>
            <a href="${confirmationUrl}" 
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 13px;">
            This verification code will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
          
          <p style="color: #6b7280; font-size: 13px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${confirmationUrl}" style="color: #059669; word-break: break-all; font-size: 12px;">${confirmationUrl}</a>
          </p>
        </div>
        
        <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px;">
          <p>Questions? Reply to this email or visit our <a href="${appDomain}/help" style="color: #059669;">help center</a>.</p>
          <p>© ${year} Lokaa. All rights reserved.</p>
        </div>
      </body>
    </html>
  `
}

function getVerificationEmailText(confirmationUrl: string, firstName?: string): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Hello,'
  const year = new Date().getFullYear()
  
  // Extract the token from the confirmation URL for display
  const urlParams = new URL(confirmationUrl).searchParams
  const token = urlParams.get('token') || '123456' // Fallback for display purposes
  
  return `Verify your Lokaa account

${greeting}

Thanks for signing up for Lokaa! Please verify your email address using the 6-digit code below:

VERIFICATION CODE: ${token}

Enter this code on the verification page to complete your signup.

Alternatively, you can click this link to verify automatically:
${confirmationUrl}

This verification code will expire in 24 hours. If you didn't create an account, ignore this email.

© ${year} Lokaa. All rights reserved.`
}
