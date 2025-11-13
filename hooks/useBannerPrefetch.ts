import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAddresses } from '@/contexts/AddressContext';
import { bannerService } from '@/lib/bannerService';
import { APP_CONFIG } from '@/constants/config';

/**
 * Hook to prefetch banners on app launch
 * This ensures banners are ready when the home screen loads
 */
export const useBannerPrefetch = () => {
  const { user } = useAuth();
  const { getDefaultAddress } = useAddresses();
  const hasPrefetchedRef = useRef(false);

  useEffect(() => {
    // Only prefetch once on mount
    if (hasPrefetchedRef.current) {
      return;
    }

    // Prefetch banners in background after a short delay
    // This allows the app to initialize first
    const prefetchTimer = setTimeout(() => {
      const defaultAddress = getDefaultAddress();
      
      const params = {
        appVersion: APP_CONFIG.APP_VERSION,
        isLoggedIn: !!user,
        userId: user?.id,
        city: defaultAddress?.city,
        lat: defaultAddress?.lat,
        lng: defaultAddress?.lng,
      };

      bannerService.prefetchBanners(params);
      hasPrefetchedRef.current = true;
    }, 1000); // Wait 1 second after app launch

    return () => {
      clearTimeout(prefetchTimer);
    };
  }, []); // Only run once on mount
};

