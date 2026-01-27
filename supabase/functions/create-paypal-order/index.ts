import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreatePayPalOrderRequest {
  type: 'slot' | 'listing' | 'listing_publish';
  packageId?: string;
  slotId?: number;
  listingId?: string;
  successUrl: string;
  cancelUrl: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
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

    // Check if PayPal is configured
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.error("PayPal credentials not configured");
      return new Response(
        JSON.stringify({ 
          error: "PayPal is not configured. Please contact support.",
          needsConfiguration: true 
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check PayPal is enabled in config
    const { data: paypalConfig } = await supabaseAdmin
      .from("payment_config")
      .select("is_enabled")
      .eq("config_key", "paypal")
      .maybeSingle();

    if (!paypalConfig?.is_enabled) {
      return new Response(
        JSON.stringify({ 
          error: "PayPal payments are not enabled",
          needsConfiguration: true 
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      type, 
      packageId, 
      slotId, 
      listingId, 
      successUrl, 
      cancelUrl 
    }: CreatePayPalOrderRequest = await req.json();

    console.log("Creating PayPal order:", { type, packageId, slotId, listingId, userId: user.id });

    // Determine environment
    const isSandbox = clientId.startsWith("AV") || clientId.startsWith("sb-") || clientId.includes("sandbox");
    const paypalBaseUrl = isSandbox 
      ? "https://api-m.sandbox.paypal.com" 
      : "https://api-m.paypal.com";

    // Get OAuth token
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
      const tokenError = await tokenResponse.text();
      console.error("Failed to get PayPal token:", tokenError);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with PayPal" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    let amount = 0;
    let itemName = "";
    let itemDescription = "";
    let referenceId = "";
    let durationDays = 30;

    // Prepare order details based on type
    if (type === 'listing_publish' && packageId && listingId) {
      // Fetch listing package details
      const { data: pkg, error: pkgError } = await supabaseClient
        .from("listing_packages")
        .select("*")
        .eq("id", packageId)
        .eq("is_active", true)
        .maybeSingle();

      if (pkgError || !pkg) {
        console.error("Listing package not found:", pkgError);
        return new Response(
          JSON.stringify({ error: "Package not found", code: "INVALID_PACKAGE_ID" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch listing to verify ownership
      const { data: listing, error: listingError } = await supabaseClient
        .from("listings")
        .select("id, title, user_id")
        .eq("id", listingId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (listingError || !listing) {
        console.error("Listing not found:", listingError);
        return new Response(
          JSON.stringify({ error: "Listing not found or unauthorized" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      amount = pkg.price_cents / 100;
      itemName = `Publish: ${pkg.name}`;
      itemDescription = `Publish "${listing.title}" for ${pkg.duration_days} days`;
      referenceId = `listing_publish_${listingId}_${user.id.substring(0, 8)}`;
      durationDays = pkg.duration_days;

    } else if (type === 'slot' && packageId && slotId) {
      // Fetch pricing package details
      const { data: pkg, error: pkgError } = await supabaseClient
        .from("pricing_packages")
        .select("*")
        .eq("id", packageId)
        .maybeSingle();

      if (pkgError || !pkg) {
        console.error("Package not found:", pkgError);
        return new Response(
          JSON.stringify({ error: "Package not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (pkg.slot_id !== slotId) {
        return new Response(
          JSON.stringify({ error: "Package slot mismatch" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (slotId === 6) {
        return new Response(
          JSON.stringify({ error: "This slot is free and does not require payment", isFree: true }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      amount = pkg.price_cents / 100;
      itemName = pkg.name;
      itemDescription = pkg.description || `Slot ${slotId} - ${pkg.name}`;
      referenceId = `slot_${slotId}_${user.id.substring(0, 8)}`;
      durationDays = pkg.duration_days;

    } else if (type === 'listing' && listingId) {
      // Fetch listing details for purchase
      const { data: listing, error: listingError } = await supabaseClient
        .from("listings")
        .select("*")
        .eq("id", listingId)
        .eq("is_published", true)
        .maybeSingle();

      if (listingError || !listing) {
        console.error("Listing not found:", listingError);
        return new Response(
          JSON.stringify({ error: "Listing not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      amount = listing.price_usd || 0;
      itemName = listing.title;
      itemDescription = listing.description?.substring(0, 127) || listing.title;
      referenceId = `listing_${listingId}_${user.id.substring(0, 8)}`;

    } else {
      return new Response(
        JSON.stringify({ error: "Invalid order type or missing parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create PayPal order
    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: referenceId,
        description: itemDescription.substring(0, 127),
        amount: {
          currency_code: "USD",
          value: amount.toFixed(2),
          breakdown: {
            item_total: { currency_code: "USD", value: amount.toFixed(2) },
          },
        },
        items: [{
          name: itemName.substring(0, 127),
          description: itemDescription.substring(0, 127),
          quantity: "1",
          unit_amount: { currency_code: "USD", value: amount.toFixed(2) },
          category: "DIGITAL_GOODS",
        }],
        custom_id: JSON.stringify({
          user_id: user.id,
          package_id: packageId || null,
          listing_id: listingId || null,
          slot_id: slotId || null,
          type: type,
          duration_days: durationDays,
        }),
      }],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
            brand_name: "MU Online Hub",
            locale: "en-US",
            landing_page: "LOGIN",
            user_action: "PAY_NOW",
            return_url: successUrl,
            cancel_url: cancelUrl,
          },
        },
      },
    };

    console.log("Creating PayPal order:", orderPayload.purchase_units[0].reference_id);

    const orderResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `${referenceId}_${Date.now()}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!orderResponse.ok) {
      const orderError = await orderResponse.text();
      console.error("Failed to create PayPal order:", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to create PayPal order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orderData = await orderResponse.json();
    console.log("PayPal order created:", orderData.id);

    // Find the approval URL
    const approvalLink = orderData.links?.find((link: any) => link.rel === "payer-action") ||
                         orderData.links?.find((link: any) => link.rel === "approve");
    
    if (!approvalLink) {
      console.error("No approval link in response:", orderData);
      return new Response(
        JSON.stringify({ error: "No approval URL returned from PayPal" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record the pending payment
    await supabaseAdmin.from("payments").insert({
      user_id: user.id,
      amount: Math.round(amount * 100),
      currency: "usd",
      product_type: type === 'listing_publish' ? 'listing_publish' : type === 'slot' ? `slot_${slotId}` : "listing_purchase",
      product_id: type === 'listing_publish' ? listingId : type === 'slot' ? packageId : listingId,
      duration_days: durationDays,
      status: "pending",
      metadata: {
        payment_provider: "paypal",
        paypal_order_id: orderData.id,
        reference_id: referenceId,
        slot_id: slotId,
        listing_id: listingId,
        package_id: packageId,
      },
    });

    return new Response(
      JSON.stringify({ 
        orderId: orderData.id,
        approvalUrl: approvalLink.href,
        provider: 'paypal',
        environment: isSandbox ? 'sandbox' : 'live',
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Create PayPal order error:", error);
    const message = error instanceof Error ? error.message : "Failed to create PayPal order";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
