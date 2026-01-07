import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Running expiration check at:", new Date().toISOString());

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date().toISOString();

    // Expire servers
    const { data: expiredServers, error: serversError } = await supabaseAdmin
      .from("servers")
      .update({ is_premium: false, is_active: false })
      .lt("expires_at", now)
      .eq("is_active", true)
      .select("id, name");

    if (serversError) {
      console.error("Error expiring servers:", serversError);
    } else {
      console.log("Expired servers:", expiredServers?.length || 0);
    }

    // Expire advertisements
    const { data: expiredAds, error: adsError } = await supabaseAdmin
      .from("advertisements")
      .update({ is_active: false, vip_level: "none" })
      .lt("expires_at", now)
      .eq("is_active", true)
      .select("id, title");

    if (adsError) {
      console.error("Error expiring ads:", adsError);
    } else {
      console.log("Expired ads:", expiredAds?.length || 0);
    }

    // Expire premium text servers
    const { data: expiredTextServers, error: textServersError } = await supabaseAdmin
      .from("premium_text_servers")
      .update({ is_active: false })
      .lt("expires_at", now)
      .eq("is_active", true)
      .select("id, name");

    if (textServersError) {
      console.error("Error expiring text servers:", textServersError);
    } else {
      console.log("Expired text servers:", expiredTextServers?.length || 0);
    }

    // Expire rotating promos
    const { data: expiredPromos, error: promosError } = await supabaseAdmin
      .from("rotating_promos")
      .update({ is_active: false })
      .lt("expires_at", now)
      .eq("is_active", true)
      .select("id, text");

    if (promosError) {
      console.error("Error expiring promos:", promosError);
    } else {
      console.log("Expired promos:", expiredPromos?.length || 0);
    }

    const summary = {
      timestamp: now,
      expired: {
        servers: expiredServers?.length || 0,
        ads: expiredAds?.length || 0,
        textServers: expiredTextServers?.length || 0,
        promos: expiredPromos?.length || 0,
      },
    };

    console.log("Expiration summary:", summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Expiration job error:", error);
    const message = error instanceof Error ? error.message : "Expiration job failed";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
