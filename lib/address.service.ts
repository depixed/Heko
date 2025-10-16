import { supabase } from './supabase';
import type { Database } from '@/types/database';

type AddressRow = Database['public']['Tables']['user_addresses']['Row'];
type AddressInsert = Database['public']['Tables']['user_addresses']['Insert'];
type AddressUpdate = Database['public']['Tables']['user_addresses']['Update'];

export const addressService = {
  async getAddresses(userId: string): Promise<{ success: boolean; data?: AddressRow[]; error?: string }> {
    try {
      console.log('[ADDRESS] Fetching addresses for user:', userId);

      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ADDRESS] Error fetching addresses:', error);
        return { success: false, error: 'Failed to fetch addresses' };
      }

      console.log(`[ADDRESS] Fetched ${data?.length || 0} addresses`);
      return { success: true, data: data as AddressRow[] };
    } catch (error) {
      console.error('[ADDRESS] Error fetching addresses:', error);
      return { success: false, error: 'Failed to fetch addresses' };
    }
  },

  async getAddressById(addressId: string): Promise<{ success: boolean; data?: AddressRow; error?: string }> {
    try {
      console.log('[ADDRESS] Fetching address:', addressId);

      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('id', addressId)
        .maybeSingle();

      if (error || !data) {
        console.error('[ADDRESS] Error fetching address:', error);
        return { success: false, error: 'Address not found' };
      }

      console.log('[ADDRESS] Fetched address:', addressId);
      return { success: true, data: data as AddressRow };
    } catch (error) {
      console.error('[ADDRESS] Error fetching address:', error);
      return { success: false, error: 'Failed to fetch address' };
    }
  },

  async createAddress(addressData: Omit<AddressInsert, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: AddressRow; error?: string }> {
    try {
      console.log('[ADDRESS] Creating address for user:', addressData.user_id);
      console.log('[ADDRESS] Address data:', JSON.stringify(addressData, null, 2));

      if (addressData.is_default) {
        const resetUpdate: AddressUpdate = { is_default: false };
        const { error: resetError } = await supabase
          .from('user_addresses')
          // @ts-expect-error - Supabase generated types issue with update
          .update(resetUpdate)
          .eq('user_id', addressData.user_id);

        if (resetError) {
          console.error('[ADDRESS] Error resetting default addresses:', resetError);
        }
      }

      const insertData: AddressInsert = {
        user_id: addressData.user_id,
        name: addressData.name,
        phone: addressData.phone,
        type: addressData.type,
        other_label: addressData.other_label || null,
        address_line1: addressData.address_line1,
        address_line2: addressData.address_line2 || null,
        landmark: addressData.landmark || null,
        city: addressData.city,
        state: addressData.state,
        pincode: addressData.pincode,
        lat: addressData.lat || null,
        lng: addressData.lng || null,
        is_default: addressData.is_default || false,
        is_serviceable: addressData.is_serviceable !== false,
      };

      console.log('[ADDRESS] Inserting data:', JSON.stringify(insertData, null, 2));

      const { data, error } = await supabase
        .from('user_addresses')
        // @ts-expect-error - Supabase generated types issue with insert
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[ADDRESS] Error creating address:', JSON.stringify(error, null, 2));
        return { success: false, error: error.message || 'Failed to create address' };
      }

      if (!data) {
        console.error('[ADDRESS] No data returned after insert');
        return { success: false, error: 'No data returned from database' };
      }

      const createdAddress = data as AddressRow;
      console.log('[ADDRESS] Address created successfully:', createdAddress.id);
      return { success: true, data: createdAddress };
    } catch (error: any) {
      console.error('[ADDRESS] Exception creating address:', error);
      console.error('[ADDRESS] Error details:', JSON.stringify(error, null, 2));
      return { success: false, error: error?.message || 'Failed to create address' };
    }
  },

  async updateAddress(addressId: string, updates: Partial<Omit<AddressUpdate, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[ADDRESS] Updating address:', addressId);

      const { data: address } = await supabase
        .from('user_addresses')
        .select('user_id')
        .eq('id', addressId)
        .maybeSingle();

      if (!address) {
        return { success: false, error: 'Address not found' };
      }

      const currentAddress = address as AddressRow;

      if (updates.is_default) {
        const resetUpdate: AddressUpdate = { is_default: false };
        const { error: resetError } = await supabase
          .from('user_addresses')
          // @ts-expect-error - Supabase generated types issue with update
          .update(resetUpdate)
          .eq('user_id', currentAddress.user_id);

        if (resetError) {
          console.error('[ADDRESS] Error resetting default addresses:', resetError);
        }
      }

      const updateData: AddressUpdate = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_addresses')
        // @ts-expect-error - Supabase type inference issue
        .update(updateData)
        .eq('id', addressId);

      if (error) {
        console.error('[ADDRESS] Error updating address:', error);
        return { success: false, error: 'Failed to update address' };
      }

      console.log('[ADDRESS] Address updated successfully');
      return { success: true };
    } catch (error) {
      console.error('[ADDRESS] Error updating address:', error);
      return { success: false, error: 'Failed to update address' };
    }
  },

  async deleteAddress(addressId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[ADDRESS] Deleting address:', addressId);

      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId);

      if (error) {
        console.error('[ADDRESS] Error deleting address:', error);
        return { success: false, error: 'Failed to delete address' };
      }

      console.log('[ADDRESS] Address deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('[ADDRESS] Error deleting address:', error);
      return { success: false, error: 'Failed to delete address' };
    }
  },

  async setDefaultAddress(userId: string, addressId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[ADDRESS] Setting default address:', addressId);

      const resetUpdate: AddressUpdate = { is_default: false };
      const { error: resetError } = await supabase
        .from('user_addresses')
        // @ts-expect-error - Supabase generated types issue with update
        .update(resetUpdate)
        .eq('user_id', userId);

      if (resetError) {
        console.error('[ADDRESS] Error resetting default addresses:', resetError);
        return { success: false, error: 'Failed to reset default addresses' };
      }

      const defaultUpdate: AddressUpdate = { is_default: true, updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from('user_addresses')
        // @ts-expect-error - Supabase generated types issue with update
        .update(defaultUpdate)
        .eq('id', addressId)
        .eq('user_id', userId);

      if (error) {
        console.error('[ADDRESS] Error setting default address:', error);
        return { success: false, error: 'Failed to set default address' };
      }

      console.log('[ADDRESS] Default address set successfully');
      return { success: true };
    } catch (error) {
      console.error('[ADDRESS] Error setting default address:', error);
      return { success: false, error: 'Failed to set default address' };
    }
  },
};
