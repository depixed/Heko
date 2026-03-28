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

    // 1. Check if cashback has already been processed for this order
    const { data: existingCashback } = await supabase
      .from("wallet_transactions")
      .select("id, amount")
      .eq("order_id", order.id)
      .eq("kind", "cashback")
      .eq("wallet_type", "virtual")
      .eq("transaction_type", "credit")
      .maybeSingle();

    let cashbackAmount = 0;
    
    if (!existingCashback) {
      // Credit cashback to user's virtual wallet based on system settings
      cashbackAmount = (Number(deliveryAmount) * Number(cashbackPercentage)) / 100;
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
    } else {
      console.log(`Cashback already processed for order ${order.order_number}`);
      cashbackAmount = existingCashback.amount || 0;
    }

    // Notify customer about cashback
    try {
      console.log("Attempting to send cashback notification:", {
        event_type: "cashback_credited",
        user_id: profile.id,
        order_id: order.id,
        amount: cashbackAmount,
      });

      const notifyResponse = await supabase.functions.invoke("notify-customer-events", {
        body: {
          event_type: "cashback_credited",
          user_id: profile.id,
          order_id: order.id,
          additional_data: {
            amount: cashbackAmount,
            order_number: order.order_number,
          },
        },
      });

      if (notifyResponse.error) {
        console.error("Error sending cashback notification:", notifyResponse.error);
        console.error("Cashback notification error details:", JSON.stringify(notifyResponse.error, null, 2));
      } else {
        console.log("Cashback notification sent successfully:", notifyResponse.data);
      }
    } catch (notifError) {
      console.error("Error sending cashback notification:", notifError);
      console.error("Cashback notification error stack:", notifError instanceof Error ? notifError.stack : "No stack");
      // Don't fail the whole operation if notification fails
    }

    // 2. Handle referral reward if user was referred
    if (profile.referred_by) {
      // Check if referral reward has already been processed for this order
      const { data: existingReferral } = await supabase
        .from("wallet_transactions")
        .select("id")
        .eq("order_id", order.id)
        .eq("kind", "referral_reward")
        .eq("wallet_type", "actual")
        .eq("transaction_type", "credit")
        .maybeSingle();

      if (existingReferral) {
        console.log(`Referral reward already processed for order ${order.order_number}`);
      } else {
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

                // Notify referrer about referral reward
                try {
                  const notifyResponse = await supabase.functions.invoke("notify-customer-events", {
                    body: {
                      event_type: "referral_reward",
                      user_id: referrer.id,
                      order_id: order.id,
                      additional_data: {
                        amount: rewardAmount,
                        order_number: order.order_number,
                      },
                    },
                  });

                  if (notifyResponse.error) {
                    console.error("Error sending referral notification:", notifyResponse.error);
                  } else {
                    console.log("Referral notification sent successfully:", notifyResponse.data);
                  }
                } catch (notifError) {
                  console.error("Error sending referral notification:", notifError);
                }

                // Also notify about wallet conversion
                try {
                  const conversionNotifyResponse = await supabase.functions.invoke("notify-customer-events", {
                    body: {
                      event_type: "wallet_conversion",
                      user_id: referrer.id,
                      order_id: order.id,
                      additional_data: {
                        amount: rewardAmount,
                        order_number: order.order_number,
                      },
                    },
                  });

                  if (conversionNotifyResponse.error) {
                    console.error("Error sending wallet conversion notification:", conversionNotifyResponse.error);
                  } else {
                    console.log("Wallet conversion notification sent successfully:", conversionNotifyResponse.data);
                  }
                } catch (conversionNotifError) {
                  console.error("Error sending wallet conversion notification:", conversionNotifError);
                }
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

              if (!partialTransactionError) {
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
