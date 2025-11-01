import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { orderId, deliveryAmount } = await req.json();

    if (!orderId || !deliveryAmount) {
      throw new Error("Missing orderId or deliveryAmount");
    }

    // Fetch system settings for cashback and referral percentages
    const { data: settings, error: settingsError } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["cashback_percentage", "referral_reward_percentage"]);

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
    }

    // Parse settings with defaults
    const cashbackPercentage = settings?.find((s) => s.key === "cashback_percentage")?.value || 100;
    const referralRewardPercentage = settings?.find((s) => s.key === "referral_reward_percentage")?.value || 10;

    console.log("Settings:", { cashbackPercentage, referralRewardPercentage });

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("user_id, id, order_number")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, virtual_wallet, actual_wallet, referred_by")
      .eq("id", order.user_id)
      .single();

    if (profileError || !profile) {
      throw new Error("User profile not found");
    }

    // 1. Credit cashback to user's virtual wallet based on system settings
    const cashbackAmount = (Number(deliveryAmount) * Number(cashbackPercentage)) / 100;
    const newVirtualBalance = Number(profile.virtual_wallet) + cashbackAmount;

    const { error: updateUserError } = await supabase
      .from("profiles")
      .update({ virtual_wallet: newVirtualBalance })
      .eq("id", profile.id);

    if (updateUserError) {
      console.error("Error updating user virtual wallet:", updateUserError);
      throw updateUserError;
    }

    // Log cashback transaction
    const { error: cashbackTransactionError } = await supabase.from("wallet_transactions").insert({
      user_id: profile.id,
      transaction_type: "credit",
      amount: cashbackAmount,
      wallet_type: "virtual",
      kind: "cashback",
      balance_after: newVirtualBalance,
      order_id: order.id,
      description: `${cashbackPercentage}% cashback for order ${order.order_number}`,
    });

    if (cashbackTransactionError) {
      console.error("Error logging cashback transaction:", cashbackTransactionError);
      throw new Error(`Failed to log cashback transaction: ${cashbackTransactionError.message}`);
    }

    console.log(`Cashback credited: ₹${cashbackAmount} to user ${profile.id}`);

    // 2. Handle referral reward if user was referred
    if (profile.referred_by) {
      const rewardAmount = (Number(deliveryAmount) * Number(referralRewardPercentage)) / 100;

      // Get referrer profile
      const { data: referrer, error: referrerError } = await supabase
        .from("profiles")
        .select("id, virtual_wallet, actual_wallet")
        .eq("referral_code", profile.referred_by)
        .single();

      if (!referrerError && referrer) {
        let converted = false;
        let failureReason = null;
        let convertedAmount = 0;

        // Check if referrer has sufficient virtual wallet balance
        if (Number(referrer.virtual_wallet) >= rewardAmount) {
          // Convert from virtual to actual wallet
          const newReferrerVirtual = Number(referrer.virtual_wallet) - rewardAmount;
          const newReferrerActual = Number(referrer.actual_wallet) + rewardAmount;

          const { error: updateReferrerError } = await supabase
            .from("profiles")
            .update({
              virtual_wallet: newReferrerVirtual,
              actual_wallet: newReferrerActual,
            })
            .eq("id", referrer.id);

          if (!updateReferrerError) {
            converted = true;
            convertedAmount = rewardAmount;

            // Generate unique conversion ID to link the two transactions
            const conversionId = crypto.randomUUID();

            // Log wallet transactions for referrer
            const { error: referralTransactionError } = await supabase.from("wallet_transactions").insert([
              {
                user_id: referrer.id,
                transaction_type: "debit",
                amount: rewardAmount,
                wallet_type: "virtual",
                kind: "adjustment",
                balance_after: newReferrerVirtual,
                order_id: order.id,
                description: `Referral reward conversion for order ${order.order_number} (referee: ${profile.id})`,
              },
              {
                user_id: referrer.id,
                transaction_type: "credit",
                amount: rewardAmount,
                wallet_type: "actual",
                kind: "referral_reward",
                balance_after: newReferrerActual,
                order_id: order.id,
                description: `Referral reward from order ${order.order_number} (referee: ${profile.id})`,
              },
            ]);

            if (!referralTransactionError) {
              console.log(`Referral reward: ₹${rewardAmount} converted for referrer ${referrer.id}`);
            } else {
              console.error("Error logging referral transactions:", referralTransactionError);
              failureReason = `Transaction logging failed: ${referralTransactionError.message}`;
            }
          } else {
            failureReason = "Failed to update referrer wallet";
          }
        } else {
          // Partial conversion if any balance available
          if (Number(referrer.virtual_wallet) > 0) {
            convertedAmount = Number(referrer.virtual_wallet);
            const newReferrerActual = Number(referrer.actual_wallet) + convertedAmount;

            await supabase
              .from("profiles")
              .update({
                virtual_wallet: 0,
                actual_wallet: newReferrerActual,
              })
              .eq("id", referrer.id);

            // Generate unique conversion ID for partial conversion
            const partialConversionId = crypto.randomUUID();

            const { error: partialTransactionError } = await supabase.from("wallet_transactions").insert([
              {
                user_id: referrer.id,
                transaction_type: "debit",
                amount: convertedAmount,
                wallet_type: "virtual",
                kind: "adjustment",
                balance_after: 0,
                order_id: order.id,
                description: `Partial referral reward conversion for order ${order.order_number} (referee: ${profile.id})`,
              },
              {
                user_id: referrer.id,
                transaction_type: "credit",
                amount: convertedAmount,
                wallet_type: "actual",
                kind: "referral_reward",
                balance_after: newReferrerActual,
                order_id: order.id,
                description: `Partial referral reward from order ${order.order_number} (referee: ${profile.id})`,
              },
            ]);

            if (partialTransactionError) {
              console.error("Error logging partial referral transactions:", partialTransactionError);
            } else {
              console.log(`Partial referral: ₹${convertedAmount} converted for referrer ${referrer.id}`);
            }
          }
          failureReason = `Insufficient virtual wallet balance. Required: ${rewardAmount}, Available: ${referrer.virtual_wallet}`;
        }

        // Log referral conversion attempt
        const { error: conversionLogError } = await supabase.from("referral_conversions").insert({
          order_id: order.id,
          referrer_id: referrer.id,
          referee_id: profile.id,
          order_value: deliveryAmount,
          reward_amount: rewardAmount,
          converted: converted,
          conversion_attempted_at: new Date().toISOString(),
          converted_at: converted ? new Date().toISOString() : null,
          failure_reason: failureReason,
        });

        if (conversionLogError) {
          console.error("Error logging referral conversion:", conversionLogError);
        } else {
          console.log(`Referral conversion logged for order ${order.order_number}`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Cashback and referral processed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing delivery cashback:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
