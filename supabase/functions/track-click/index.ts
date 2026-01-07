import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClickRequest {
  adId?: string;
  serverId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adId, serverId }: ClickRequest = await req.json();

    if (!adId && !serverId) {
      return new Response(
        JSON.stringify({ error: "Missing adId or serverId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (adId) {
      // Record ad click
      const { error } = await supabaseAdmin
        .from("ad_clicks")
        .insert({ ad_id: adId });

      if (error) {
        console.error("Error recording ad click:", error);
        throw error;
      }
      console.log("Ad click recorded:", adId);
    }

    if (serverId) {
      // Increment server click count
      const { error } = await supabaseAdmin.rpc("increment_server_clicks", {
        server_id: serverId,
      });

      // If RPC doesn't exist, fall back to direct update
      if (error) {
        const { error: updateError } = await supabaseAdmin
          .from("servers")
          .update({ click_count: supabaseAdmin.rpc("coalesce", { val: "click_count", default_val: 0 }) })
          .eq("id", serverId);
        
        // Simple increment as fallback
        const { data: server } = await supabaseAdmin
          .from("servers")
          .select("click_count")
          .eq("id", serverId)
          .single();

        if (server) {
          await supabaseAdmin
            .from("servers")
            .update({ click_count: (server.click_count || 0) + 1 })
            .eq("id", serverId);
        }
      }
      console.log("Server click recorded:", serverId);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Click tracking error:", error);
    const message = error instanceof Error ? error.message : "Failed to track click";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
