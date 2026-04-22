import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkEdgeRateLimit } from '../_shared/ratelimit.ts'

// send-welcome-email
//
// Two call paths:
//   1. DB trigger (20250101000000_welcome_email_trigger.sql) fires after a
//      user confirms their email, passing type='welcome' with a
//      service_role Bearer token.
//   2. Client-initiated resend of the verification code, type='verification'
//      with a user-scoped JWT.
//
// Hardening notes for the rest of this file:
//   - verify_jwt=true is set at the platform level so unauthenticated
//     internet traffic is already blocked. We ALSO decode the JWT ourselves
//     and require role=authenticated|service_role — belt-and-braces and
//     self-documenting for anyone reading the function in isolation.
//   - Payload shape is validated before any outbound I/O so malformed
//     requests don't burn Resend quota.
//   - Rate limit at 5 sends per user-or-ip per hour. Service_role calls
//     (from the DB trigger) bypass the limit since they're server-originated
//     and gated by idempotency on welcome_email_sent_at.
//   - Generic error responses; internal messages go to the platform logs.

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function decodeJwtRole(authHeader: string | null): 'anon' | 'authenticated' | 'service_role' | null {
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(padded + '='.repeat((4 - padded.length % 4) % 4))
    const claims = JSON.parse(json)
    return (claims?.role as 'anon' | 'authenticated' | 'service_role' | undefined) ?? null
  } catch {
    return null
  }
}

function validatePayload(body: unknown): { ok: true; data: EmailRequest } | { ok: false; reason: string } {
  if (!body || typeof body !== 'object') return { ok: false, reason: 'invalid_body' }
  const b = body as Record<string, unknown>
  const type = b.type
  const to = b.to
  const firstName = b.firstName
  const confirmationUrl = b.confirmationUrl
  if (type !== 'welcome' && type !== 'verification') return { ok: false, reason: 'invalid_type' }
  if (typeof to !== 'string' || to.length > 254 || !EMAIL_REGEX.test(to)) {
    return { ok: false, reason: 'invalid_recipient' }
  }
  if (firstName !== undefined && (typeof firstName !== 'string' || firstName.length > 80)) {
    return { ok: false, reason: 'invalid_first_name' }
  }
  if (type === 'verification') {
    if (typeof confirmationUrl !== 'string' || confirmationUrl.length > 2000) {
      return { ok: false, reason: 'invalid_confirmation_url' }
    }
    try {
      new URL(confirmationUrl)
    } catch {
      return { ok: false, reason: 'invalid_confirmation_url' }
    }
  }
  return {
    ok: true,
    data: {
      type,
      to,
      firstName: typeof firstName === 'string' ? firstName : undefined,
      confirmationUrl: typeof confirmationUrl === 'string' ? confirmationUrl : undefined,
    },
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const role = decodeJwtRole(req.headers.get('Authorization'))
  if (role !== 'authenticated' && role !== 'service_role') {
    return new Response(JSON.stringify({ success: false, error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let parsed: unknown
  try {
    parsed = await req.json()
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const validation = validatePayload(parsed)
  if (!validation.ok) {
    return new Response(JSON.stringify({ success: false, error: validation.reason }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const { type, to, firstName, confirmationUrl } = validation.data

  try {
    const resendApiKeyRaw = Deno.env.get('RESEND_API_KEY')
    const resendApiKey = (resendApiKeyRaw || '').trim()
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured')
      return new Response(JSON.stringify({ success: false, error: 'service_unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!/^re_[A-Za-z0-9_-]+$/.test(resendApiKey)) {
      console.error('RESEND_API_KEY appears malformed (bad prefix or chars)')
      return new Response(JSON.stringify({ success: false, error: 'service_unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const fromEmail = Deno.env.get('FROM_EMAIL') || 'Lokaa <noreply@lokaa.app>'
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const admin = (supabaseUrl && serviceRoleKey)
      ? createClient(supabaseUrl, serviceRoleKey)
      : null

    // Rate limit user-initiated calls only. Service-role (DB trigger) is
    // already gated by the one-row-per-user welcome_email_sent_at idempotency.
    if (role === 'authenticated' && admin) {
      const ipKey = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || 'unknown'
      const rl = await checkEdgeRateLimit(admin, {
        endpoint: 'send-welcome-email',
        bucketKey: `to:${to}|ip:${ipKey}`,
        limit: 5,
        windowSeconds: 3600,
      })
      if (!rl.allowed) {
        return new Response(JSON.stringify({ success: false, error: 'rate_limited', retryAfterSeconds: rl.retryAfterSeconds }), {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rl.retryAfterSeconds),
          },
        })
      }
    }

    let subject: string
    let html: string
    let text: string
    const entityRefId = crypto.randomUUID()

    if (type === 'welcome') {
      subject = 'Welcome to Lokaa! 🎉'
      html = getWelcomeEmailTemplate(firstName || 'there', entityRefId)
      text = getWelcomeEmailText(firstName || 'there')
    } else {
      subject = 'Verify your Lokaa account'
      html = getVerificationEmailTemplate(confirmationUrl!, firstName, entityRefId)
      text = getVerificationEmailText(confirmationUrl!, firstName)
    }

    // Welcome-email idempotency: skip if welcome_email_sent_at is set.
    let userId: string | undefined
    if (type === 'welcome' && admin) {
      try {
        const { data: userData } = await admin.auth.admin.getUserByEmail(to)
        userId = userData?.user?.id
        if (userId) {
          const { data: userRecord, error: userError } = await admin
            .from('users')
            .select('welcome_email_sent_at')
            .eq('id', userId)
            .single()
          if (!userError && userRecord?.welcome_email_sent_at) {
            return new Response(JSON.stringify({ success: true, alreadySent: true }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }
        }
      } catch (err) {
        console.error('welcome_email_idempotency_check_failed', err)
        // Fall through — better to risk a rare duplicate than to never send.
      }
    }

    const audienceId = Deno.env.get('RESEND_AUDIENCE_ID')
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
          }),
        })
      } catch {
        // best-effort; audience errors shouldn't block the send
      }
    }

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
        },
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error('resend_api_error', res.status, detail)
      return new Response(JSON.stringify({ success: false, error: 'send_failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json()

    if (type === 'welcome' && admin && userId) {
      try {
        await admin
          .from('users')
          .update({ welcome_email_sent_at: new Date().toISOString() })
          .eq('id', userId)
      } catch (err) {
        console.error('mark_welcome_email_sent_failed', err)
        // Don't fail the request — email already went out.
      }
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (err) {
    console.error('send_welcome_email_unexpected', err)
    return new Response(
      JSON.stringify({ success: false, error: 'internal_error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

function getWelcomeEmailTemplate(firstName: string, entityRefId: string): string {
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
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px; font-size: 14px;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;visibility:hidden;">${firstName ? `${firstName}, ` : ''}you're ready to explore spaces, learn, and connect on Lokaa. · ${entityRefId}</div>
        <div style="margin: 6px 0 16px;">
          <div style="font-size:30px; font-weight:900; letter-spacing:0.2px; color:#059669; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Lokaa</div>
        </div>
        <div style="margin: 0 0 12px; font-size:18px; font-weight:600; color:#111827;">Welcome to Lokaa!</div>
        <div style="margin: 0 0 12px; font-size:13px; color:#6b7280;">You're ready to explore spaces, learn, and connect.</div>

        <div style="background: #f8fafc; padding: 24px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 12px; color: #111827;">Hi ${firstName},</p>

          <p>Welcome to Lokaa — where knowledge meets community. 🚀</p>

          <p>You're now part of a growing network of creators and learners building spaces that matter. Here's what you can do inside Lokaa:</p>

          <ul style="padding-left: 20px; margin: 0 0 12px;">
            <li>✨ Start or join a Space — find your people.</li>
            <li>📚 Share & learn together — from real experiences, not just theory.</li>
            <li>🤝 Connect with others — collaborate, grow, and build something bigger.</li>
          </ul>

          <p style="margin: 0 0 16px;">This is just the beginning. Your journey starts today.</p>

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

function getVerificationEmailTemplate(confirmationUrl: string, firstName: string | undefined, entityRefId: string): string {
  const appDomain = Deno.env.get('APP_DOMAIN') || 'https://lokaa.app'
  const year = new Date().getFullYear()

  const urlParams = new URL(confirmationUrl).searchParams
  const token = urlParams.get('token') || '123456'

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your Lokaa account</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px; font-size: 14px;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;visibility:hidden;">${firstName ? `${firstName}, ` : ''}enter code ${token} to verify your Lokaa account. · ${entityRefId}</div>
        <div style="margin: 6px 0 16px;">
          <div style="font-size:30px; font-weight:900; letter-spacing:0.2px; color:#059669; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Lokaa</div>
        </div>
        <div style="margin: 0 0 20px; font-size:20px; font-weight:600; color:#111827;">Verify your account</div>

        <div style="background: #f8fafc; padding: 24px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 12px; color: #111827;">${firstName ? `Hi ${firstName},` : 'Hello,'}</p>

          <p>Thanks for signing up for Lokaa! Please verify your email address using the 6-digit code below:</p>

          <div style="text-align: center; margin: 30px 0; padding: 20px; background: white; border-radius: 8px; border: 2px solid #059669;">
            <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
            <div style="font-size: 32px; font-weight: 700; color: #059669; letter-spacing: 4px; font-family: 'Courier New', monospace;">${token}</div>
            <p style="margin: 8px 0 0; color: #6b7280; font-size: 12px;">Enter this code on the verification page</p>
          </div>

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

  const urlParams = new URL(confirmationUrl).searchParams
  const token = urlParams.get('token') || '123456'

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
