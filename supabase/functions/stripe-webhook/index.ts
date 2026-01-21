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

      const metadata = session.metadata || {};
      
      // Handle SLOT PURCHASE (new slot-based system)
      if (metadata.product_type === "slot_purchase" && metadata.slot_id) {
        console.log("Processing slot purchase for slot:", metadata.slot_id);
        
        const slotId = parseInt(metadata.slot_id);
        const durationDays = parseInt(metadata.duration_days || "30");
        const now = new Date();
        const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        // Update slot purchase to active
        const { error: slotError } = await supabaseAdmin
          .from("slot_purchases")
          .update({
            is_active: true,
            stripe_payment_intent_id: session.payment_intent,
            completed_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .eq("stripe_session_id", session.id);

        if (slotError) {
          console.error("Failed to update slot purchase:", slotError);
        } else {
          console.log("Slot purchase activated successfully");
        }

        // Send confirmation email
        if (session.customer_details?.email) {
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
              },
              body: JSON.stringify({
                type: "payment_success",
                to: session.customer_details.email,
                data: {
                  name: session.customer_details.name || "User",
                  packageName: `Slot ${slotId} Package`,
                  amount: ((session.amount_total || 0) / 100).toFixed(2),
                  duration: durationDays.toString(),
                  expiresAt: expiresAt.toLocaleDateString(),
                },
              }),
            });
            console.log("Payment confirmation email sent");
          } catch (emailError) {
            console.error("Failed to send confirmation email:", emailError);
          }
        }

        return new Response(
          JSON.stringify({ received: true, type: "slot_purchase" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Handle LISTING PURCHASE (marketplace item purchase)
      if (metadata.listing_id && metadata.buyer_id && metadata.seller_id) {
        console.log("Processing listing purchase:", metadata.listing_id);

        const { error: purchaseError } = await supabaseAdmin
          .from("listing_purchases")
          .update({
            status: "completed",
            stripe_payment_intent_id: session.payment_intent,
            completed_at: new Date().toISOString(),
          })
          .eq("stripe_session_id", session.id);

        if (purchaseError) {
          console.error("Failed to update listing purchase:", purchaseError);
        }

        // Create seller payout record
        const platformFeePercent = 0; // 0% platform fee currently
        const amountCents = session.amount_total || 0;
        const platformFeeCents = Math.round(amountCents * platformFeePercent / 100);
        const netAmountCents = amountCents - platformFeeCents;

        await supabaseAdmin.from("seller_payouts").insert({
          user_id: metadata.seller_id,
          listing_id: metadata.listing_id,
          amount_cents: amountCents,
          platform_fee_cents: platformFeeCents,
          net_amount_cents: netAmountCents,
          status: "completed",
          paid_at: new Date().toISOString(),
        });

        // Send email to seller
        if (metadata.seller_email) {
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
              },
              body: JSON.stringify({
                type: "listing_purchased",
                to: metadata.seller_email,
                data: {
                  sellerName: "Seller",
                  listingTitle: metadata.listing_title || "Your listing",
                  amount: ((session.amount_total || 0) / 100).toFixed(2),
                  buyerEmail: session.customer_details?.email || "Anonymous",
                },
              }),
            });
            console.log("Seller notification email sent");
          } catch (emailError) {
            console.error("Failed to send seller notification:", emailError);
          }
        }

        return new Response(
          JSON.stringify({ received: true, type: "listing_purchase" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Handle LEGACY payment types (premium listing, VIP, etc.)
      const { user_id, package_id, product_id, product_type, duration_days, package_name } = metadata;

      if (product_type) {
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

          case "marketplace_listing":
            if (product_id) {
              await supabaseAdmin
                .from("listings")
                .update({ 
                  is_published: true, 
                  is_active: true,
                  published_at: new Date().toISOString(),
                  expires_at: expiresAt.toISOString() 
                })
                .eq("id", product_id);
              console.log("Published marketplace listing:", product_id);
            }
            break;

          default:
            console.log("Unknown product type:", product_type);
        }

        // Send payment success email
        if (user_id && session.customer_details?.email) {
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
              },
              body: JSON.stringify({
                type: "payment_success",
                to: session.customer_details.email,
                data: {
                  name: session.customer_details.name || "User",
                  packageName: package_name || product_type || "Premium Package",
                  amount: ((session.amount_total || 0) / 100).toFixed(2),
                  duration: duration_days || "7",
                  expiresAt: expiresAt.toLocaleDateString(),
                },
              }),
            });
            console.log("Payment success email sent");
          } catch (emailError) {
            console.error("Failed to send payment email:", emailError);
          }
        }
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
