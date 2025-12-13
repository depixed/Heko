import { supabase } from './supabase';
import type { Database } from '@/types/database';

type BannerRow = Database['public']['Tables']['banners']['Row'];
type SystemSettingRow = Database['public']['Tables']['system_settings']['Row'];

export const appService = {
  async getBanners(): Promise<{ success: boolean; data?: BannerRow[]; error?: string }> {
    try {
      console.log('[APP] Fetching active banners');

      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('[APP] Error fetching banners:', error);
        return { success: false, error: 'Failed to fetch banners' };
      }

      console.log(`[APP] Fetched ${data?.length || 0} banners`);
      return { success: true, data: data as BannerRow[] };
    } catch (error) {
      console.error('[APP] Error fetching banners:', error);
      return { success: false, error: 'Failed to fetch banners' };
    }
  },

  async getSystemSettings(): Promise<{ success: boolean; data?: Record<string, any>; error?: string }> {
    try {
      console.log('[APP] Fetching system settings');

      const { data, error } = await supabase
        .from('system_settings')
        .select('*');

      if (error) {
        console.error('[APP] Error fetching system settings:', error);
        return { success: false, error: 'Failed to fetch system settings' };
      }

      const settings: Record<string, any> = {};
      (data as SystemSettingRow[]).forEach(setting => {
        settings[setting.key] = setting.value;
      });

      console.log(`[APP] Fetched ${Object.keys(settings).length} system settings`);
      return { success: true, data: settings };
    } catch (error) {
      console.error('[APP] Error fetching system settings:', error);
      return { success: false, error: 'Failed to fetch system settings' };
    }
  },

  async getSystemSetting(key: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('[APP] Fetching system setting:', key);

      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', key)
        .maybeSingle();

      if (error) {
        // Only log if it's a real error, not just "not found" or null
        // Check if error has meaningful content (not just null/empty)
        const hasRealError = error.code && error.code !== 'PGRST116' && (error.message || error.details || (typeof error === 'object' && Object.keys(error).length > 0 && error !== null));
        // Also check if error is not just null
        if (hasRealError && error !== null && String(error) !== 'null') {
          console.error('[APP] Error fetching system setting:', error);
        }
        return { success: false, error: 'Setting not found' };
      }

      if (!data) {
        // Setting doesn't exist - this is expected, don't log as error
        return { success: false, error: 'Setting not found' };
      }

      console.log('[APP] Fetched system setting:', key);
      return { success: true, data: (data as SystemSettingRow).value };
    } catch (error) {
      // Only log unexpected errors (not "not found" cases or null errors)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage && !errorMessage.includes('not found') && errorMessage !== 'null' && errorMessage.trim() !== '') {
        console.error('[APP] Error fetching system setting:', error);
      }
      return { success: false, error: 'Failed to fetch system setting' };
    }
  },
};
