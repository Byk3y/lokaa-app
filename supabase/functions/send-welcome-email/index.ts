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

    if (type === 'welcome') {
      subject = 'Welcome to Lokaa! 🎉'
      html = getWelcomeEmailTemplate(firstName || 'there')
      text = getWelcomeEmailText(firstName || 'there')
    } else if (type === 'verification') {
      subject = 'Verify your Lokaa account'
      html = getVerificationEmailTemplate(confirmationUrl!, firstName)
      text = getVerificationEmailText(confirmationUrl!, firstName)
    } else {
      throw new Error('Invalid email type')
    }

    // 0) Idempotency for welcome: record in DB before sending
    let userId: string | null = null
    if (type === 'welcome' && admin) {
      try {
        // Look up user by email to get id
        const { data: u } = await admin
          .from('users')
          .select('id')
          .eq('email', to)
          .maybeSingle()
        userId = u?.id ?? null
        if (userId) {
          // Insert if not exists
          const { error: insErr } = await admin
            .from('email_sends')
            .insert({ user_id: userId, type: 'welcome' })
            .select('user_id')
            .maybeSingle()
          if (insErr && !`${insErr.message}`.includes('duplicate key')) {
            // Non-duplicate error; continue without blocking send
          }
          // If row exists already, return early; welcome already sent/queued
          if (insErr && `${insErr.message}`.includes('duplicate key')) {
            return new Response(JSON.stringify({ success: true, alreadySent: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
          }
        }
      } catch (_) {
        // proceed with best-effort
      }
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
        text,
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Resend API error: ${error}`)
    }

    const data = await res.json()

    // 3) Mark sent_at
    if (type === 'welcome' && admin && userId) {
      try {
        await admin.from('email_sends')
          .update({ sent_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('type', 'welcome')
      } catch (_) {}
    }

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
  const appDomain = Deno.env.get('APP_DOMAIN') || 'https://lokaa.app'
  const year = new Date().getFullYear()
  
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
          <h2 style="margin-top: 0; color: #374151;">Hi ${firstName},</h2>
          
          <p>Welcome to Lokaa — where knowledge meets community. 🚀</p>

          <p>You're now part of a growing network of creators and learners building spaces that matter. Here's what you can do inside Lokaa:</p>

          <ul style="padding-left: 20px;">
            <li>✨ Start or join a Space — find your people.</li>
            <li>📚 Share & learn together — from real experiences, not just theory.</li>
            <li>🤝 Connect with others — collaborate, grow, and build something bigger.</li>
          </ul>

          <p>This is just the beginning. Your journey starts today.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${appDomain}/discover" 
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Create or join a space
            </a>
          </div>
        </div>
        
        <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px;">
          <p>Questions? Reply to this email or visit our <a href="${appDomain}/help" style="color: #059669;">help center</a>.</p>
          <p>© ${year} Lokaa. All rights reserved.</p>
        </div>
      </body>
    </html>
  `
}

function getWelcomeEmailText(firstName: string): string {
  const appDomain = Deno.env.get('APP_DOMAIN') || 'https://lokaa.app'
  const year = new Date().getFullYear()
  return `Welcome to Lokaa!\n\nHi ${firstName},\n\nWelcome to Lokaa — where knowledge meets community. 🚀\n\nYou're now part of a growing network of creators and learners building spaces that matter. Here's what you can do inside Lokaa:\n- Start or join a Space — find your people.\n- Share & learn together — from real experiences, not just theory.\n- Connect with others — collaborate, grow, and build something bigger.\n\nThis is just the beginning. Your journey starts today.\n\nCreate or join a space: ${appDomain}/discover\n\n© ${year} Lokaa. All rights reserved.`
}

function getVerificationEmailTemplate(confirmationUrl: string, firstName?: string): string {
  const appDomain = Deno.env.get('APP_DOMAIN') || 'https://lokaa.app'
  const year = new Date().getFullYear()
  
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
          <p>© ${year} Lokaa. All rights reserved.</p>
        </div>
      </body>
    </html>
  `
}

function getVerificationEmailText(confirmationUrl: string, firstName?: string): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Hello,'
  const year = new Date().getFullYear()
  return `Verify your Lokaa account\n\n${greeting}\n\nThanks for signing up for Lokaa! Please verify your email address by opening the link below:\n\n${confirmationUrl}\n\nThis link will expire in 24 hours. If you didn't create an account, ignore this email.\n\n© ${year} Lokaa. All rights reserved.`
}