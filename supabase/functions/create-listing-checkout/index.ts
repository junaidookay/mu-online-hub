import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  listingId: string;
  successUrl: string;
  cancelUrl: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { listingId, successUrl, cancelUrl }: CheckoutRequest = await req.json();
    console.log("Listing checkout request:", { listingId, userId: user.id });

    // Create admin client to fetch seller profile
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch listing details
    const { data: listing, error: listingError } = await supabaseClient
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .eq("is_published", true)
      .single();

    if (listingError || !listing) {
      console.error("Listing not found:", listingError);
      return new Response(
        JSON.stringify({ error: "Listing not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!listing.price_usd) {
      return new Response(
        JSON.stringify({ error: "This listing has no price set" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch seller's profile for Stripe Connect
    const { data: sellerProfile, error: sellerError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete, email, display_name")
      .eq("user_id", listing.user_id)
      .single();

    if (sellerError) {
      console.error("Error fetching seller profile:", sellerError);
    }

    // Import Stripe dynamically
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

    // Create checkout session - with or without Stripe Connect
    const priceInCents = Math.round(listing.price_usd * 100);
    
    // Calculate platform fee (0% for now, can be adjusted later)
    const platformFeePercent = 0;
    const platformFee = Math.round(priceInCents * platformFeePercent / 100);

    let sessionParams: any = {
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: listing.title,
              description: listing.description || `${listing.category} listing`,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        buyer_id: user.id,
        seller_id: listing.user_id,
        listing_id: listingId,
        listing_title: listing.title,
        seller_email: sellerProfile?.email || "",
        platform_fee: platformFee.toString(),
      },
    };

    // If seller has completed Stripe Connect onboarding, use Connect
    if (sellerProfile?.stripe_account_id && sellerProfile?.stripe_onboarding_complete) {
      console.log("Using Stripe Connect for seller:", sellerProfile.stripe_account_id);
      
      sessionParams.payment_intent_data = {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: sellerProfile.stripe_account_id,
        },
      };
    } else {
      console.log("Seller has not completed Stripe Connect onboarding, payment goes to platform");
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Create listing purchase record with seller_id
    await supabaseAdmin.from("listing_purchases").insert({
      user_id: user.id,
      listing_id: listingId,
      seller_id: listing.user_id,
      stripe_session_id: session.id,
      amount: priceInCents,
      currency: "usd",
      status: "pending",
      duration_days: 0,
    });

    console.log("Listing checkout session created:", session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Checkout error:", error);
    const message = error instanceof Error ? error.message : "Failed to create checkout session";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
