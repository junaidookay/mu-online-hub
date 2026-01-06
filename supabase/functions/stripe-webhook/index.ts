import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const Stripe = (await import("https://esm.sh/stripe@14.21.0")).default;
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    // For webhook endpoint verification without signature (testing mode)
    let event;
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("Webhook signature verification failed:", errMessage);
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Parse event directly (testing without webhook secret)
      event = JSON.parse(body);
      console.log("Processing event without signature verification (test mode)");
    }

    console.log("Webhook event received:", event.type);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      console.log("Checkout session completed:", session.id);

      const { user_id, package_id, product_id, product_type, duration_days } = session.metadata || {};

      // Update payment record
      const { error: paymentError } = await supabaseAdmin
        .from("payments")
        .update({
          status: "completed",
          stripe_payment_intent_id: session.payment_intent,
          completed_at: new Date().toISOString(),
        })
        .eq("stripe_session_id", session.id);

      if (paymentError) {
        console.error("Failed to update payment:", paymentError);
      }

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(duration_days || "7"));

      // Activate the feature based on product type
      switch (product_type) {
        case "premium_listing":
          if (product_id) {
            await supabaseAdmin
              .from("servers")
              .update({ 
                is_premium: true, 
                is_active: true,
                expires_at: expiresAt.toISOString() 
              })
              .eq("id", product_id);
            console.log("Activated premium listing for server:", product_id);
          }
          break;

        case "vip_gold":
        case "vip_diamond":
          if (product_id) {
            const vipLevel = product_type === "vip_gold" ? "gold" : "diamond";
            await supabaseAdmin
              .from("advertisements")
              .update({ 
                vip_level: vipLevel, 
                is_active: true,
                expires_at: expiresAt.toISOString() 
              })
              .eq("id", product_id);
            console.log("Activated VIP for ad:", product_id);
          }
          break;

        case "top_banner":
          // User needs to submit banner details after payment
          console.log("Top banner payment completed for user:", user_id);
          break;

        case "rotating_promo":
          // User needs to submit promo details after payment
          console.log("Rotating promo payment completed for user:", user_id);
          break;

        default:
          console.log("Unknown product type:", product_type);
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
