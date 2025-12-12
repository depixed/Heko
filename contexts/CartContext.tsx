import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { cartService, type CartItemWithProduct } from '@/lib/cart.service';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useVendorAssignment } from './VendorAssignmentContext';
import type { Product } from '@/types';

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  isLoading: boolean;
  addToCart: (item: CartItem) => Promise<void>;
  updateCartItem: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { activeVendorId, mode } = useVendorAssignment();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const prevActiveVendorId = useRef<string | null>(null);

  const refreshCart = useCallback(async () => {
    if (!user?.id) {
      setCart([]);
      return;
    }

    setIsLoading(true);
    try {
      const result = await cartService.getCartItems(user.id);
      if (result.success && result.data) {
        const cartItems: CartItem[] = result.data
          .filter((item): item is CartItemWithProduct & { products: NonNullable<CartItemWithProduct['products']> } => 
            item.products !== null && item.products !== undefined
          )
          .map((item) => ({
            product: {
              id: item.products.id,
              name: item.products.name,
              description: item.products.description,
              image: item.products.image,
              images: item.products.images,
              price: item.products.price,
              mrp: item.products.mrp,
              discount: item.products.discount,
              unit: item.products.unit,
              inStock: item.products.in_stock,
              tags: item.products.tags,
              category: '',
              subcategory: '',
            },
            quantity: item.quantity,
          }));
        setCart(cartItems);
      }
    } catch (error) {
      console.error('[CART] Error refreshing cart:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // Clear cart when active vendor changes in single mode
  useEffect(() => {
    if (mode === 'single' && activeVendorId !== prevActiveVendorId.current) {
      if (prevActiveVendorId.current !== null && cart.length > 0) {
        console.log('[Cart] Active vendor changed - clearing cart');
        clearCart();
      }
      prevActiveVendorId.current = activeVendorId;
    }
  }, [activeVendorId, mode, cart.length, clearCart]);

  // Real-time subscription for cart items
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('cart-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('[CartContext] Cart change detected, refreshing cart...');
          refreshCart();
        }
      )
      .subscribe();

    return () => {
      console.log('[CartContext] Unsubscribing from cart updates');
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshCart]);

  const addToCart = useCallback(async (item: CartItem) => {
    if (!user?.id) return;

    const result = await cartService.addToCart(user.id, item.product.id, item.quantity);
    if (result.success) {
      await refreshCart();
    }
  }, [user?.id, refreshCart]);

  const updateCartItem = useCallback(async (productId: string, quantity: number) => {
    if (!user?.id) return;

    const result = await cartService.updateCartItem(user.id, productId, quantity);
    if (result.success || quantity === 0) {
      await refreshCart();
    }
  }, [user?.id, refreshCart]);

  const clearCart = useCallback(async () => {
    if (!user?.id) return;

    const result = await cartService.clearCart(user.id);
    if (result.success) {
      setCart([]);
    }
  }, [user?.id]);

  const value = useMemo(
    () => ({
      cart,
      isLoading,
      addToCart,
      updateCartItem,
      clearCart,
      refreshCart,
    }),
    [cart, isLoading, addToCart, updateCartItem, clearCart, refreshCart]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
