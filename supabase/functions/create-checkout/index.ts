import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  packageId: string;
  productId?: string;
  productType?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ 
          error: "Payment system not configured. Please contact support.",
          needsConfiguration: true 
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
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
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { packageId, productId, productType, successUrl, cancelUrl, metadata }: CheckoutRequest = body;
    
    // Validate required fields
    if (!packageId) {
      return new Response(
        JSON.stringify({ error: "Package ID is required", code: "MISSING_REQUIRED_FIELD" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(packageId)) {
      return new Response(
        JSON.stringify({ error: "Invalid package ID format", code: "INVALID_PACKAGE_ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Checkout request:", { packageId, productId, productType, userId: user.id });

    // Determine which table to fetch from based on productType
    let pkg: any = null;
    let pkgError: any = null;
    
    if (productType === "listing_publish") {
      // Fetch from listing_packages table for listing publications
      const result = await supabaseClient
        .from("listing_packages")
        .select("*")
        .eq("id", packageId)
        .eq("is_active", true)
        .maybeSingle();
      
      pkg = result.data;
      pkgError = result.error;
      
      if (pkg) {
        // Map listing_packages fields to expected format
        pkg.product_type = "listing_publish";
      }
    } else {
      // Default: fetch from pricing_packages table
      const result = await supabaseClient
        .from("pricing_packages")
        .select("*")
        .eq("id", packageId)
        .maybeSingle();
      
      pkg = result.data;
      pkgError = result.error;
    }

    if (pkgError) {
      console.error("Package query error:", pkgError);
      return new Response(
        JSON.stringify({ error: "Failed to retrieve package information", code: "INTERNAL_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pkg) {
      console.error("Package not found:", packageId, "productType:", productType);
      return new Response(
        JSON.stringify({ error: "The selected package is no longer available", code: "INVALID_PACKAGE_ID" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build success/cancel URLs with defaults
    const baseUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "") || "";
    const defaultSuccessUrl = successUrl || `${baseUrl}/seller-dashboard?payment=success`;
    const defaultCancelUrl = cancelUrl || `${baseUrl}/seller-dashboard?payment=cancelled`;

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
              description: pkg.description || undefined,
            },
            unit_amount: pkg.price_cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: defaultSuccessUrl,
      cancel_url: defaultCancelUrl,
      metadata: {
        user_id: user.id,
        package_id: packageId,
        product_id: productId || metadata?.listing_id || "",
        product_type: pkg.product_type || productType || "slot",
        duration_days: pkg.duration_days.toString(),
        listing_id: metadata?.listing_id || "",
      },
    });

    // Create admin client for service operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create appropriate purchase record based on product type
    if (productType === "listing_publish" && metadata?.listing_id) {
      // Create listing_purchases record for listing publication
      await supabaseAdmin.from("listing_purchases").insert({
        user_id: user.id,
        listing_id: metadata.listing_id,
        package_id: packageId,
        stripe_session_id: session.id,
        amount: pkg.price_cents,
        currency: "usd",
        status: "pending",
        duration_days: pkg.duration_days,
      });
    } else {
      // Create general payments record
      await supabaseAdmin.from("payments").insert({
        user_id: user.id,
        stripe_session_id: session.id,
        amount: pkg.price_cents,
        currency: "usd",
        status: "pending",
        product_type: pkg.product_type || productType || "slot",
        product_id: productId || null,
        duration_days: pkg.duration_days,
        metadata: { package_name: pkg.name },
      });
    }

    console.log("Checkout session created:", session.id);

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
