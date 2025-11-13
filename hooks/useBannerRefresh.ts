import { useCallback, useRef } from 'react';
import { useAppState } from './useAppState';
import { useLocationChange, hasMovedSignificantly } from './useLocationChange';
import type { BannerParams } from '@/lib/bannerService';

interface UseBannerRefreshOptions {
  refetch: () => Promise<void>;
  enabled?: boolean;
  refreshOnForeground?: boolean;
  refreshOnLocationChange?: boolean;
  locationChangeThreshold?: number; // meters
}

/**
 * Hook for smart banner refresh logic
 * 
 * Refreshes banners on:
 * 1. App comes to foreground
 * 2. User location changes significantly
 * 3. Manual pull-to-refresh (via returned refetch function)
 */
export const useBannerRefresh = ({
  refetch,
  enabled = true,
  refreshOnForeground = true,
  refreshOnLocationChange = true,
  locationChangeThreshold = 1000, // 1km default
}: UseBannerRefreshOptions) => {
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const isRefreshingRef = useRef(false);

  // Refresh on app foreground
  useAppState((state) => {
    if (!enabled || !refreshOnForeground) {
      return;
    }

    if (state === 'active' && !isRefreshingRef.current) {
      console.log('[BannerRefresh] App came to foreground, refreshing banners');
      isRefreshingRef.current = true;
      refetch().finally(() => {
        isRefreshingRef.current = false;
      });
    }
  });

  // Refresh on significant location change
  useLocationChange({
    enabled: enabled && refreshOnLocationChange,
    minDistance: locationChangeThreshold,
    onLocationChange: (location) => {
      if (!enabled || !refreshOnLocationChange || isRefreshingRef.current) {
        return;
      }

      const newLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
      };

      const lastLoc = lastLocationRef.current
        ? {
            latitude: lastLocationRef.current.lat,
            longitude: lastLocationRef.current.lng,
          }
        : null;

      if (
        !lastLocationRef.current ||
        hasMovedSignificantly(
          lastLoc,
          newLocation,
          locationChangeThreshold
        )
      ) {
        console.log(
          `[BannerRefresh] Location changed significantly, refreshing banners`
        );
        lastLocationRef.current = {
          lat: location.latitude,
          lng: location.longitude,
        };
        isRefreshingRef.current = true;
        refetch().finally(() => {
          isRefreshingRef.current = false;
        });
      }
    },
  });

  // Manual refresh function (for pull-to-refresh)
  const manualRefetch = useCallback(async () => {
    if (isRefreshingRef.current) {
      console.log('[BannerRefresh] Already refreshing, skipping');
      return;
    }

    console.log('[BannerRefresh] Manual refresh triggered');
    isRefreshingRef.current = true;
    try {
      await refetch();
    } finally {
      isRefreshingRef.current = false;
    }
  }, [refetch]);

  return manualRefetch;
};

