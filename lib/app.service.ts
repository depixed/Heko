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

      if (error || !data) {
        console.error('[APP] Error fetching system setting:', error);
        return { success: false, error: 'Setting not found' };
      }

      console.log('[APP] Fetched system setting:', key);
      return { success: true, data: (data as SystemSettingRow).value };
    } catch (error) {
      console.error('[APP] Error fetching system setting:', error);
      return { success: false, error: 'Failed to fetch system setting' };
    }
  },
};
