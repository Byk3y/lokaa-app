import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);
const hookSecret = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") as string).replace("v1,whsec_", "");

// Email templates
const getVerificationEmailTemplate = (token: string, firstName: string, confirmationUrl: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - Lokaa</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Welcome to Lokaa!</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
            <p style="margin: 0 0 12px; color: #111827;">Hello, ${firstName || 'there'},</p>
            <p>Thanks for signing up for Lokaa! Please verify your email address using the 6-digit code below:</p>
            
            <!-- PRIMARY: Code as main action -->
            <div style="text-align: center; margin: 30px 0;">
                <div style="font-size: 32px; font-weight: 700; color: #059669; letter-spacing: 4px; font-family: 'Courier New', monospace;">${token}</div>
                <p style="margin: 8px 0 0; color: #6b7280; font-size: 12px;">Enter this code on the verification page</p>
            </div>
            
            <!-- SECONDARY: Button as alternative method -->
            <div style="text-align: center; margin: 30px 0;">
                <p style="margin: 0 0 12px; color: #6b7280; font-size: 13px;">Or click the button below to verify automatically:</p>
                <a href="${confirmationUrl}" style="display: inline-block; background-color: #059669; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Verify Email Address</a>
            </div>
            
            <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px;">
                If you didn't create an account with Lokaa, you can safely ignore this email.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">
                © 2024 Lokaa. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
`;

const getVerificationEmailText = (token: string, firstName: string, confirmationUrl: string) => `
Hello, ${firstName || 'there'},

Thanks for signing up for Lokaa! Please verify your email address using the 6-digit code below:

${token}

Enter this code on the verification page, or click the link below to verify automatically:

${confirmationUrl}

If you didn't create an account with Lokaa, you can safely ignore this email.

© 2024 Lokaa. All rights reserved.
`;

const getWelcomeEmailTemplate = (firstName: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Lokaa!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Welcome to Lokaa!</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
            <p style="margin: 0 0 12px; color: #111827;">Hello, ${firstName || 'there'},</p>
            <p>Welcome to Lokaa! Your account has been successfully created and verified.</p>
            
            <p>You can now:</p>
            <ul style="color: #374151;">
                <li>Create and join spaces</li>
                <li>Connect with other users</li>
                <li>Share posts and engage with content</li>
                <li>Explore the platform</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://lokaa.app" style="display: inline-block; background-color: #059669; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Get Started</a>
            </div>
            
            <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px;">
                If you have any questions, feel free to reach out to our support team.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">
                © 2024 Lokaa. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
`;

const getWelcomeEmailText = (firstName: string) => `
Hello, ${firstName || 'there'},

Welcome to Lokaa! Your account has been successfully created and verified.

You can now:
- Create and join spaces
- Connect with other users
- Share posts and engage with content
- Explore the platform

Get started at: https://lokaa.app

If you have any questions, feel free to reach out to our support team.

© 2024 Lokaa. All rights reserved.
`;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    const wh = new Webhook(hookSecret);
    
    const { user, email_data } = wh.verify(payload, headers) as {
      user: {
        email: string;
        user_metadata?: {
          first_name?: string;
        };
      };
      email_data: {
        token: string;
        token_hash: string;
        redirect_to: string;
        email_action_type: string;
        site_url: string;
        token_new: string;
        token_hash_new: string;
      };
    };

    // Extract first name from user metadata
    const firstName = user.user_metadata?.first_name || '';
    
    // Generate confirmation URL
    const confirmationUrl = `${email_data.site_url}/auth/v1/verify?token=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${email_data.redirect_to}`;

    let subject = '';
    let htmlContent = '';
    let textContent = '';

    switch (email_data.email_action_type) {
      case 'signup':
        subject = 'Verify Your Email - Lokaa';
        htmlContent = getVerificationEmailTemplate(email_data.token, firstName, confirmationUrl);
        textContent = getVerificationEmailText(email_data.token, firstName, confirmationUrl);
        break;
      case 'recovery':
        subject = 'Reset Your Password - Lokaa';
        htmlContent = getVerificationEmailTemplate(email_data.token, firstName, confirmationUrl);
        textContent = getVerificationEmailText(email_data.token, firstName, confirmationUrl);
        break;
      case 'magiclink':
        subject = 'Your Magic Link - Lokaa';
        htmlContent = getVerificationEmailTemplate(email_data.token, firstName, confirmationUrl);
        textContent = getVerificationEmailText(email_data.token, firstName, confirmationUrl);
        break;
      default:
        subject = 'Email Verification - Lokaa';
        htmlContent = getVerificationEmailTemplate(email_data.token, firstName, confirmationUrl);
        textContent = getVerificationEmailText(email_data.token, firstName, confirmationUrl);
    }

    const { error } = await resend.emails.send({
      from: "Lokaa <noreply@lokaa.app>",
      to: [user.email],
      subject: subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error('Resend error:', error);
      return new Response(
        JSON.stringify({
          error: {
            http_code: error.statusCode || 500,
            message: error.message,
          },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('Hook error:', error);
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: error.message,
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
