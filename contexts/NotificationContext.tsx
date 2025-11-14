import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { Notification, NotificationFilters } from '@/types';
import { notificationService } from '@/lib/notification.service';
import { notificationAnalyticsService } from '@/lib/notificationAnalytics.service';
import { useAuth } from './AuthContext';


export const [NotificationProvider, useNotifications] = createContextHook(() => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const subscriptionRef = useRef<(() => void) | null>(null);
  const [filters, setFilters] = useState<NotificationFilters>({
    types: ['ORDERS', 'WALLET', 'REFERRALS', 'PROMOS', 'SYSTEM'],
    unreadOnly: false,
    range: '30d',
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (user) {
      loadNotifications();
      setupRealtimeSubscription();
    } else {
      setNotifications([]);
      setIsLoading(false);
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    };
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      console.log('[NotificationContext] Loading notifications for user:', user.id);
      const result = await notificationService.getNotifications(user.id, { limit: 100 });
      if (result.success && result.data) {
        const appNotifications: Notification[] = result.data.map(notif => {
          const data = (notif.data as Record<string, any>) || {};
          return {
            id: notif.id,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            createdAt: notif.created_at,
            read: notif.read,
            deeplink: data.deep_link || '',
            payload: data,
            priority: notif.priority,
            entity_id: notif.entity_id,
            data: data,
          };
        });
        // Deduplicate by ID and sort by creation date (newest first)
        const uniqueNotifications = appNotifications.reduce((acc, notif) => {
          if (!acc.find(n => n.id === notif.id)) {
            acc.push(notif);
          }
          return acc;
        }, [] as Notification[]);
        uniqueNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(uniqueNotifications);
        console.log('[NotificationContext] Notifications loaded:', uniqueNotifications.length);
      }
    } catch (error) {
      console.error('[NotificationContext] Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user || subscriptionRef.current) return;
    
    console.log('[NotificationContext] Setting up real-time subscription');
    const unsubscribe = notificationService.subscribeToNotifications(
      user.id,
      (notification) => {
        console.log('[NotificationContext] New notification received:', notification);
        const data = (notification.data as Record<string, any>) || {};
        const appNotification: Notification = {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          createdAt: notification.created_at,
          read: notification.read,
          deeplink: data.deep_link || '',
          payload: data,
          priority: notification.priority,
          entity_id: notification.entity_id,
          data: data,
        };
        // Only add if notification doesn't already exist (deduplication)
        setNotifications(prev => {
          const exists = prev.some(n => n.id === appNotification.id);
          if (exists) {
            console.log('[NotificationContext] Notification already exists, skipping:', appNotification.id);
            return prev;
          }
          return [appNotification, ...prev];
        });
      }
    );
    subscriptionRef.current = unsubscribe;
  };

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const markAsRead = useCallback(async (id: string) => {
    console.log('[NotificationContext] Marking notification as read:', id);
    const result = await notificationService.markAsRead(id);
    if (result.success) {
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      // Track opened event
      try {
        await notificationAnalyticsService.trackOpened(id);
      } catch (error) {
        console.error('[NotificationContext] Error tracking opened analytics:', error);
        // Continue execution - analytics is optional
      }
    }
  }, [unreadCount]);

  const markAsUnread = useCallback((id: string) => {
    console.log('[NotificationContext] Marking notification as unread:', id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: false } : n))
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    
    console.log('[NotificationContext] Marking all notifications as read');
    const result = await notificationService.markAllAsRead(user.id);
    if (result.success) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  }, [user]);

  const deleteNotification = useCallback(async (id: string) => {
    console.log('[NotificationContext] Deleting notification:', id);
    const result = await notificationService.deleteNotification(id);
    if (result.success) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  }, []);

  const updateFilters = useCallback((newFilters: Partial<NotificationFilters>) => {
    console.log('[NotificationContext] Updating filters:', newFilters);
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    console.log('[NotificationContext] Resetting filters');
    setFilters({
      types: ['ORDERS', 'WALLET', 'REFERRALS', 'PROMOS', 'SYSTEM'],
      unreadOnly: false,
      range: '30d',
    });
  }, []);

  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    if (filters.unreadOnly) {
      filtered = filtered.filter(n => !n.read);
    }

    if (filters.types.length < 5) {
      filtered = filtered.filter(n => filters.types.includes(n.type));
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (filters.range === 'today') {
      filtered = filtered.filter(n => new Date(n.createdAt) >= today);
    } else if (filters.range === '7d') {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter(n => new Date(n.createdAt) >= sevenDaysAgo);
    } else if (filters.range === '30d') {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(n => new Date(n.createdAt) >= thirtyDaysAgo);
    } else if (filters.range === 'custom' && filters.customFrom && filters.customTo) {
      const from = new Date(filters.customFrom);
      const to = new Date(filters.customTo);
      filtered = filtered.filter(n => {
        const date = new Date(n.createdAt);
        return date >= from && date <= to;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.body.toLowerCase().includes(query) ||
        (n.payload.orderId && n.payload.orderId.toLowerCase().includes(query))
      );
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return filtered;
  }, [notifications, filters, searchQuery]);

  const refreshNotifications = useCallback(async () => {
    await loadNotifications();
  }, [user]);

  return useMemo(() => ({
    notifications: filteredNotifications,
    allNotifications: notifications,
    unreadCount,
    filters,
    searchQuery,
    isLoading,
    setSearchQuery,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    updateFilters,
    resetFilters,
    refreshNotifications,
  }), [
    filteredNotifications,
    notifications,
    unreadCount,
    filters,
    searchQuery,
    isLoading,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    updateFilters,
    resetFilters,
    refreshNotifications,
  ]);
});
