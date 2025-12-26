import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Haversine formula to calculate distance between two coordinates in km
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: "order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[auto-assign-order] Processing order: ${order_id}`);

    // Check vendor assignment mode
    const { data: modeSettings, error: modeError } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "vendor_assignment_mode")
      .single();

    if (modeError) {
      console.error("[auto-assign-order] Error fetching mode:", modeError);
      // Default to single mode if setting not found
    }

    const assignmentMode = modeSettings?.value || "single";
    console.log(`[auto-assign-order] Assignment mode: ${assignmentMode}`);

    // If multi-vendor mode, skip auto-assignment
    if (assignmentMode === "multi") {
      console.log("[auto-assign-order] Multi-vendor mode active, skipping auto-assignment");
      return new Response(
        JSON.stringify({ success: true, message: "Multi-vendor mode - manual assignment required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order with address details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        user_id,
        total,
        status,
        address_id,
        user_addresses!address_id(lat, lng, address_line1, address_line2, city, state, pincode)
      `)
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      console.error("[auto-assign-order] Order not found:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if order is in 'placed' status
    if (order.status !== "placed") {
      console.log(`[auto-assign-order] Order status is ${order.status}, not 'placed'. Skipping.`);
      return new Response(
        JSON.stringify({ success: true, message: "Order already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const address = order.user_addresses as any;
    const customerLat = address?.lat;
    const customerLng = address?.lng;

    if (!customerLat || !customerLng) {
      console.error("[auto-assign-order] Customer address missing coordinates");
      
      // Mark order as unfulfillable
      await supabase
        .from("orders")
        .update({ status: "unfulfillable" })
        .eq("id", order_id);

      // Notify admin
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        role: "admin",
        type: "assignment_failed",
        title: "Order Assignment Failed",
        message: `Order ${order.order_number} cannot be assigned: Customer address missing coordinates`,
        priority: "high",
        entity_id: order_id,
        data: {
          deep_link: `/orders/${order_id}`,
          entity_type: "order",
          order_id: order_id,
          order_number: order.order_number,
          reason: "missing_coordinates",
        },
      });

      return new Response(
        JSON.stringify({ error: "Customer address missing coordinates", unfulfillable: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch system service radius
    const { data: radiusSettings } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "service_radius")
      .single();

    const systemServiceRadius = radiusSettings?.value || 5;
    console.log(`[auto-assign-order] System service radius: ${systemServiceRadius}km`);

    // Fetch all active vendors with location data
    const { data: vendors, error: vendorsError } = await supabase
      .from("vendors")
      .select("id, business_name, address, latitude, longitude, service_radius")
      .eq("status", "active");

    if (vendorsError || !vendors || vendors.length === 0) {
      console.error("[auto-assign-order] No active vendors found:", vendorsError);
      
      // Mark order as unfulfillable
      await supabase
        .from("orders")
        .update({ status: "unfulfillable" })
        .eq("id", order_id);

      // Notify admin
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        role: "admin",
        type: "assignment_failed",
        title: "Order Assignment Failed",
        message: `Order ${order.order_number} cannot be assigned: No active vendors available`,
        priority: "high",
        entity_id: order_id,
        data: {
          deep_link: `/orders/${order_id}`,
          entity_type: "order",
          order_id: order_id,
          order_number: order.order_number,
          reason: "no_vendors",
        },
      });

      return new Response(
        JSON.stringify({ error: "No active vendors available", unfulfillable: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate distances and filter vendors within service radius
    const vendorsWithDistance = vendors
      .filter((v) => v.latitude && v.longitude)
      .map((vendor) => {
        const distance = calculateDistance(
          customerLat,
          customerLng,
          vendor.latitude!,
          vendor.longitude!
        );
        const effectiveRadius = Math.min(vendor.service_radius || systemServiceRadius, systemServiceRadius);
        return { ...vendor, distance, effectiveRadius };
      })
      .filter((v) => v.distance <= v.effectiveRadius)
      .sort((a, b) => a.distance - b.distance);

    console.log(`[auto-assign-order] Eligible vendors: ${vendorsWithDistance.length}`);

    if (vendorsWithDistance.length === 0) {
      console.error("[auto-assign-order] No vendors within service radius");
      
      // Mark order as unfulfillable
      await supabase
        .from("orders")
        .update({ status: "unfulfillable" })
        .eq("id", order_id);

      // Notify admin
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        role: "admin",
        type: "assignment_failed",
        title: "Order Assignment Failed",
        message: `Order ${order.order_number} cannot be assigned: No vendors within ${systemServiceRadius}km service radius`,
        priority: "high",
        entity_id: order_id,
        data: {
          deep_link: `/orders/${order_id}`,
          entity_type: "order",
          order_id: order_id,
          order_number: order.order_number,
          reason: "no_vendors_in_radius",
        },
      });

      return new Response(
        JSON.stringify({ error: "No vendors within service radius", unfulfillable: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Select nearest vendor
    const selectedVendor = vendorsWithDistance[0];
    console.log(`[auto-assign-order] Selected vendor: ${selectedVendor.business_name} (${selectedVendor.distance.toFixed(2)}km away)`);

    // Fetch all order items
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("id")
      .eq("order_id", order_id);

    if (itemsError || !orderItems || orderItems.length === 0) {
      console.error("[auto-assign-order] No order items found:", itemsError);
      return new Response(
        JSON.stringify({ error: "No order items found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const itemIds = orderItems.map((item) => item.id);

    // Assign all items to selected vendor
    const { error: assignError } = await supabase
      .from("order_items")
      .update({ vendor_id: selectedVendor.id, status: "accepted" })
      .in("id", itemIds);

    if (assignError) {
      console.error("[auto-assign-order] Error assigning items:", assignError);
      throw assignError;
    }

    // Format delivery address
    const deliveryAddress = `${address.address_line1}${address.address_line2 ? ", " + address.address_line2 : ""}, ${address.city}, ${address.state} ${address.pincode}`;

    // Generate OTP for delivery
    const otp = generateOTP();

    // Create delivery record
    const { data: delivery, error: deliveryError } = await supabase
      .from("deliveries")
      .insert({
        order_id: order_id,
        vendor_id: selectedVendor.id,
        pickup_address: selectedVendor.address,
        delivery_address: deliveryAddress,
        otp: otp,
        status: "assigned",
      })
      .select("id")
      .single();

    if (deliveryError) {
      console.error("[auto-assign-order] Error creating delivery:", deliveryError);
      throw deliveryError;
    }

    // Link order items to delivery
    const deliveryItems = itemIds.map((itemId) => ({
      delivery_id: delivery.id,
      order_item_id: itemId,
    }));

    const { error: deliveryItemsError } = await supabase
      .from("delivery_items")
      .insert(deliveryItems);

    if (deliveryItemsError) {
      console.error("[auto-assign-order] Error creating delivery items:", deliveryItemsError);
      throw deliveryItemsError;
    }

    // Update order status to processing
    const { error: orderUpdateError } = await supabase
      .from("orders")
      .update({ status: "processing" })
      .eq("id", order_id);

    if (orderUpdateError) {
      console.error("[auto-assign-order] Error updating order status:", orderUpdateError);
      throw orderUpdateError;
    }

    // Get vendor's user_id for notification
    const { data: vendorUser } = await supabase
      .from("vendors")
      .select("user_id")
      .eq("id", selectedVendor.id)
      .single();

    // Notify vendor about new order (using order's user_id with vendor role)
    if (order.user_id) {
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        role: "vendor",
        type: "order_auto_assigned",
        title: "New Order Assigned",
        message: `Order ${order.order_number} has been auto-assigned to you. Total: ₹${order.total}`,
        priority: "high",
        entity_id: order_id,
        data: {
          deep_link: `/vendor/orders`,
          entity_type: "order",
          order_id: order_id,
          order_number: order.order_number,
          total: order.total,
          vendor_id: selectedVendor.id,
          action_required: true,
        },
      });
    }

    console.log(`[auto-assign-order] Successfully assigned order ${order.order_number} to ${selectedVendor.business_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        vendor_id: selectedVendor.id,
        vendor_name: selectedVendor.business_name,
        distance_km: selectedVendor.distance.toFixed(2),
        delivery_id: delivery.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[auto-assign-order] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
