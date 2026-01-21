import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SlotCheckoutRequest {
  packageId: string;
  slotId: number;
  successUrl: string;
  cancelUrl: string;
  paymentMethod?: 'stripe' | 'paypal';
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

    const { packageId, slotId, successUrl, cancelUrl, paymentMethod = 'stripe' }: SlotCheckoutRequest = await req.json();
    console.log("Slot checkout request:", { packageId, slotId, userId: user.id, paymentMethod });

    // Fetch package details
    const { data: pkg, error: pkgError } = await supabaseClient
      .from("pricing_packages")
      .select("*")
      .eq("id", packageId)
      .single();

    if (pkgError || !pkg) {
      console.error("Package not found:", pkgError);
      return new Response(
        JSON.stringify({ error: "Package not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify slot matches package
    if (pkg.slot_id !== slotId) {
      return new Response(
        JSON.stringify({ error: "Package slot mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if slot 6 (free) - should not go through checkout
    if (slotId === 6) {
      return new Response(
        JSON.stringify({ 
          error: "This slot is free and does not require payment",
          isFree: true,
          redirectUrl: `/create-listing?type=upcoming-server&slot=6`
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle Stripe payment
    if (paymentMethod === 'stripe') {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      
      if (!stripeKey) {
        console.error("STRIPE_SECRET_KEY not configured");
        return new Response(
          JSON.stringify({ 
            error: "Payment system not configured",
            needsConfiguration: true 
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const Stripe = (await import("https://esm.sh/stripe@14.21.0")).default;
      const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

      // Check for existing customer
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      let customerId: string;

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id },
        });
        customerId = customer.id;
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: pkg.name,
                description: pkg.description || `Slot ${slotId} - ${pkg.name}`,
              },
              unit_amount: pkg.price_cents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: user.id,
          package_id: packageId,
          slot_id: slotId.toString(),
          product_type: "slot_purchase",
          duration_days: pkg.duration_days.toString(),
          payment_provider: "stripe",
        },
      });

      // Create pending slot purchase record
      await supabaseAdmin.from("slot_purchases").insert({
        user_id: user.id,
        slot_id: slotId,
        package_id: packageId,
        product_type: pkg.product_type || `slot_${slotId}`,
        stripe_session_id: session.id,
        is_active: false, // Will be activated on payment success
      });

      console.log("Stripe checkout session created:", session.id);

      return new Response(
        JSON.stringify({ url: session.url, provider: 'stripe' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle PayPal payment - return PayPal instructions
    if (paymentMethod === 'paypal') {
      // Get platform PayPal settings
      const { data: paypalConfig } = await supabaseAdmin
        .from("payment_config")
        .select("*")
        .eq("config_key", "paypal_enabled")
        .single();

      if (!paypalConfig?.is_enabled) {
        return new Response(
          JSON.stringify({ 
            error: "PayPal is not enabled for this platform",
            needsConfiguration: true 
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get platform PayPal email
      const { data: paypalEmailConfig } = await supabaseAdmin
        .from("payment_config")
        .select("*")
        .eq("config_key", "paypal_email")
        .single();

      const paypalEmail = paypalEmailConfig?.config_value || null;

      if (!paypalEmail) {
        return new Response(
          JSON.stringify({ 
            error: "Platform PayPal email not configured",
            needsConfiguration: true 
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create pending slot purchase for PayPal
      const { data: slotPurchase, error: insertError } = await supabaseAdmin
        .from("slot_purchases")
        .insert({
          user_id: user.id,
          slot_id: slotId,
          package_id: packageId,
          product_type: pkg.product_type || `slot_${slotId}`,
          is_active: false, // Will be activated manually by admin after PayPal verification
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to create slot purchase:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create purchase record" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("PayPal slot purchase created:", slotPurchase.id);

      return new Response(
        JSON.stringify({ 
          provider: 'paypal',
          paypalEmail,
          amount: (pkg.price_cents / 100).toFixed(2),
          purchaseId: slotPurchase.id,
          packageName: pkg.name,
          instructions: `Please send $${(pkg.price_cents / 100).toFixed(2)} to ${paypalEmail} with your purchase ID: ${slotPurchase.id}. Your slot will be activated once payment is verified.`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid payment method" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Slot checkout error:", error);
    const message = error instanceof Error ? error.message : "Failed to create checkout session";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
