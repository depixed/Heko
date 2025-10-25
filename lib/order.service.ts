import { supabase } from './supabase';
import type { Database } from '@/types/database';

type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderInsert = Database['public']['Tables']['orders']['Insert'];
type OrderUpdate = Database['public']['Tables']['orders']['Update'];
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'];
type AddressRow = Database['public']['Tables']['user_addresses']['Row'];
type ProductRow = Database['public']['Tables']['products']['Row'];

export interface OrderWithRelations extends OrderRow {
  order_items?: OrderItemRow[];
  user_addresses?: AddressRow | null;
}

export interface CreateOrderData {
  userId: string;
  addressId: string;
  items: Array<{
    productId: string;
    productName: string;
    productImage: string;
    quantity: number;
    totalPrice: number;
    status?: string;
  }>;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  walletUsed: number;
  deliveryNotes?: string;
  deliveryWindow?: string; // ISO string if provided
}

export interface OrderFilters {
  status?: OrderRow['status'];
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export const orderService = {
  generateOrderNumber(): string {
    const now = new Date();
    const yyyy = now.getFullYear().toString();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePart = `${yyyy}${mm}${dd}`;
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `HEKO-${datePart}-${rand}`;
  },

  async generateUniqueOrderNumber(): Promise<string> {
    // Try a few times in the unlikely event of collision
    for (let i = 0; i < 5; i++) {
      const orderNumber = this.generateOrderNumber();
      const { data } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', orderNumber)
        .maybeSingle();
      if (!data) return orderNumber;
    }
    // Fallback with timestamp suffix
    const fallback = `HEKO-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    return fallback;
  },

  async createOrder(orderData: CreateOrderData): Promise<{ success: boolean; data?: OrderWithRelations; error?: string }> {
    try {
      console.log('[ORDER] Creating order for user:', orderData.userId);

      const deliveryOTP = Math.floor(100000 + Math.random() * 900000).toString();
      const orderNumber = await this.generateUniqueOrderNumber();

      const orderInsert: OrderInsert = {
        order_number: orderNumber,
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
        delivery_window:
          orderData.deliveryWindow && !Number.isNaN(Date.parse(orderData.deliveryWindow))
            ? new Date(orderData.deliveryWindow).toISOString()
            : null,
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
      // Fetch unit prices and product info from products table to ensure correctness
      const productIds = [...new Set(orderData.items.map(i => i.productId))];
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, images, price')
        .in('id', productIds);

      if (productsError) {
        console.error('[ORDER] Error fetching products for order items:', productsError);
        return { success: false, error: 'Failed to prepare order items' };
      }

      const productRows = (products ?? []) as Array<Pick<ProductRow, 'id' | 'name' | 'images' | 'price'>>;
      const productById = new Map<string, Pick<ProductRow, 'id' | 'name' | 'images' | 'price'>>(
        productRows.map((p) => [p.id, p])
      );

      const orderItems: OrderItemInsert[] = orderData.items.map(item => {
        const p = productById.get(item.productId);
        if (!p) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        const unitPrice = p.price;
        const firstImage = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : '';
        const totalPrice = unitPrice * item.quantity;
        return {
          order_id: orderId,
          product_id: item.productId,
          product_name: p.name,
          product_image: firstImage,
          quantity: item.quantity,
          unit_price: unitPrice,
          status: item.status ?? 'pending',
          total_price: totalPrice,
        };
      });

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
          order_items(*),
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
          order_items(*),
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
