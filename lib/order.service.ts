import { supabase } from './supabase';
import type { Database } from '@/types/database';

type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderInsert = Database['public']['Tables']['orders']['Insert'];
type OrderUpdate = Database['public']['Tables']['orders']['Update'];
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'];
type ProductRow = Database['public']['Tables']['products']['Row'];
type AddressRow = Database['public']['Tables']['user_addresses']['Row'];

export interface OrderWithRelations extends OrderRow {
  order_items?: (OrderItemRow & {
    products?: Pick<ProductRow, 'name' | 'image' | 'unit'> | null;
  })[];
  user_addresses?: AddressRow | null;
}

export interface CreateOrderData {
  userId: string;
  addressId: string;
  items: Array<{
    productId: string;
    vendorId: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  walletUsed: number;
  deliveryNotes?: string;
  deliveryWindow?: string;
}

export interface OrderFilters {
  status?: OrderRow['status'];
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export const orderService = {
  async createOrder(orderData: CreateOrderData): Promise<{ success: boolean; data?: OrderWithRelations; error?: string }> {
    try {
      console.log('[ORDER] Creating order for user:', orderData.userId);

      const deliveryOTP = Math.floor(100000 + Math.random() * 900000).toString();

      const orderInsert: OrderInsert = {
        user_id: orderData.userId,
        address_id: orderData.addressId,
        status: 'processing',
        subtotal: orderData.subtotal,
        discount: orderData.discount,
        delivery_fee: orderData.deliveryFee,
        total: orderData.total,
        wallet_used: orderData.walletUsed,
        delivery_notes: orderData.deliveryNotes || null,
        delivery_otp: deliveryOTP,
        delivery_window: orderData.deliveryWindow || null,
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderInsert as any)
        .select()
        .single();

      if (orderError || !order) {
        console.error('[ORDER] Error creating order:', orderError);
        return { success: false, error: 'Failed to create order' };
      }

      const orderId = (order as OrderRow).id;
      const orderItems: OrderItemInsert[] = orderData.items.map(item => ({
        order_id: orderId,
        product_id: item.productId,
        vendor_id: item.vendorId,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems as any);

      if (itemsError) {
        console.error('[ORDER] Error creating order items:', itemsError);
        return { success: false, error: 'Failed to create order items' };
      }

      console.log('[ORDER] Order created successfully:', orderId);
      return await this.getOrderById(orderId);
    } catch (error) {
      console.error('[ORDER] Error creating order:', error);
      return { success: false, error: 'Failed to create order' };
    }
  },

  async getOrders(userId: string, filters?: OrderFilters): Promise<{ success: boolean; data?: OrderWithRelations[]; error?: string }> {
    try {
      console.log('[ORDER] Fetching orders for user:', userId);

      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            products(name, image, unit)
          ),
          user_addresses(*)
        `)
        .eq('user_id', userId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.fromDate) {
        query = query.gte('created_at', filters.fromDate);
      }

      if (filters?.toDate) {
        query = query.lte('created_at', filters.toDate);
      }

      query = query.order('created_at', { ascending: false });

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[ORDER] Error fetching orders:', error);
        return { success: false, error: 'Failed to fetch orders' };
      }

      console.log(`[ORDER] Fetched ${data?.length || 0} orders`);
      return { success: true, data: data as OrderWithRelations[] };
    } catch (error) {
      console.error('[ORDER] Error fetching orders:', error);
      return { success: false, error: 'Failed to fetch orders' };
    }
  },

  async getOrderById(orderId: string): Promise<{ success: boolean; data?: OrderWithRelations; error?: string }> {
    try {
      console.log('[ORDER] Fetching order:', orderId);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            products(name, image, unit)
          ),
          user_addresses(*)
        `)
        .eq('id', orderId)
        .maybeSingle();

      if (error || !data) {
        console.error('[ORDER] Error fetching order:', error);
        return { success: false, error: 'Order not found' };
      }

      console.log('[ORDER] Fetched order:', orderId);
      return { success: true, data: data as OrderWithRelations };
    } catch (error) {
      console.error('[ORDER] Error fetching order:', error);
      return { success: false, error: 'Failed to fetch order' };
    }
  },

  async updateOrderStatus(orderId: string, status: OrderRow['status']): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[ORDER] Updating order status:', orderId, status);

      const updateData: OrderUpdate = {
        status,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('orders')
        // @ts-expect-error - Supabase type inference issue
        .update(updateData)
        .eq('id', orderId);

      if (error) {
        console.error('[ORDER] Error updating order status:', error);
        return { success: false, error: 'Failed to update order status' };
      }

      console.log('[ORDER] Order status updated successfully');
      return { success: true };
    } catch (error) {
      console.error('[ORDER] Error updating order status:', error);
      return { success: false, error: 'Failed to update order status' };
    }
  },

  async cancelOrder(orderId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[ORDER] Canceling order:', orderId, reason);

      const updateData: OrderUpdate = {
        status: 'canceled',
        delivery_notes: reason || 'Canceled by user',
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('orders')
        // @ts-expect-error - Supabase type inference issue
        .update(updateData)
        .eq('id', orderId);

      if (error) {
        console.error('[ORDER] Error canceling order:', error);
        return { success: false, error: 'Failed to cancel order' };
      }

      console.log('[ORDER] Order canceled successfully');
      return { success: true };
    } catch (error) {
      console.error('[ORDER] Error canceling order:', error);
      return { success: false, error: 'Failed to cancel order' };
    }
  },
};
