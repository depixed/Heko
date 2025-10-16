import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { orderService, OrderWithRelations } from '@/lib/order.service';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { Database } from '@/types/database';

type OrderStatus = Database['public']['Tables']['orders']['Row']['status'];

export const [OrderProvider, useOrders] = createContextHook(() => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);

  const loadOrders = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoadingOrders(true);
      console.log('[OrderContext] Loading orders for user:', user.id);
      const result = await orderService.getOrders(user.id);
      if (result.success && result.data) {
        setOrders(result.data);
        console.log('[OrderContext] Orders loaded:', result.data.length);
      }
    } catch (error) {
      console.error('[OrderContext] Error loading orders:', error);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [user?.id]);

  const subscribeToOrders = useCallback(() => {
    if (!user?.id) return;

    console.log('[OrderContext] Subscribing to order updates for user:', user.id);

    const subscription = supabase
      .channel('order_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[OrderContext] Order change detected:', payload);
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      console.log('[OrderContext] Unsubscribing from order updates');
      subscription.unsubscribe();
    };
  }, [user?.id, loadOrders]);

  useEffect(() => {
    if (user) {
      loadOrders();
      subscribeToOrders();
    } else {
      setOrders([]);
      setIsLoadingOrders(false);
    }
  }, [user, loadOrders, subscribeToOrders]);

  const getOrderById = useCallback(async (orderId: string): Promise<OrderWithRelations | null> => {
    try {
      console.log('[OrderContext] Fetching order:', orderId);
      const result = await orderService.getOrderById(orderId);
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('[OrderContext] Error fetching order:', error);
      return null;
    }
  }, []);

  const getOrdersByStatus = useCallback((status: OrderStatus): OrderWithRelations[] => {
    return orders.filter(order => order.status === status);
  }, [orders]);

  const getActiveOrders = useCallback((): OrderWithRelations[] => {
    const activeStatuses: OrderStatus[] = ['processing', 'preparing', 'out_for_delivery'];
    return orders.filter(order => activeStatuses.includes(order.status));
  }, [orders]);

  const getPastOrders = useCallback((): OrderWithRelations[] => {
    const pastStatuses: OrderStatus[] = ['delivered', 'canceled', 'unfulfillable', 'returned'];
    return orders.filter(order => pastStatuses.includes(order.status));
  }, [orders]);

  const cancelOrder = useCallback(async (orderId: string, reason?: string): Promise<boolean> => {
    try {
      console.log('[OrderContext] Canceling order:', orderId);
      const result = await orderService.cancelOrder(orderId, reason);
      if (result.success) {
        await loadOrders();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[OrderContext] Error canceling order:', error);
      return false;
    }
  }, [loadOrders]);

  const refreshOrders = useCallback(async () => {
    await loadOrders();
  }, [loadOrders]);

  return useMemo(() => ({
    orders,
    isLoadingOrders,
    getOrderById,
    getOrdersByStatus,
    getActiveOrders,
    getPastOrders,
    cancelOrder,
    refreshOrders,
  }), [
    orders,
    isLoadingOrders,
    getOrderById,
    getOrdersByStatus,
    getActiveOrders,
    getPastOrders,
    cancelOrder,
    refreshOrders,
  ]);
});
