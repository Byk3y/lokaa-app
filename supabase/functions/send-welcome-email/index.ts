import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  type: 'welcome' | 'verification';
  to: string;
  firstName?: string;
  confirmationUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, to, firstName, confirmationUrl }: EmailRequest = await req.json()

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const fromEmail = Deno.env.get('FROM_EMAIL') || 'Lokaa <onboarding@resend.dev>'
    
    let subject: string
    let html: string

    if (type === 'welcome') {
      subject = 'Welcome to Lokaa! 🎉'
      html = getWelcomeEmailTemplate(firstName || 'there')
    } else if (type === 'verification') {
      subject = 'Verify your Lokaa account'
      html = getVerificationEmailTemplate(confirmationUrl!, firstName)
    } else {
      throw new Error('Invalid email type')
    }

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
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Resend API error: ${error}`)
    }

    const data = await res.json()

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

function getWelcomeEmailTemplate(firstName: string): string {
  const appDomain = Deno.env.get('APP_DOMAIN') || 'https://lokaa-app.vercel.app'
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Lokaa</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #059669; margin: 0;">Welcome to Lokaa! 🎉</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #374151;">Hi ${firstName}!</h2>
          
          <p>Thank you for joining Lokaa, the platform where knowledge meets community.</p>
          
          <p>You're now part of a growing community of learners and educators. Here's what you can do:</p>
          
          <ul style="padding-left: 20px;">
            <li>🎓 Create and share courses</li>
            <li>🤝 Join learning communities</li>
            <li>📚 Access high-quality content</li>
            <li>💬 Connect with other learners</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appDomain}" 
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Start Learning
            </a>
          </div>
        </div>
        
        <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px;">
          <p>Questions? Reply to this email or visit our <a href="${appDomain}/help" style="color: #059669;">help center</a>.</p>
          <p>© 2024 Lokaa. All rights reserved.</p>
        </div>
      </body>
    </html>
  `
}

function getVerificationEmailTemplate(confirmationUrl: string, firstName?: string): string {
  const appDomain = Deno.env.get('APP_DOMAIN') || 'https://lokaa-app.vercel.app'
  
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
          <p>Questions? Reply to this email or visit our <a href="${appDomain}/help" style="color: #059669;">help center</a>.</p>
          <p>© 2024 Lokaa. All rights reserved.</p>
        </div>
      </body>
    </html>
  `
}