import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import type { Database } from '@/types/database';

type PushTokenRow = Database['public']['Tables']['user_push_tokens']['Row'];
type PushTokenInsert = Database['public']['Tables']['user_push_tokens']['Insert'];

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const pushNotificationService = {
  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<{ granted: boolean; error?: string }> {
    try {
      if (!Device.isDevice) {
        console.warn('[PUSH] Notifications only work on physical devices');
        return { granted: false, error: 'Not a physical device' };
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return { granted: false, error: 'Permission not granted' };
      }

      return { granted: true };
    } catch (error) {
      console.error('[PUSH] Error requesting permissions:', error);
      return { granted: false, error: 'Failed to request permissions' };
    }
  },

  /**
   * Get Expo push token
   */
  async getExpoPushToken(): Promise<{ token?: string; error?: string }> {
    try {
      const { granted } = await this.requestPermissions();
      if (!granted) {
        return { error: 'Permissions not granted' };
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PROJECT_ID || 'a6kfbcwdys0r3rmzhu89c',
      });

      return { token: tokenData.data };
    } catch (error) {
      console.error('[PUSH] Error getting push token:', error);
      return { error: 'Failed to get push token' };
    }
  },

  /**
   * Register push token for user
   */
  async registerPushToken(
    userId: string,
    token: string,
    deviceId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

      // Check if token already exists
      const { data: existingToken } = await supabase
        .from('user_push_tokens')
        .select('id')
        .eq('expo_push_token', token)
        .single();

      if (existingToken) {
        // Update existing token
        const { error } = await supabase
          .from('user_push_tokens')
          .update({
            user_id: userId,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingToken.id);

        if (error) {
          console.error('[PUSH] Error updating push token:', error);
          return { success: false, error: 'Failed to update push token' };
        }
      } else {
        // Insert new token
        const insertData: PushTokenInsert = {
          user_id: userId,
          expo_push_token: token,
          device_id: deviceId || null,
          platform,
          is_active: true,
        };

        const { error } = await supabase
          .from('user_push_tokens')
          .insert(insertData as any);

        if (error) {
          console.error('[PUSH] Error inserting push token:', error);
          return { success: false, error: 'Failed to register push token' };
        }
      }

      console.log('[PUSH] Push token registered successfully');
      return { success: true };
    } catch (error) {
      console.error('[PUSH] Error registering push token:', error);
      return { success: false, error: 'Failed to register push token' };
    }
  },

  /**
   * Unregister push token (mark as inactive)
   */
  async unregisterPushToken(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_push_tokens')
        .update({ is_active: false })
        .eq('expo_push_token', token);

      if (error) {
        console.error('[PUSH] Error unregistering push token:', error);
        return { success: false, error: 'Failed to unregister push token' };
      }

      return { success: true };
    } catch (error) {
      console.error('[PUSH] Error unregistering push token:', error);
      return { success: false, error: 'Failed to unregister push token' };
    }
  },

  /**
   * Set up notification received handler
   */
  setupNotificationReceivedHandler(
    handler: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(handler);
  },

  /**
   * Set up notification tapped handler
   */
  setupNotificationTappedHandler(
    handler: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(handler);
  },

  /**
   * Get notification categories (for iOS)
   */
  async setNotificationCategories(): Promise<void> {
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('ORDER_UPDATE', [
        {
          identifier: 'VIEW_ORDER',
          buttonTitle: 'View Order',
          options: { opensAppToForeground: true },
        },
      ]);
    }
  },

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  },

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  },

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  },
};

