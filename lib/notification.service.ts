import { supabase } from './supabase';
import type { Database } from '@/types/database';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];
type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

export interface NotificationFilters {
  types?: NotificationRow['type'][];
  unreadOnly?: boolean;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export const notificationService = {
  async getNotifications(userId: string, filters?: NotificationFilters): Promise<{ success: boolean; data?: NotificationRow[]; error?: string }> {
    try {
      console.log('[NOTIFICATION] Fetching notifications for user:', userId);

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .is('role', null); // Only customer notifications (role IS NULL)

      if (filters?.types && filters.types.length > 0) {
        query = query.in('type', filters.types);
      }

      if (filters?.unreadOnly) {
        query = query.eq('read', false); // read = false means unread
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
        console.error('[NOTIFICATION] Error fetching notifications:', error);
        return { success: false, error: 'Failed to fetch notifications' };
      }

      console.log(`[NOTIFICATION] Fetched ${data?.length || 0} notifications`);
      return { success: true, data: data as NotificationRow[] };
    } catch (error) {
      console.error('[NOTIFICATION] Error fetching notifications:', error);
      return { success: false, error: 'Failed to fetch notifications' };
    }
  },

  async getUnreadCount(userId: string): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      console.log('[NOTIFICATION] Fetching unread count for user:', userId);

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('role', null) // Only customer notifications
        .eq('read', false); // read = false means unread

      if (error) {
        console.error('[NOTIFICATION] Error fetching unread count:', error);
        return { success: false, error: 'Failed to fetch unread count' };
      }

      console.log(`[NOTIFICATION] Unread count: ${count || 0}`);
      return { success: true, count: count || 0 };
    } catch (error) {
      console.error('[NOTIFICATION] Error fetching unread count:', error);
      return { success: false, error: 'Failed to fetch unread count' };
    }
  },

  async markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[NOTIFICATION] Marking notification as read:', notificationId);

      const updateData: NotificationUpdate = {
        read: true,
      };

      const { error } = await supabase
        .from('notifications')
        // @ts-expect-error - Supabase type inference issue
        .update(updateData)
        .eq('id', notificationId);

      if (error) {
        console.error('[NOTIFICATION] Error marking notification as read:', error);
        return { success: false, error: 'Failed to mark notification as read' };
      }

      console.log('[NOTIFICATION] Notification marked as read');
      return { success: true };
    } catch (error) {
      console.error('[NOTIFICATION] Error marking notification as read:', error);
      return { success: false, error: 'Failed to mark notification as read' };
    }
  },

  async markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[NOTIFICATION] Marking all notifications as read for user:', userId);

      const updateData: NotificationUpdate = {
        read: true,
      };

      const { error } = await supabase
        .from('notifications')
        // @ts-expect-error - Supabase type inference issue
        .update(updateData)
        .eq('user_id', userId)
        .is('role', null) // Only customer notifications
        .eq('read', false); // Only unread notifications

      if (error) {
        console.error('[NOTIFICATION] Error marking all notifications as read:', error);
        return { success: false, error: 'Failed to mark all notifications as read' };
      }

      console.log('[NOTIFICATION] All notifications marked as read');
      return { success: true };
    } catch (error) {
      console.error('[NOTIFICATION] Error marking all notifications as read:', error);
      return { success: false, error: 'Failed to mark all notifications as read' };
    }
  },

  async deleteNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[NOTIFICATION] Deleting notification:', notificationId);

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('[NOTIFICATION] Error deleting notification:', error);
        return { success: false, error: 'Failed to delete notification' };
      }

      console.log('[NOTIFICATION] Notification deleted');
      return { success: true };
    } catch (error) {
      console.error('[NOTIFICATION] Error deleting notification:', error);
      return { success: false, error: 'Failed to delete notification' };
    }
  },

  async createNotification(notificationData: Omit<NotificationInsert, 'id' | 'created_at'>): Promise<{ success: boolean; data?: NotificationRow; error?: string }> {
    try {
      console.log('[NOTIFICATION] Creating notification for user:', notificationData.user_id);

      const { data, error } = await supabase
        .from('notifications')
        .insert(notificationData as any)
        .select()
        .single();

      if (error || !data) {
        console.error('[NOTIFICATION] Error creating notification:', error);
        return { success: false, error: 'Failed to create notification' };
      }

      console.log('[NOTIFICATION] Notification created:', (data as NotificationRow).id);
      return { success: true, data: data as NotificationRow };
    } catch (error) {
      console.error('[NOTIFICATION] Error creating notification:', error);
      return { success: false, error: 'Failed to create notification' };
    }
  },

  subscribeToNotifications(userId: string, callback: (notification: NotificationRow) => void) {
    console.log('[NOTIFICATION] Subscribing to notifications for user:', userId);

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as NotificationRow;
          // Only process customer notifications (role IS NULL)
          if (notification.role === null) {
            console.log('[NOTIFICATION] New notification received:', notification);
            callback(notification);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[NOTIFICATION] Unsubscribing from notifications');
      supabase.removeChannel(channel);
    };
  },
};
