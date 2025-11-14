import { supabase } from './supabase';
import type { Database } from '@/types/database';

type NotificationPreferenceRow = Database['public']['Tables']['user_notification_preferences']['Row'];
type NotificationPreferenceInsert = Database['public']['Tables']['user_notification_preferences']['Insert'];
type NotificationPreferenceUpdate = Database['public']['Tables']['user_notification_preferences']['Update'];

export interface NotificationPreferences {
  type: string;
  push_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  locale: 'en' | 'gu';
}

export const notificationPreferencesService = {
  /**
   * Get user preferences
   */
  async getPreferences(userId: string): Promise<{ success: boolean; data?: NotificationPreferenceRow[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('[PREFERENCES] Error fetching preferences:', error);
        return { success: false, error: 'Failed to fetch preferences' };
      }

      return { success: true, data: data as NotificationPreferenceRow[] };
    } catch (error) {
      console.error('[PREFERENCES] Error fetching preferences:', error);
      return { success: false, error: 'Failed to fetch preferences' };
    }
  },

  /**
   * Get preference for specific notification type
   */
  async getPreference(
    userId: string,
    type: string
  ): Promise<{ success: boolean; data?: NotificationPreferenceRow; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('type', type)
        .single();

      if (error) {
        // Return default preferences if not found
        return {
          success: true,
          data: {
            id: '',
            user_id: userId,
            type,
            push_enabled: true,
            sms_enabled: type.includes('otp') || type.includes('delivery'), // OTP notifications default to SMS enabled
            in_app_enabled: true,
            locale: 'en',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as NotificationPreferenceRow,
        };
      }

      return { success: true, data: data as NotificationPreferenceRow };
    } catch (error) {
      console.error('[PREFERENCES] Error fetching preference:', error);
      return { success: false, error: 'Failed to fetch preference' };
    }
  },

  /**
   * Update preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences> & { type: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if preference exists
      const { data: existing } = await supabase
        .from('user_notification_preferences')
        .select('id')
        .eq('user_id', userId)
        .eq('type', preferences.type)
        .single();

      const updateData: NotificationPreferenceUpdate = {
        push_enabled: preferences.push_enabled,
        sms_enabled: preferences.sms_enabled,
        in_app_enabled: preferences.in_app_enabled,
        locale: preferences.locale,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        // Update existing preference
        const { error } = await supabase
          .from('user_notification_preferences')
          .update(updateData)
          .eq('id', existing.id);

        if (error) {
          console.error('[PREFERENCES] Error updating preference:', error);
          return { success: false, error: 'Failed to update preference' };
        }
      } else {
        // Insert new preference
        const insertData: NotificationPreferenceInsert = {
          user_id: userId,
          type: preferences.type,
          ...updateData,
        };

        const { error } = await supabase
          .from('user_notification_preferences')
          .insert(insertData as any);

        if (error) {
          console.error('[PREFERENCES] Error creating preference:', error);
          return { success: false, error: 'Failed to create preference' };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('[PREFERENCES] Error updating preferences:', error);
      return { success: false, error: 'Failed to update preferences' };
    }
  },

  /**
   * Get default preferences
   */
  getDefaultPreferences(): NotificationPreferences {
    return {
      type: '',
      push_enabled: true,
      sms_enabled: false,
      in_app_enabled: true,
      locale: 'en',
    };
  },
};

