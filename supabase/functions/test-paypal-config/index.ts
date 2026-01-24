import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Test PayPal Configuration Edge Function
 * 
 * Purpose:
 * - Validate stored PayPal credentials
 * - Attempt OAuth token retrieval from PayPal API
 * - Return connection status (sandbox/live) and validity
 * 
 * This function is called by the admin dashboard to verify PayPal setup.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: adminCheck } = await supabaseClient.rpc("is_admin");
    if (!adminCheck) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Testing PayPal configuration for admin:", user.id);

    // Get PayPal credentials from secrets
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");

    // Check if credentials exist
    if (!clientId || !clientSecret) {
      console.log("PayPal credentials not configured");
      return new Response(
        JSON.stringify({
          configured: false,
          status: "not_configured",
          message: "PayPal credentials are not set. Please add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to your secrets.",
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret,
          hasWebhookId: !!webhookId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine environment based on client ID format
    // Sandbox client IDs typically start with "A" and are shorter, 
    // but the most reliable way is to try the sandbox endpoint first
    const isSandbox = clientId.includes("sandbox") || 
                      clientId.startsWith("AV") || 
                      clientId.startsWith("sb-");
    
    const paypalBaseUrl = isSandbox 
      ? "https://api-m.sandbox.paypal.com"
      : "https://api-m.paypal.com";

    console.log("Testing PayPal OAuth with environment:", isSandbox ? "sandbox" : "live");

    // Attempt to get OAuth token from PayPal
    const authString = btoa(`${clientId}:${clientSecret}`);
    
    const tokenResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("PayPal OAuth failed:", tokenResponse.status, errorData);
      
      // If sandbox failed, try live endpoint
      if (isSandbox) {
        console.log("Retrying with live endpoint...");
        const liveTokenResponse = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${authString}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "grant_type=client_credentials",
        });
        
        if (liveTokenResponse.ok) {
          const liveTokenData = await liveTokenResponse.json();
          console.log("PayPal connected successfully (live environment)");
          
          return new Response(
            JSON.stringify({
              configured: true,
              status: "connected",
              environment: "live",
              message: "PayPal credentials are valid. Connected to LIVE environment.",
              hasClientId: true,
              hasClientSecret: true,
              hasWebhookId: !!webhookId,
              tokenType: liveTokenData.token_type,
              expiresIn: liveTokenData.expires_in,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      
      return new Response(
        JSON.stringify({
          configured: false,
          status: "invalid_credentials",
          message: "PayPal credentials are invalid. Please check your Client ID and Client Secret.",
          error: errorData,
          hasClientId: true,
          hasClientSecret: true,
          hasWebhookId: !!webhookId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log("PayPal OAuth successful:", { 
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      environment: isSandbox ? "sandbox" : "live"
    });

    // Update payment_config with connection status
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const configValue = JSON.stringify({
      client_id_set: true,
      client_secret_set: true,
      webhook_id_set: !!webhookId,
      environment: isSandbox ? "sandbox" : "live",
      last_verified: new Date().toISOString(),
      platform_fee_percent: "0",
    });

    await supabaseAdmin
      .from("payment_config")
      .upsert({
        config_key: "paypal",
        config_value: configValue,
        is_enabled: true,
      }, { onConflict: "config_key" });

    return new Response(
      JSON.stringify({
        configured: true,
        status: "connected",
        environment: isSandbox ? "sandbox" : "live",
        message: `PayPal credentials are valid. Connected to ${isSandbox ? "SANDBOX" : "LIVE"} environment.`,
        hasClientId: true,
        hasClientSecret: true,
        hasWebhookId: !!webhookId,
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("PayPal config test error:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    
    return new Response(
      JSON.stringify({
        configured: false,
        status: "error",
        message: `Failed to test PayPal configuration: ${message}`,
        error: message,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
