import { supabase } from './supabase';
import type { Database } from '@/types/database';

type NotificationAnalyticsRow = Database['public']['Tables']['notification_analytics']['Row'];
type NotificationAnalyticsInsert = Database['public']['Tables']['notification_analytics']['Insert'];

export const notificationAnalyticsService = {
  /**
   * Track notification event
   */
  async trackEvent(
    notificationId: string,
    eventType: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed',
    channel: 'push' | 'sms' | 'in_app',
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const insertData: NotificationAnalyticsInsert = {
        notification_id: notificationId,
        event_type: eventType,
        channel,
        metadata: metadata || {},
      };

      const { error } = await supabase
        .from('notification_analytics')
        .insert(insertData as any);

      if (error) {
        // If table doesn't exist (PGRST205), fail silently - analytics is optional
        if (error.code === 'PGRST205' || error.message?.includes('notification_analytics')) {
          console.log('[ANALYTICS] Analytics table not available, skipping tracking');
          return { success: true }; // Return success to not break the flow
        }
        console.error('[ANALYTICS] Error tracking event:', error);
        return { success: false, error: 'Failed to track event' };
      }

      return { success: true };
    } catch (error) {
      // If table doesn't exist, fail silently - analytics is optional
      console.log('[ANALYTICS] Analytics table not available, skipping tracking');
      return { success: true }; // Return success to not break the flow
    }
  },

  /**
   * Track sent event
   */
  async trackSent(notificationId: string, channel: 'push' | 'sms' | 'in_app'): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent(notificationId, 'sent', channel);
  },

  /**
   * Track delivered event
   */
  async trackDelivered(notificationId: string, channel: 'push' | 'sms' | 'in_app'): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent(notificationId, 'delivered', channel);
  },

  /**
   * Track opened event
   */
  async trackOpened(notificationId: string): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent(notificationId, 'opened', 'in_app');
  },

  /**
   * Track clicked event
   */
  async trackClicked(notificationId: string, deeplink?: string): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent(notificationId, 'clicked', 'in_app', { deeplink });
  },

  /**
   * Track failed event
   */
  async trackFailed(notificationId: string, channel: 'push' | 'sms' | 'in_app', error: string): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent(notificationId, 'failed', channel, { error });
  },

  /**
   * Get analytics for notification
   */
  async getAnalytics(notificationId: string): Promise<{ success: boolean; data?: NotificationAnalyticsRow[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('notification_analytics')
        .select('*')
        .eq('notification_id', notificationId)
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist (PGRST205), return empty array
        if (error.code === 'PGRST205' || error.message?.includes('notification_analytics')) {
          console.log('[ANALYTICS] Analytics table not available, returning empty data');
          return { success: true, data: [] };
        }
        console.error('[ANALYTICS] Error fetching analytics:', error);
        return { success: false, error: 'Failed to fetch analytics' };
      }

      return { success: true, data: data as NotificationAnalyticsRow[] };
    } catch (error) {
      // If table doesn't exist, return empty array
      console.log('[ANALYTICS] Analytics table not available, returning empty data');
      return { success: true, data: [] };
    }
  },

  /**
   * Get analytics by type
   */
  async getTypeAnalytics(
    type: string,
    dateRange?: { from: string; to: string }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      let query = supabase
        .from('notification_analytics')
        .select(`
          *,
          notifications!inner(type)
        `)
        .eq('notifications.type', type);

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.from)
          .lte('created_at', dateRange.to);
      }

      const { data, error } = await query;

      if (error) {
        // If table doesn't exist (PGRST205), return empty metrics
        if (error.code === 'PGRST205' || error.message?.includes('notification_analytics')) {
          console.log('[ANALYTICS] Analytics table not available, returning empty metrics');
          return {
            success: true,
            data: {
              sent: 0,
              delivered: 0,
              opened: 0,
              clicked: 0,
              failed: 0,
              deliveryRate: 0,
              openRate: 0,
              clickRate: 0,
            },
          };
        }
        console.error('[ANALYTICS] Error fetching type analytics:', error);
        return { success: false, error: 'Failed to fetch analytics' };
      }

      // Calculate metrics
      const sent = data?.filter((a) => a.event_type === 'sent').length || 0;
      const delivered = data?.filter((a) => a.event_type === 'delivered').length || 0;
      const opened = data?.filter((a) => a.event_type === 'opened').length || 0;
      const clicked = data?.filter((a) => a.event_type === 'clicked').length || 0;
      const failed = data?.filter((a) => a.event_type === 'failed').length || 0;

      return {
        success: true,
        data: {
          sent,
          delivered,
          opened,
          clicked,
          failed,
          deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
          openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
          clickRate: opened > 0 ? (clicked / opened) * 100 : 0,
        },
      };
    } catch (error) {
      console.error('[ANALYTICS] Error fetching type analytics:', error);
      return { success: false, error: 'Failed to fetch analytics' };
    }
  },
};

