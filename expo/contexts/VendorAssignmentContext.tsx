import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { appService } from '@/lib/app.service';
import { vendorService } from '@/lib/vendor.service';
import { useAddresses } from './AddressContext';
import { findNearestVendor } from '@/utils/geolocation';

export type VendorAssignmentMode = 'single' | 'multi';

interface VendorAssignmentState {
  mode: VendorAssignmentMode;
  activeVendorId: string | null;
  activeVendorName: string | null;
  hasEligibleVendor: boolean;
  isLoading: boolean;
  error: string | null;
}

export const [VendorAssignmentProvider, useVendorAssignment] = createContextHook(() => {
  const { addresses, getDefaultAddress } = useAddresses();
  const [state, setState] = useState<VendorAssignmentState>({
    mode: 'multi', // default to existing behavior
    activeVendorId: null,
    activeVendorName: null,
    hasEligibleVendor: true, // default true for multi-vendor
    isLoading: true,
    error: null,
  });
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const systemServiceRadiusRef = useRef<number>(5.0);

  // Load vendor assignment mode from system settings
  const loadAssignmentMode = useCallback(async () => {
    try {
      const result = await appService.getSystemSetting('vendor_assignment_mode');
      if (result.success && result.data) {
        const mode = result.data as VendorAssignmentMode;
        setState(prev => ({ ...prev, mode }));
        return mode;
      }
      return 'multi' as VendorAssignmentMode;
    } catch (error) {
      console.error('[VendorAssignment] Error loading mode:', error);
      return 'multi' as VendorAssignmentMode;
    }
  }, []);

  // Load system service radius
  const loadServiceRadius = useCallback(async () => {
    try {
      const result = await appService.getSystemSetting('service_radius');
      if (result.success && result.data) {
        systemServiceRadiusRef.current = typeof result.data === 'number' 
          ? result.data 
          : parseFloat(String(result.data)) || 5.0;
      }
    } catch (error) {
      console.error('[VendorAssignment] Error loading service radius:', error);
      systemServiceRadiusRef.current = 5.0;
    }
  }, []);

  // Compute active vendor for single mode
  const computeActiveVendor = useCallback(async (addressId: string) => {
    const address = addresses.find(a => a.id === addressId);
    
    if (!address) {
      console.warn('[VendorAssignment] Address not found:', addressId);
      setState(prev => ({
        ...prev,
        activeVendorId: null,
        activeVendorName: null,
        hasEligibleVendor: false,
        isLoading: false,
      }));
      return;
    }

    if (!address.lat || !address.lng) {
      console.warn('[VendorAssignment] Address has no coordinates:', addressId);
      setState(prev => ({
        ...prev,
        activeVendorId: null,
        activeVendorName: null,
        hasEligibleVendor: false,
        isLoading: false,
        error: 'Address missing location coordinates',
      }));
      return;
    }

    // Fetch all active vendors
    const vendorsResult = await vendorService.getActiveVendorsWithLocation();
    if (!vendorsResult.success || !vendorsResult.data) {
      console.error('[VendorAssignment] Failed to fetch vendors:', vendorsResult.error);
      setState(prev => ({
        ...prev,
        hasEligibleVendor: false,
        isLoading: false,
        error: 'Failed to load vendors',
      }));
      return;
    }

    // Find nearest vendor
    const nearestVendor = findNearestVendor(
      address.lat,
      address.lng,
      vendorsResult.data,
      systemServiceRadiusRef.current
    );

    if (nearestVendor) {
      console.log('[VendorAssignment] Found nearest vendor:', nearestVendor.business_name, `(${nearestVendor.distance.toFixed(2)}km)`);
      setState(prev => ({
        ...prev,
        activeVendorId: nearestVendor.id,
        activeVendorName: nearestVendor.business_name,
        hasEligibleVendor: true,
        isLoading: false,
        error: null,
      }));
    } else {
      console.log('[VendorAssignment] No eligible vendor found for address');
      setState(prev => ({
        ...prev,
        activeVendorId: null,
        activeVendorName: null,
        hasEligibleVendor: false,
        isLoading: false,
        error: null,
      }));
    }
  }, [addresses]);

  // Initialize: Load mode and compute vendor
  useEffect(() => {
    const initialize = async () => {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Load service radius first
      await loadServiceRadius();
      
      // Load assignment mode
      const mode = await loadAssignmentMode();
      
      if (mode === 'single') {
        const defaultAddress = getDefaultAddress();
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
          await computeActiveVendor(defaultAddress.id);
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        // Multi-vendor mode - no restrictions
        setState(prev => ({
          ...prev,
          hasEligibleVendor: true,
          isLoading: false,
        }));
      }
    };

    initialize();
  }, [loadAssignmentMode, loadServiceRadius, getDefaultAddress, computeActiveVendor]);

  // When selected address changes, recompute vendor
  const selectAddress = useCallback(async (addressId: string) => {
    setSelectedAddressId(addressId);
    
    if (state.mode === 'single') {
      setState(prev => ({ ...prev, isLoading: true }));
      await computeActiveVendor(addressId);
    }
  }, [state.mode, computeActiveVendor]);

  // Recompute vendor when addresses change (e.g., after adding new address)
  useEffect(() => {
    if (state.mode === 'single' && selectedAddressId) {
      const address = addresses.find(a => a.id === selectedAddressId);
      if (address) {
        computeActiveVendor(selectedAddressId);
      }
    }
  }, [addresses, state.mode, selectedAddressId, computeActiveVendor]);

  return useMemo(() => ({
    ...state,
    selectedAddressId,
    selectAddress,
    refreshVendor: () => {
      if (state.mode === 'single' && selectedAddressId) {
        computeActiveVendor(selectedAddressId);
      }
    },
  }), [state, selectedAddressId, selectAddress, computeActiveVendor]);
});
