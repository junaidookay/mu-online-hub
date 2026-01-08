import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: "welcome" | "payment_success" | "password_reset";
  to: string;
  data?: Record<string, string>;
}

const emailTemplates = {
  welcome: (data: Record<string, string>) => ({
    subject: "Welcome to MU Online Hub!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #eee;">
        <h1 style="color: #f4c430; text-align: center;">Welcome to MU Online Hub!</h1>
        <p>Hi ${data.name || "there"},</p>
        <p>Thank you for joining MU Online Hub - the ultimate marketplace for MU Online servers, services, and partners.</p>
        <p>You can now:</p>
        <ul>
          <li>List your server for free</li>
          <li>Create advertisements</li>
          <li>Upgrade to premium for more visibility</li>
        </ul>
        <p style="text-align: center; margin-top: 30px;">
          <a href="${data.siteUrl}/dashboard" style="background: #f4c430; color: #1a1a2e; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Dashboard</a>
        </p>
        <p style="color: #888; font-size: 12px; margin-top: 40px; text-align: center;">
          © MU Online Hub. All rights reserved.
        </p>
      </div>
    `,
  }),

  payment_success: (data: Record<string, string>) => ({
    subject: "Payment Successful - MU Online Hub",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #eee;">
        <h1 style="color: #f4c430; text-align: center;">Payment Successful!</h1>
        <p>Hi ${data.name || "there"},</p>
        <p>Your payment for <strong>${data.packageName}</strong> has been processed successfully.</p>
        <div style="background: #2a2a4e; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> $${data.amount}</p>
          <p><strong>Duration:</strong> ${data.duration} days</p>
          <p><strong>Expires:</strong> ${data.expiresAt}</p>
        </div>
        <p>Your premium features have been activated automatically.</p>
        <p style="text-align: center; margin-top: 30px;">
          <a href="${data.siteUrl}/dashboard" style="background: #f4c430; color: #1a1a2e; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Dashboard</a>
        </p>
        <p style="color: #888; font-size: 12px; margin-top: 40px; text-align: center;">
          © MU Online Hub. All rights reserved.
        </p>
      </div>
    `,
  }),

  password_reset: (data: Record<string, string>) => ({
    subject: "Reset Your Password - MU Online Hub",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #eee;">
        <h1 style="color: #f4c430; text-align: center;">Password Reset</h1>
        <p>Hi,</p>
        <p>You requested to reset your password. Click the button below to create a new password:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${data.resetLink}" style="background: #f4c430; color: #1a1a2e; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
        </p>
        <p style="color: #888; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        <p style="color: #888; font-size: 14px;">This link will expire in 1 hour.</p>
        <p style="color: #888; font-size: 12px; margin-top: 40px; text-align: center;">
          © MU Online Hub. All rights reserved.
        </p>
      </div>
    `,
  }),
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, data = {} }: EmailRequest = await req.json();
    console.log("Sending email:", { type, to });

    if (!type || !to) {
      return new Response(
        JSON.stringify({ error: "Missing type or recipient" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const template = emailTemplates[type];
    if (!template) {
      return new Response(
        JSON.stringify({ error: "Unknown email type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, html } = template(data);

    const emailResponse = await resend.emails.send({
      from: "MU Online Hub <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Email error:", error);
    const message = error instanceof Error ? error.message : "Failed to send email";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
