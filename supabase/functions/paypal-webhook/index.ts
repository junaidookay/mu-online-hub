import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * PayPal Webhook Edge Function
 * 
 * Handles PayPal webhook events:
 * - CHECKOUT.ORDER.APPROVED
 * - PAYMENT.CAPTURE.COMPLETED
 * 
 * This function:
 * - Verifies webhook signature (when PAYPAL_WEBHOOK_ID exists)
 * - Stores all PayPal transactions for analytics
 * - Links purchases to user_id, slot_id, listing_id, gross_amount
 * - Activates slots/listings on payment completion
 * 
 * If PayPal is not configured, logs the event but does not activate listings.
 */

// Helper function to activate a specific draft listing by ID
async function activateDraftById(
  supabase: SupabaseClient,
  draftId: string,
  draftType: string,
  expiresAt: string
): Promise<{ success: boolean, error?: string }> {
  // Map draft types to table names
  const typeTableMap: Record<string, string> = {
    'server': 'servers',
    'advertisement': 'advertisements',
    'text_server': 'premium_text_servers',
    'promo': 'rotating_promos',
  };

  const tableName = typeTableMap[draftType];
  if (!tableName) {
    return { success: false, error: `Unknown draft type: ${draftType}` };
  }

  const { error } = await supabase
    .from(tableName)
    .update({
      is_active: true,
      expires_at: expiresAt,
    })
    .eq('id', draftId);

  if (error) {
    console.error(`Failed to activate draft ${draftId}:`, error);
    return { success: false, error: error.message };
  }

  console.log(`Activated draft ${draftId} in ${tableName}, expires at ${expiresAt}`);
  return { success: true };
}

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource_type: string;
  resource: {
    id: string;
    intent?: string;
    status: string;
    purchase_units?: Array<{
      reference_id?: string;
      custom_id?: string;
      amount: {
        currency_code: string;
        value: string;
      };
      payee?: {
        email_address?: string;
        merchant_id?: string;
      };
      payments?: {
        captures?: Array<{
          id: string;
          status: string;
          amount: {
            currency_code: string;
            value: string;
          };
        }>;
      };
    }>;
    payer?: {
      email_address?: string;
      payer_id?: string;
    };
  };
  create_time: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    const event: PayPalWebhookEvent = JSON.parse(body);
    
    console.log("PayPal webhook received:", {
      eventId: event.id,
      eventType: event.event_type,
      resourceId: event.resource?.id,
    });

    // Check if PayPal is configured
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");

    if (!clientId || !clientSecret) {
      console.warn("PayPal not configured - logging event only, not activating listings");
      
      // Log the event for audit purposes
      await supabaseAdmin.from("payments").insert({
        user_id: "00000000-0000-0000-0000-000000000000", // Placeholder for unconfigured
        amount: 0,
        currency: "usd",
        product_type: "paypal_unconfigured_event",
        duration_days: 0,
        status: "logged_only",
        metadata: {
          paypal_event_id: event.id,
          paypal_event_type: event.event_type,
          note: "PayPal not configured - event logged but not processed",
          raw_event: event,
        },
      });
      
      return new Response(
        JSON.stringify({ 
          received: true, 
          processed: false,
          reason: "PayPal not configured" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify webhook signature if webhook ID is configured
    if (webhookId) {
      const transmissionId = req.headers.get("paypal-transmission-id");
      const transmissionTime = req.headers.get("paypal-transmission-time");
      const certUrl = req.headers.get("paypal-cert-url");
      const authAlgo = req.headers.get("paypal-auth-algo");
      const transmissionSig = req.headers.get("paypal-transmission-sig");

      if (transmissionId && transmissionTime && certUrl && authAlgo && transmissionSig) {
        console.log("Verifying PayPal webhook signature...");
        
        // Get OAuth token
        const authString = btoa(`${clientId}:${clientSecret}`);
        const isSandbox = clientId.startsWith("AV") || clientId.startsWith("sb-") || clientId.includes("sandbox");
        const paypalBaseUrl = isSandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
        
        const tokenResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${authString}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "grant_type=client_credentials",
        });

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          
          // Verify webhook signature
          const verifyResponse = await fetch(`${paypalBaseUrl}/v1/notifications/verify-webhook-signature`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${tokenData.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              auth_algo: authAlgo,
              cert_url: certUrl,
              transmission_id: transmissionId,
              transmission_sig: transmissionSig,
              transmission_time: transmissionTime,
              webhook_id: webhookId,
              webhook_event: event,
            }),
          });

          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            if (verifyData.verification_status !== "SUCCESS") {
              console.error("PayPal webhook signature verification failed:", verifyData);
              return new Response(
                JSON.stringify({ error: "Webhook signature verification failed" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
            console.log("PayPal webhook signature verified successfully");
          } else {
            console.warn("Could not verify webhook signature, proceeding anyway");
          }
        }
      } else {
        console.warn("Missing webhook signature headers, proceeding without verification");
      }
    }

    // Process the webhook event
    const purchaseUnit = event.resource.purchase_units?.[0];
    const referenceId = purchaseUnit?.reference_id || purchaseUnit?.custom_id;
    const grossAmount = parseFloat(purchaseUnit?.amount?.value || "0");
    const currency = purchaseUnit?.amount?.currency_code?.toLowerCase() || "usd";
    const payerEmail = event.resource.payer?.email_address;

    switch (event.event_type) {
      case "CHECKOUT.ORDER.APPROVED": {
        console.log("Processing CHECKOUT.ORDER.APPROVED:", {
          orderId: event.resource.id,
          referenceId,
          grossAmount,
          payerEmail,
        });

        // Order approved but not yet captured - log for tracking
        // The actual capture will be done when PAYMENT.CAPTURE.COMPLETED fires
        // Or we can capture it now via API
        
        // For now, just log the approval
        console.log("Order approved, waiting for capture completion");
        break;
      }

      case "PAYMENT.CAPTURE.COMPLETED": {
        console.log("Processing PAYMENT.CAPTURE.COMPLETED:", {
          orderId: event.resource.id,
          referenceId,
          grossAmount,
          payerEmail,
        });

        // Parse custom_id to get user_id, slot_id, listing_id, and draft info
        // custom_id is JSON from create-paypal-order
        let userId: string | null = null;
        let slotId: number | null = null;
        let listingId: string | null = null;
        let draftId: string | null = null;
        let draftType: string | null = null;
        let durationDays = 30;
        let productType = "unknown";

        // Try to parse custom_id as JSON first (new format)
        const customId = purchaseUnit?.custom_id;
        if (customId) {
          try {
            const customData = JSON.parse(customId);
            userId = customData.user_id || null;
            slotId = customData.slot_id || null;
            listingId = customData.listing_id || null;
            draftId = customData.draft_id || null;
            draftType = customData.draft_type || null;
            durationDays = customData.duration_days || 30;
            productType = customData.type === 'slot' ? `slot_${slotId}` : customData.type || "unknown";
            console.log("Parsed custom_id:", { userId, slotId, listingId, draftId, draftType, durationDays });
          } catch {
            // Not JSON, try legacy format
            console.log("custom_id is not JSON, trying legacy format");
          }
        }

        // Fall back to parsing reference_id (legacy format)
        if (!userId && referenceId) {
          const parts = referenceId.split("_");
          if (parts[0] === "slot" && parts.length >= 3) {
            slotId = parseInt(parts[1]);
            userId = parts[2];
            productType = `slot_${slotId}`;
          } else if (parts[0] === "listing" && parts.length >= 3) {
            listingId = parts[1];
            userId = parts[2];
            productType = "listing_purchase";
          } else if (parts[0] === "purchase" && parts.length >= 2) {
            // Reference might be a purchase ID
            const purchaseId = parts[1];
            
            // Look up slot_purchase by ID
            const { data: existingPurchase } = await supabaseAdmin
              .from("slot_purchases")
              .select("*")
              .eq("id", purchaseId)
              .single();
            
            if (existingPurchase) {
              userId = existingPurchase.user_id;
              slotId = existingPurchase.slot_id;
              productType = existingPurchase.product_type;
            }
          }
        }

        // Get platform fee from config
        const { data: paypalConfig } = await supabaseAdmin
          .from("payment_config")
          .select("*")
          .eq("config_key", "paypal")
          .single();

        let platformFeePercent = 0;
        if (paypalConfig?.config_value) {
          try {
            const config = JSON.parse(paypalConfig.config_value);
            platformFeePercent = parseFloat(config.platform_fee_percent || "0");
          } catch {
            // Use default
          }
        }

        const platformFeeCents = Math.round(grossAmount * 100 * (platformFeePercent / 100));
        const sellerEarningsCents = Math.round(grossAmount * 100) - platformFeeCents;

        // Record the PayPal transaction in payments table
        const paymentRecord = {
          user_id: userId || "00000000-0000-0000-0000-000000000000",
          amount: Math.round(grossAmount * 100),
          currency: currency,
          product_type: productType,
          duration_days: 30, // Default, will be updated based on package
          status: "completed",
          completed_at: new Date().toISOString(),
          metadata: {
            payment_provider: "paypal",
            paypal_order_id: event.resource.id,
            paypal_event_id: event.id,
            payer_email: payerEmail,
            reference_id: referenceId,
            slot_id: slotId,
            listing_id: listingId,
            gross_amount_cents: Math.round(grossAmount * 100),
            platform_fee_cents: platformFeeCents,
            seller_earnings_cents: sellerEarningsCents,
          },
        };

        const { error: paymentError } = await supabaseAdmin
          .from("payments")
          .insert(paymentRecord);

        if (paymentError) {
          console.error("Failed to record PayPal payment:", paymentError);
        } else {
          console.log("PayPal payment recorded successfully");
        }

        // Activate slot if this is a slot purchase
        if (slotId && userId) {
          // Find the pending slot purchase
          const { data: slotPurchase } = await supabaseAdmin
            .from("slot_purchases")
            .select("*, pricing_packages(*)")
            .eq("user_id", userId)
            .eq("slot_id", slotId)
            .eq("is_active", false)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (slotPurchase) {
            const pkgDurationDays = slotPurchase.pricing_packages?.duration_days || durationDays;
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + pkgDurationDays);

            // Activate the slot purchase
            const { error: activateError } = await supabaseAdmin
              .from("slot_purchases")
              .update({
                is_active: true,
                completed_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString(),
                stripe_payment_intent_id: `paypal_${event.resource.id}`,
              })
              .eq("id", slotPurchase.id);

            if (activateError) {
              console.error("Failed to activate slot purchase:", activateError);
            } else {
              console.log("Slot purchase activated via PayPal:", slotPurchase.id);

              // ACTIVATE DRAFT LISTING
              if (draftId && draftType) {
                // Activate specific draft by ID
                console.log(`Activating specific draft: ${draftId} (type: ${draftType})`);
                const result = await activateDraftById(
                  supabaseAdmin,
                  draftId,
                  draftType,
                  expiresAt.toISOString()
                );
                console.log("Draft activation result:", result);
              }

              // Create notification for user
              await supabaseAdmin.from("notifications").insert({
                user_id: userId,
                type: "payment_success",
                title: "Payment Confirmed",
                message: `Your PayPal payment for Slot ${slotId} has been confirmed. Your listing is now active!`,
                data: {
                  slot_id: slotId,
                  payment_provider: "paypal",
                  amount: grossAmount,
                },
              });
            }
          }
        }

        // Activate listing if this is a listing purchase
        if (listingId && userId) {
          const { error: listingError } = await supabaseAdmin
            .from("listing_purchases")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              stripe_payment_intent_id: `paypal_${event.resource.id}`,
            })
            .eq("listing_id", listingId)
            .eq("user_id", userId)
            .eq("status", "pending");

          if (listingError) {
            console.error("Failed to update listing purchase:", listingError);
          } else {
            console.log("Listing purchase completed via PayPal");
          }
        }

        break;
      }

      default:
        console.log("Unhandled PayPal event type:", event.event_type);
    }

    return new Response(
      JSON.stringify({ received: true, processed: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("PayPal webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
