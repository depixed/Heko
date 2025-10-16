import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Address } from '@/types';
import { addressService } from '@/lib/address.service';
import { useAuth } from './AuthContext';



export const [AddressProvider, useAddresses] = createContextHook(() => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (user) {
      loadAddresses();
    } else {
      setAddresses([]);
      setIsLoading(false);
    }
  }, [user]);

  const loadAddresses = async () => {
    if (!user) return;
    
    try {
      console.log('[AddressContext] Loading addresses for user:', user.id);
      const result = await addressService.getAddresses(user.id);
      if (result.success && result.data) {
        const appAddresses: Address[] = result.data.map(addr => ({
          id: addr.id,
          name: addr.name,
          phone: addr.phone,
          type: addr.type as 'home' | 'work' | 'other',
          otherLabel: addr.other_label || undefined,
          flat: addr.address_line1,
          area: addr.address_line2 || undefined,
          landmark: addr.landmark || undefined,
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          isDefault: addr.is_default,
          isServiceable: addr.is_serviceable,
        }));
        setAddresses(appAddresses);
        console.log('[AddressContext] Addresses loaded:', appAddresses.length);
      }
    } catch (error) {
      console.error('[AddressContext] Error loading addresses:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const addAddress = useCallback(async (address: Omit<Address, 'id'>) => {
    if (!user) return;
    
    try {
      console.log('[AddressContext] Adding new address');
      const result = await addressService.createAddress({
        user_id: user.id,
        name: address.name,
        phone: address.phone,
        type: address.type,
        other_label: address.otherLabel || null,
        address_line1: address.flat,
        address_line2: address.area || null,
        landmark: address.landmark || null,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        is_default: address.isDefault,
        is_serviceable: address.isServiceable !== false,
      });
      
      if (result.success) {
        await loadAddresses();
        console.log('[AddressContext] Address added successfully');
      }
    } catch (error) {
      console.error('[AddressContext] Error adding address:', error);
    }
  }, [user, addresses]);

  const updateAddress = useCallback(async (id: string, updates: Partial<Address>) => {
    try {
      console.log('[AddressContext] Updating address:', id);
      const updateData: any = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.otherLabel !== undefined) updateData.other_label = updates.otherLabel;
      if (updates.flat !== undefined) updateData.address_line1 = updates.flat;
      if (updates.area !== undefined) updateData.address_line2 = updates.area || null;
      if (updates.landmark !== undefined) updateData.landmark = updates.landmark;
      if (updates.city !== undefined) updateData.city = updates.city;
      if (updates.state !== undefined) updateData.state = updates.state;
      if (updates.pincode !== undefined) updateData.pincode = updates.pincode;
      if (updates.isServiceable !== undefined) updateData.is_serviceable = updates.isServiceable;
      
      const result = await addressService.updateAddress(id, updateData);
      
      if (result.success) {
        await loadAddresses();
        console.log('[AddressContext] Address updated successfully');
      }
    } catch (error) {
      console.error('[AddressContext] Error updating address:', error);
    }
  }, [addresses]);

  const deleteAddress = useCallback(async (id: string) => {
    if (addresses.length === 1) {
      console.log('[AddressContext] Cannot delete last address');
      return;
    }
    
    try {
      console.log('[AddressContext] Deleting address:', id);
      const result = await addressService.deleteAddress(id);
      
      if (result.success) {
        await loadAddresses();
        console.log('[AddressContext] Address deleted successfully');
      }
    } catch (error) {
      console.error('[AddressContext] Error deleting address:', error);
    }
  }, [addresses]);

  const setDefaultAddress = useCallback(async (id: string) => {
    if (!user) return;
    
    try {
      console.log('[AddressContext] Setting default address:', id);
      const result = await addressService.setDefaultAddress(user.id, id);
      
      if (result.success) {
        await loadAddresses();
        console.log('[AddressContext] Default address set successfully');
      }
    } catch (error) {
      console.error('[AddressContext] Error setting default address:', error);
    }
  }, [user, addresses]);

  const getDefaultAddress = useCallback(() => {
    return addresses.find((addr) => addr.isDefault) || addresses[0];
  }, [addresses]);

  const getAddressById = useCallback((id: string) => {
    return addresses.find((addr) => addr.id === id);
  }, [addresses]);

  return useMemo(() => ({
    addresses,
    isLoading,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    getDefaultAddress,
    getAddressById,
  }), [addresses, isLoading, addAddress, updateAddress, deleteAddress, setDefaultAddress, getDefaultAddress, getAddressById]);
});
