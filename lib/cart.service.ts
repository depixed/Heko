import { supabase } from './supabase';
import type { Database } from '@/types/database';

type CartItemRow = Database['public']['Tables']['cart_items']['Row'];
type CartItemInsert = Database['public']['Tables']['cart_items']['Insert'];
type CartItemUpdate = Database['public']['Tables']['cart_items']['Update'];
type ProductRow = Database['public']['Tables']['products']['Row'];

export interface CartItemWithProduct extends CartItemRow {
  products?: ProductRow | null;
}

export const cartService = {
  async getCartItems(userId: string): Promise<{ success: boolean; data?: CartItemWithProduct[]; error?: string }> {
    try {
      console.log('[CART] Fetching cart items for user:', userId);

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          products(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[CART] Error fetching cart items:', error);
        return { success: false, error: 'Failed to fetch cart items' };
      }

      console.log(`[CART] Fetched ${data?.length || 0} cart items`);
      return { success: true, data: data as CartItemWithProduct[] };
    } catch (error) {
      console.error('[CART] Error fetching cart items:', error);
      return { success: false, error: 'Failed to fetch cart items' };
    }
  },

  async addToCart(userId: string, productId: string, quantity: number): Promise<{ success: boolean; data?: CartItemWithProduct; error?: string }> {
    try {
      console.log('[CART] Adding item to cart:', { userId, productId, quantity });

      const { data: existing, error: fetchError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .maybeSingle();

      if (fetchError) {
        console.error('[CART] Error checking existing cart item:', fetchError);
        return { success: false, error: 'Failed to check cart' };
      }

      if (existing) {
        return await this.updateCartItem(userId, productId, existing.quantity + quantity);
      }

      const cartInsert: CartItemInsert = {
        user_id: userId,
        product_id: productId,
        quantity,
      };

      const { data, error } = await supabase
        .from('cart_items')
        .insert(cartInsert as any)
        .select(`
          *,
          products(*)
        `)
        .single();

      if (error || !data) {
        console.error('[CART] Error adding to cart:', error);
        return { success: false, error: 'Failed to add item to cart' };
      }

      console.log('[CART] Item added to cart successfully');
      return { success: true, data: data as CartItemWithProduct };
    } catch (error) {
      console.error('[CART] Error adding to cart:', error);
      return { success: false, error: 'Failed to add item to cart' };
    }
  },

  async updateCartItem(userId: string, productId: string, quantity: number): Promise<{ success: boolean; data?: CartItemWithProduct; error?: string }> {
    try {
      console.log('[CART] Updating cart item:', { userId, productId, quantity });

      if (quantity <= 0) {
        return await this.removeFromCart(userId, productId);
      }

      const updateData: CartItemUpdate = {
        quantity,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('cart_items')
        // @ts-expect-error - Supabase type inference issue
        .update(updateData)
        .eq('user_id', userId)
        .eq('product_id', productId)
        .select(`
          *,
          products(*)
        `)
        .single();

      if (error || !data) {
        console.error('[CART] Error updating cart item:', error);
        return { success: false, error: 'Failed to update cart item' };
      }

      console.log('[CART] Cart item updated successfully');
      return { success: true, data: data as CartItemWithProduct };
    } catch (error) {
      console.error('[CART] Error updating cart item:', error);
      return { success: false, error: 'Failed to update cart item' };
    }
  },

  async removeFromCart(userId: string, productId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[CART] Removing item from cart:', { userId, productId });

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error) {
        console.error('[CART] Error removing from cart:', error);
        return { success: false, error: 'Failed to remove item from cart' };
      }

      console.log('[CART] Item removed from cart successfully');
      return { success: true };
    } catch (error) {
      console.error('[CART] Error removing from cart:', error);
      return { success: false, error: 'Failed to remove item from cart' };
    }
  },

  async clearCart(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[CART] Clearing cart for user:', userId);

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('[CART] Error clearing cart:', error);
        return { success: false, error: 'Failed to clear cart' };
      }

      console.log('[CART] Cart cleared successfully');
      return { success: true };
    } catch (error) {
      console.error('[CART] Error clearing cart:', error);
      return { success: false, error: 'Failed to clear cart' };
    }
  },
};
