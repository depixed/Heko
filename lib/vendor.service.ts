import { supabase } from './supabase';
import type { Database } from '@/types/database';

type VendorRow = Database['public']['Tables']['vendors']['Row'];

export interface VendorWithLocation extends VendorRow {
  latitude: number;
  longitude: number;
  service_radius?: number | null;
}

export const vendorService = {
  /**
   * Fetch all active vendors with location data
   * Only returns vendors that have both latitude and longitude set
   */
  async getActiveVendorsWithLocation(): Promise<{
    success: boolean;
    data?: VendorWithLocation[];
    error?: string;
  }> {
    try {
      console.log('[VENDOR] Fetching active vendors with location');
      
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .or('is_active.eq.true,status.eq.active')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) {
        console.error('[VENDOR] Error fetching vendors:', error);
        return { success: false, error: 'Failed to fetch vendors' };
      }

      // Filter to ensure we only return vendors with valid location data
      const vendorsWithLocation = (data || []).filter(
        (v: any) => v.latitude != null && v.longitude != null
      ) as VendorWithLocation[];

      console.log(`[VENDOR] Found ${vendorsWithLocation.length} active vendors with location`);
      return { success: true, data: vendorsWithLocation };
    } catch (error) {
      console.error('[VENDOR] Error:', error);
      return { success: false, error: 'Failed to fetch vendors' };
    }
  },

  /**
   * Fetch a single vendor by ID
   */
  async getVendorById(vendorId: string): Promise<{
    success: boolean;
    data?: VendorWithLocation;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single();

      if (error || !data) {
        console.error('[VENDOR] Error fetching vendor:', error);
        return { success: false, error: 'Vendor not found' };
      }

      return { success: true, data: data as VendorWithLocation };
    } catch (error) {
      console.error('[VENDOR] Error:', error);
      return { success: false, error: 'Failed to fetch vendor' };
    }
  },
};
