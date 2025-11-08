import { supabase } from './supabase';
import { walletService } from './wallet.service';
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
  contactlessDelivery?: boolean;
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
        status: 'placed',
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
        contactless_delivery: orderData.contactlessDelivery ?? false,
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

      // Process wallet payment if wallet was used
      if (orderData.walletUsed > 0) {
        console.log('[ORDER] Processing wallet payment:', orderData.walletUsed);
        const walletResult = await walletService.redeemWallet(
          orderData.userId, 
          orderData.walletUsed, 
          orderId
        );

        if (!walletResult.success) {
          console.error('[ORDER] Wallet payment failed:', walletResult.error);
          // Rollback the order creation
          await supabase.from('orders').delete().eq('id', orderId);
          return { success: false, error: walletResult.error || 'Wallet payment failed' };
        }
        console.log('[ORDER] Wallet payment processed successfully');
      }

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
        // Extract first image and validate it's a valid URL
        // Store the actual Supabase image URL, or empty string if none exists
        // UI will handle placeholder display
        let firstImage = '';
        if (Array.isArray(p.images) && p.images.length > 0) {
          const imageUrl = p.images[0];
          // Only use if it's a valid HTTP/HTTPS URL (Supabase storage URLs)
          if (imageUrl && 
              typeof imageUrl === 'string' && 
              (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) &&
              !imageUrl.startsWith('blob:') && 
              !imageUrl.includes('localhost')) {
            firstImage = imageUrl;
            console.log('[ORDER] Storing product image URL:', firstImage, 'for product:', p.name);
          } else {
            console.warn('[ORDER] Invalid image URL format:', imageUrl, 'for product:', p.name);
          }
        } else {
          console.warn('[ORDER] No images array found for product:', p.name);
        }
        // Store empty string if no valid image - UI will show placeholder component
        // Don't store placeholder URL that might fail to load
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

  async processDeliveryCashback(orderId: string, deliveryAmount: number): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[ORDER] Processing delivery cashback for order:', orderId, deliveryAmount);

      const { data, error } = await supabase.functions.invoke('process-delivery-cashback', {
        body: { orderId, deliveryAmount },
      });

      if (error) {
        console.error('[ORDER] Error processing cashback:', error);
        return { success: false, error: 'Failed to process cashback' };
      }

      if (!data?.success) {
        console.error('[ORDER] Cashback processing failed:', data?.error);
        return { success: false, error: data?.error || 'Cashback processing failed' };
      }

      console.log('[ORDER] Cashback processed successfully');
      return { success: true };
    } catch (error) {
      console.error('[ORDER] Error processing delivery cashback:', error);
      return { success: false, error: 'Failed to process delivery cashback' };
    }
  },
};
