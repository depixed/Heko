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

    const channel = supabase
      .channel('customer-orders-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('[OrderContext] Order change detected:', payload);
          
          // If order status changed to 'delivered', trigger cashback processing
          if (payload.eventType === 'UPDATE' && payload.new) {
            const newOrder = payload.new as any;
            const oldOrder = payload.old as any;
            
            if (newOrder.status === 'delivered' && oldOrder.status !== 'delivered') {
              console.log('[OrderContext] Order delivered, processing cashback...');
              try {
                await orderService.processDeliveryCashback(newOrder.id, newOrder.total);
                console.log('[OrderContext] Cashback processed automatically');
              } catch (error) {
                console.error('[OrderContext] Error processing automatic cashback:', error);
              }
            }
          }
          
          // Refetch orders
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      console.log('[OrderContext] Unsubscribing from order updates');
      supabase.removeChannel(channel);
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
    const activeStatuses: OrderStatus[] = ['placed', 'processing', 'preparing', 'out_for_delivery'];
    return orders.filter(order => activeStatuses.includes(order.status));
  }, [orders]);

  const getPastOrders = useCallback((): OrderWithRelations[] => {
    const pastStatuses: OrderStatus[] = ['delivered', 'partially_delivered', 'canceled', 'unfulfillable', 'return_in_progress', 'returned'];
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

  const processDeliveryCashback = useCallback(async (orderId: string, deliveryAmount: number): Promise<boolean> => {
    try {
      console.log('[OrderContext] Processing delivery cashback:', orderId, deliveryAmount);
      const result = await orderService.processDeliveryCashback(orderId, deliveryAmount);
      if (result.success) {
        console.log('[OrderContext] Cashback processed successfully');
        return true;
      }
      console.error('[OrderContext] Failed to process cashback:', result.error);
      return false;
    } catch (error) {
      console.error('[OrderContext] Error processing cashback:', error);
      return false;
    }
  }, []);

  return useMemo(() => ({
    orders,
    isLoadingOrders,
    getOrderById,
    getOrdersByStatus,
    getActiveOrders,
    getPastOrders,
    cancelOrder,
    refreshOrders,
    processDeliveryCashback,
  }), [
    orders,
    isLoadingOrders,
    getOrderById,
    getOrdersByStatus,
    getActiveOrders,
    getPastOrders,
    cancelOrder,
    refreshOrders,
    processDeliveryCashback,
  ]);
});
