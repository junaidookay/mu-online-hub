import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ 
          connected: false, 
          stripeConfigured: false,
          message: "Stripe not configured" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Get user's profile with Stripe account ID
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("user_id", user.id)
      .single();

    if (!profile?.stripe_account_id) {
      return new Response(
        JSON.stringify({ 
          connected: false, 
          stripeConfigured: true,
          onboardingComplete: false 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    const isOnboardingComplete = account.details_submitted && account.charges_enabled;

    // Update profile if onboarding status changed
    if (isOnboardingComplete && !profile.stripe_onboarding_complete) {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await serviceClient
        .from("profiles")
        .update({ stripe_onboarding_complete: true })
        .eq("user_id", user.id);
    }

    // Get balance for the connected account
    let balance = null;
    if (isOnboardingComplete) {
      try {
        const stripeBalance = await stripe.balance.retrieve({
          stripeAccount: profile.stripe_account_id,
        });
        balance = {
          available: stripeBalance.available.map((b: { amount: number; currency: string }) => ({
            amount: b.amount / 100,
            currency: b.currency.toUpperCase(),
          })),
          pending: stripeBalance.pending.map((b: { amount: number; currency: string }) => ({
            amount: b.amount / 100,
            currency: b.currency.toUpperCase(),
          })),
        };
      } catch (e) {
        console.error("Error fetching balance:", e);
      }
    }

    return new Response(
      JSON.stringify({
        connected: true,
        stripeConfigured: true,
        onboardingComplete: isOnboardingComplete,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        accountId: profile.stripe_account_id,
        balance,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error getting connect status:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});