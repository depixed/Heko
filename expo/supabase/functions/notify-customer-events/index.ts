import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let requestBody;
    try {
      requestBody = await req.json();
      console.log(
        "Received request body:",
        JSON.stringify({
          event_type: requestBody?.event_type,
          user_id: requestBody?.user_id,
          order_id: requestBody?.order_id,
          has_additional_data: !!requestBody?.additional_data,
        }),
      );
    } catch (jsonError) {
      console.error("Error parsing request body:", jsonError);
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { event_type, user_id, order_id, additional_data } = requestBody;

    // Log extracted values for debugging
    console.log("Extracted values:", {
      event_type,
      user_id,
      order_id,
      user_id_type: typeof user_id,
      user_id_length: user_id?.length,
    });

    // Validate inputs with strict checks
    if (!event_type || typeof event_type !== "string") {
      return new Response(JSON.stringify({ error: "event_type is required and must be a string" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!user_id || typeof user_id !== "string" || user_id.trim() === "") {
      console.error("Invalid user_id received:", { user_id, type: typeof user_id, requestBody });
      return new Response(
        JSON.stringify({
          error: "user_id is required and must be a non-empty string",
          received: user_id,
          receivedType: typeof user_id,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Ensure user_id is a valid UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user_id)) {
      console.error("Invalid user_id format:", user_id);
      return new Response(
        JSON.stringify({
          error: "user_id must be a valid UUID",
          received: user_id,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate that user exists in profiles table
    const { data: userProfile, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .maybeSingle();

    if (userError) {
      console.error("Error checking user existence:", userError);
      return new Response(
        JSON.stringify({
          error: "Failed to validate user",
          details: userError.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!userProfile) {
      console.error("User not found in profiles table:", user_id);
      return new Response(
        JSON.stringify({
          error: "User not found",
          details: `User ID ${user_id} does not exist in profiles table`,
          hint: "Ensure the user_id references a valid profile.id",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get user preferences (defaults if not set)
    // Don't fail if preferences table doesn't exist or query fails
    let userLocale = "en";
    try {
      const { data: preferences, error: prefError } = await supabase
        .from("user_notification_preferences")
        .select("*")
        .eq("user_id", user_id)
        .eq("type", event_type)
        .maybeSingle();

      if (!prefError && preferences) {
        userLocale = preferences.locale || "en";
      }
    } catch (prefErr) {
      console.warn("Could not fetch user preferences, using defaults:", prefErr);
    }

    // Get template for this event type and locale
    // Don't fail if templates table doesn't exist
    let finalTemplate = null;
    try {
      const { data: template, error: templateError } = await supabase
        .from("notification_templates")
        .select("*")
        .eq("type", event_type)
        .eq("locale", userLocale)
        .maybeSingle();

      if (!templateError && template) {
        finalTemplate = template;
      } else if (userLocale !== "en") {
        // Try English as fallback
        const { data: fallbackTemplate } = await supabase
          .from("notification_templates")
          .select("*")
          .eq("type", event_type)
          .eq("locale", "en")
          .maybeSingle();
        if (fallbackTemplate) {
          finalTemplate = fallbackTemplate;
        }
      }
    } catch (templateErr) {
      console.warn("Could not fetch template, using fallback:", templateErr);
    }

    // Generate notification content based on event type
    let title = "";
    let message = "";
    let priority: "high" | "medium" | "low" = "medium";
    let deep_link = "";
    let channels: string[] = ["in_app"];

    if (finalTemplate) {
      // Use template with variable substitution
      title = renderTemplate(finalTemplate.title_template, additional_data || {});
      message = renderTemplate(finalTemplate.message_template, additional_data || {});
      priority = finalTemplate.priority as "high" | "medium" | "low";
      channels = Array.isArray(finalTemplate.channels) ? finalTemplate.channels : ["in_app"];
    } else {
      // Fallback to hardcoded templates if no template found
      switch (event_type) {
        case "order_confirmed":
          title = "Order Confirmed!";
          message = `Your order #${additional_data?.order_number || order_id?.slice(-6)} has been placed`;
          priority = "medium";
          deep_link = `/order/${order_id}`;
          channels = ["push", "in_app"];
          break;

        case "order_accepted":
          title = "Order Accepted";
          message = `Vendor has accepted your order #${additional_data?.order_number || order_id?.slice(-6)}`;
          priority = "medium";
          deep_link = `/order/${order_id}`;
          channels = ["push", "in_app"];
          break;

        case "order_preparing":
          title = "Order Preparing";
          message = `Your order #${additional_data?.order_number || order_id?.slice(-6)} is being prepared`;
          priority = "medium";
          deep_link = `/order/${order_id}`;
          channels = ["push", "in_app"];
          break;

        case "order_out_for_delivery":
          title = "On the Way!";
          message = `Your order is out for delivery. OTP: ${additional_data?.otp || "N/A"}`;
          priority = "high";
          deep_link = `/order/${order_id}`;
          channels = ["push", "sms", "in_app"];
          break;

        case "order_delivered":
          title = "Delivered Successfully";
          message = `Order delivered! ₹${additional_data?.cashback || 0} added to wallet`;
          priority = "high";
          deep_link = `/order/${order_id}`;
          channels = ["push", "in_app"];
          break;

        case "order_partially_delivered":
          title = "Partially Delivered";
          message = `Some items in order #${additional_data?.order_number || order_id?.slice(-6)} couldn't be fulfilled`;
          priority = "medium";
          deep_link = `/order/${order_id}`;
          channels = ["push", "in_app"];
          break;

        case "order_cancelled":
          title = "Order Cancelled";
          message = `Your order #${additional_data?.order_number || order_id?.slice(-6)} has been cancelled`;
          priority = "medium";
          deep_link = `/order/${order_id}`;
          channels = ["push", "in_app"];
          break;

        case "cashback_credited":
          title = "Cashback Received!";
          message = `₹${additional_data?.amount || 0} added to your virtual wallet`;
          priority = "medium";
          deep_link = "/wallet";
          channels = ["push", "in_app"];
          break;

        case "referral_reward":
          title = "Referral Reward!";
          message = `₹${additional_data?.amount || 0} earned! Your friend used your referral code`;
          priority = "medium";
          deep_link = "/wallet";
          channels = ["push", "in_app"];
          break;

        case "wallet_conversion":
          title = "Wallet Conversion";
          message = `₹${additional_data?.amount || 0} moved from virtual to actual wallet`;
          priority = "medium";
          deep_link = "/wallet";
          channels = ["push", "in_app"];
          break;

        case "return_approved":
          title = "Return Approved";
          message = `Your return request for order #${additional_data?.order_number || order_id?.slice(-6)} has been approved`;
          priority = "medium";
          deep_link = `/order/${order_id}`;
          channels = ["push", "in_app"];
          break;

        case "return_pickup_scheduled":
          title = "Pickup Scheduled";
          message = `Pickup partner will arrive soon. OTP: ${additional_data?.otp || "N/A"}`;
          priority = "high";
          deep_link = `/order/${order_id}`;
          channels = ["push", "sms", "in_app"];
          break;

        case "refund_processed":
          title = "Refund Processed";
          message = `₹${additional_data?.amount || 0} refunded to your actual wallet`;
          priority = "medium";
          deep_link = "/wallet";
          channels = ["push", "in_app"];
          break;

        case "promotional_offer":
          title = "New Offer!";
          message = additional_data?.message || "Check out our latest offers";
          priority = "low";
          deep_link = additional_data?.deep_link || "/";
          channels = ["push", "in_app"];
          break;

        case "order_reminder":
          title = "Complete Your Order";
          message = `Complete your pending order #${additional_data?.order_number || order_id?.slice(-6)}`;
          priority = "low";
          deep_link = `/order/${order_id}`;
          channels = ["push", "in_app"];
          break;

        default:
          return new Response(JSON.stringify({ error: "Unknown event type" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
      }
    }

    // Build data JSONB object
    const notificationData = {
      deep_link: deep_link || `/order/${order_id}`,
      order_id: order_id || null,
      ...additional_data,
    };

    // Insert notification directly using current schema
    // The notifications table has: user_id, role, type, title, message, priority, entity_id, data, read
    console.log("Preparing to insert notification:", {
      user_id,
      event_type,
      has_order_id: !!order_id,
      has_additional_data: !!additional_data
    });

    const insertData = {
      user_id: user_id,
      role: null, // Customer notifications have no role
      type: event_type,
      title: title,
      message: message,
      priority: priority || "medium",
      entity_id: order_id || null,
      data: notificationData,
      read: false,
    };

    console.log("Inserting notification with data structure:", {
      has_user_id: !!insertData.user_id,
      user_id_value: insertData.user_id,
      type: insertData.type,
      title: insertData.title,
    });

    const { data, error } = await supabase
      .from("notifications")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      return new Response(
        JSON.stringify({
          error: "Failed to create notification",
          details: error.message,
          code: error.code,
          hint: error.hint || "Check database logs for more details",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // TODO: Send push notification if enabled and channel includes 'push'
    // TODO: Send SMS if enabled and channel includes 'sms'
    // These will be implemented in Phase 2 and Phase 3

    return new Response(JSON.stringify({ success: true, notification: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in notify-customer-events:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: errorMessage,
        stack: errorStack,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// Helper function to render template with variables
function renderTemplate(template: string, variables: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, "g"), String(value || ""));
  }
  return result;
}
§