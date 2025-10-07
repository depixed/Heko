import { useState, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { Notification, NotificationFilters } from '@/types';
import { MOCK_NOTIFICATIONS } from '@/mocks/notifications';

export const [NotificationProvider, useNotifications] = createContextHook(() => {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [filters, setFilters] = useState<NotificationFilters>({
    types: ['ORDERS', 'WALLET', 'REFERRALS', 'PROMOS', 'SYSTEM'],
    unreadOnly: false,
    range: '30d',
  });
  const [searchQuery, setSearchQuery] = useState<string>('');

  const unreadCount = useMemo(() => {
    return notifications.filter(n => n.unread).length;
  }, [notifications]);

  const markAsRead = useCallback((id: string) => {
    console.log('[NotificationContext] Marking notification as read:', id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, unread: false } : n))
    );
  }, []);

  const markAsUnread = useCallback((id: string) => {
    console.log('[NotificationContext] Marking notification as unread:', id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, unread: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    console.log('[NotificationContext] Marking all notifications as read');
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    console.log('[NotificationContext] Deleting notification:', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
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
      filtered = filtered.filter(n => n.unread);
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

  return {
    notifications: filteredNotifications,
    allNotifications: notifications,
    unreadCount,
    filters,
    searchQuery,
    setSearchQuery,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    updateFilters,
    resetFilters,
  };
});
