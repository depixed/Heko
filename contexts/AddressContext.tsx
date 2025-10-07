import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Address } from '@/types';

const STORAGE_KEY = '@heko_addresses';

const MOCK_ADDRESSES: Address[] = [
  {
    id: '1',
    name: 'Rahul Sharma',
    phone: '+91 98765 41230',
    type: 'home',
    flat: '23, Green Park Society',
    area: 'Ahmedabad',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380001',
    isDefault: true,
    isServiceable: true,
  },
  {
    id: '2',
    name: 'Anita Desai',
    phone: '+91 99876 54321',
    type: 'work',
    flat: '45, Blue Ridge Avenue',
    area: 'Pune',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    isDefault: false,
    isServiceable: true,
  },
  {
    id: '3',
    name: 'Vikram Singh',
    phone: '+91 91234 56789',
    type: 'home',
    flat: '76, Maple Leaf Lane',
    area: 'Bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560001',
    isDefault: false,
    isServiceable: true,
  },
  {
    id: '4',
    name: 'Priya Mehta',
    phone: '+91 96123 45678',
    type: 'home',
    flat: '12, Ocean View Road',
    area: 'Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    isDefault: false,
    isServiceable: true,
  },
  {
    id: '5',
    name: 'Suresh Kumar',
    phone: '+91 94567 89012',
    type: 'home',
    flat: '33, Sunset Boulevard',
    area: 'Chennai',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    isDefault: false,
    isServiceable: true,
  },
];

export const [AddressProvider, useAddresses] = createContextHook(() => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setAddresses(JSON.parse(stored));
      } else {
        setAddresses(MOCK_ADDRESSES);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_ADDRESSES));
      }
    } catch (error) {
      console.error('Failed to load addresses:', error);
      setAddresses(MOCK_ADDRESSES);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAddresses = async (newAddresses: Address[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newAddresses));
      setAddresses(newAddresses);
    } catch (error) {
      console.error('Failed to save addresses:', error);
    }
  };

  const addAddress = useCallback(async (address: Omit<Address, 'id'>) => {
    const newAddress: Address = {
      ...address,
      id: Date.now().toString(),
    };

    let updatedAddresses = [...addresses, newAddress];

    if (newAddress.isDefault) {
      updatedAddresses = updatedAddresses.map((addr) =>
        addr.id === newAddress.id ? addr : { ...addr, isDefault: false }
      );
    }

    if (addresses.length === 0) {
      updatedAddresses = updatedAddresses.map((addr) =>
        addr.id === newAddress.id ? { ...addr, isDefault: true } : addr
      );
    }

    await saveAddresses(updatedAddresses);
  }, [addresses]);

  const updateAddress = useCallback(async (id: string, updates: Partial<Address>) => {
    let updatedAddresses = addresses.map((addr) =>
      addr.id === id ? { ...addr, ...updates } : addr
    );

    if (updates.isDefault) {
      updatedAddresses = updatedAddresses.map((addr) =>
        addr.id === id ? addr : { ...addr, isDefault: false }
      );
    }

    await saveAddresses(updatedAddresses);
  }, [addresses]);

  const deleteAddress = useCallback(async (id: string) => {
    const addressToDelete = addresses.find((addr) => addr.id === id);
    if (!addressToDelete) return;

    if (addresses.length === 1) {
      return;
    }

    let updatedAddresses = addresses.filter((addr) => addr.id !== id);

    if (addressToDelete.isDefault && updatedAddresses.length > 0) {
      updatedAddresses[0].isDefault = true;
    }

    await saveAddresses(updatedAddresses);
  }, [addresses]);

  const setDefaultAddress = useCallback(async (id: string) => {
    const updatedAddresses = addresses.map((addr) => ({
      ...addr,
      isDefault: addr.id === id,
    }));
    await saveAddresses(updatedAddresses);
  }, [addresses]);

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
