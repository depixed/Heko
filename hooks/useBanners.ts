import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { APP_CONFIG } from '@/constants/config';
import { bannerService, type Banner, type BannerParams } from '@/lib/bannerService';
import { bannerCache } from '@/utils/bannerCache';
import { bannerMonitoring } from '@/utils/bannerMonitoring';
import { useBannerRefresh } from './useBannerRefresh';

interface UseBannersOptions {
  enabled?: boolean;
  userLocation?: { lat: number; lng: number };
  city?: string;
  refreshOnForeground?: boolean;
  refreshOnLocationChange?: boolean;
  locationChangeThreshold?: number; // meters
}

export const useBanners = (options: UseBannersOptions = {}) => {
  const { user } = useAuth();
  const appVersion = APP_CONFIG.APP_VERSION;

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const retryDelay = 5000; // 5 seconds

  const loadBanners = useCallback(async () => {
    // Skip if disabled in config
    if (APP_CONFIG.BANNER.ENABLED === false) {
      console.log('[useBanners] Banners disabled in config');
      setLoading(false);
      setBanners([]);
      return;
    }
    
    // Skip if explicitly disabled in options
    if (options.enabled === false) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Try to load from cache first (instant display)
      console.log('[useBanners] Loading banners from cache');
      const cacheStartTime = Date.now();
      const cachedBanners = await bannerCache.getBanners();
      const cacheLoadTime = Date.now() - cacheStartTime;
      
      if (cachedBanners && cachedBanners.banners.length > 0) {
        console.log('[useBanners] Displaying cached banners:', cachedBanners.banners.length);
        bannerMonitoring.logBannerLoad(true, cacheLoadTime, 'cache');
        setBanners(cachedBanners.banners);
        setLoading(false);
      } else {
        console.log('[useBanners] No valid cache found');
        // Keep loading true while we fetch from API
        // Don't log as error - cache miss is normal
      }

      // 2. Fetch fresh data from API in background
      console.log('[useBanners] Fetching fresh banners from API');
      
      const params: BannerParams = {
        appVersion,
        isLoggedIn: !!user,
        userId: user?.id,
        city: options.city,
      };

      if (options.userLocation) {
        params.lat = options.userLocation.lat;
        params.lng = options.userLocation.lng;
      }

      try {
        const freshData = await bannerService.fetchBanners(params);
        
        // 3. Update cache and state if new data arrives
        console.log('[useBanners] API Response:', {
          hasData: !!freshData,
          hasBanners: !!freshData?.banners,
          bannerCount: freshData?.banners?.length || 0,
          responseStructure: freshData ? Object.keys(freshData) : null,
        });
        
        if (freshData && freshData.banners && Array.isArray(freshData.banners)) {
          console.log('[useBanners] Received fresh banners:', freshData.banners.length);
          console.log('[useBanners] Banner details:', freshData.banners.map(b => ({
            id: b.id,
            title: b.title,
            image_url: b.image_url?.substring(0, 50),
          })));
          
          // Save to cache (even if empty array)
          await bannerCache.saveBanners(freshData);
          
          // Update state
          setBanners(freshData.banners);
          setLoading(false);
          retryCountRef.current = 0; // Reset retry count on success
          
          // Log warning if no banners but API succeeded
          if (freshData.banners.length === 0) {
            console.warn('[useBanners] API returned empty banners array. Check database for active banners.');
          }
        } else {
          // Invalid response structure
          console.error('[useBanners] Invalid API response structure:', freshData);
          setBanners([]);
          setLoading(false);
        }
      } catch (fetchError) {
        // Handle 304 Not Modified - this is expected when cache is valid
        if (fetchError instanceof Error && fetchError.message === 'NOT_MODIFIED') {
          console.log('[useBanners] Server returned 304 Not Modified, using cached data');
          // We already have cached data displayed, so this is fine
          setLoading(false);
          retryCountRef.current = 0; // Reset retry count
          return;
        }
        
        // 4. Handle errors by falling back to cache (silent failure)
        console.error('[useBanners] Error fetching fresh banners:', fetchError);
        
        // Always try to use cached banners if available (silent fallback)
        if (!cachedBanners || cachedBanners.banners.length === 0) {
          const fallbackCache = await bannerCache.getBanners();
          if (fallbackCache && fallbackCache.banners.length > 0) {
            console.log('[useBanners] Using fallback cache after error');
            setBanners(fallbackCache.banners);
            setLoading(false);
            // Don't set error if we have cached banners - silent failure
          } else {
            // Only set error if we truly have no banners at all
            // But don't show it to users - banners are optional
            setError(fetchError instanceof Error ? fetchError : new Error('Failed to load banners'));
            setBanners([]);
            setLoading(false);
            
            // Retry in background if we haven't exceeded max retries
            // Only retry if we truly have no banners (not if we have cached ones)
            if (retryCountRef.current < maxRetries) {
              retryCountRef.current += 1;
              console.log(`[useBanners] Scheduling retry ${retryCountRef.current}/${maxRetries} in ${retryDelay}ms`);
              setTimeout(() => {
                // Only retry if still no banners displayed
                loadBanners();
              }, retryDelay);
            } else {
              console.log('[useBanners] Max retries reached, giving up');
              retryCountRef.current = 0; // Reset for next manual refresh
            }
          }
        } else {
          // We already have cached banners displayed - silent success
          // Don't set error, just keep showing cached banners
          setLoading(false);
          console.log('[useBanners] Using existing cached banners after error');
        }
      }
    } catch (error) {
      console.error('[useBanners] Unexpected error:', error);
      setLoading(false);
      
      // Try to show cached data as last resort (silent fallback)
      try {
        const fallbackCache = await bannerCache.getBanners();
        if (fallbackCache && fallbackCache.banners.length > 0) {
          setBanners(fallbackCache.banners);
          // Don't set error if we have cached banners - silent failure
        } else {
          // Only set error if we truly have no banners
          setError(error instanceof Error ? error : new Error('Failed to load banners'));
          setBanners([]);
          
          // Retry in background if we haven't exceeded max retries
          // Only retry if we truly have no banners
          if (retryCountRef.current < maxRetries && banners.length === 0) {
            retryCountRef.current += 1;
            console.log(`[useBanners] Scheduling retry ${retryCountRef.current}/${maxRetries} in ${retryDelay}ms`);
            setTimeout(() => {
              // Only retry if still no banners
              if (banners.length === 0) {
                loadBanners();
              }
            }, retryDelay);
          } else if (retryCountRef.current >= maxRetries) {
            console.log('[useBanners] Max retries reached, giving up');
            retryCountRef.current = 0;
          }
        }
      } catch (cacheError) {
        console.error('[useBanners] Error loading fallback cache:', cacheError);
        // Only set error if we truly have no banners at all
        setError(error instanceof Error ? error : new Error('Failed to load banners'));
        setBanners([]);
      }
    }
  }, [
    user?.id,
    options.enabled,
    options.userLocation?.lat,
    options.userLocation?.lng,
    options.city,
    appVersion,
  ]);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  // Smart refresh logic
  const manualRefetch = useBannerRefresh({
    refetch: loadBanners,
    enabled: options.enabled !== false,
    refreshOnForeground: options.refreshOnForeground !== false,
    refreshOnLocationChange: options.refreshOnLocationChange !== false,
    locationChangeThreshold: options.locationChangeThreshold,
  });

  return {
    banners,
    loading,
    error,
    refetch: loadBanners,
    refresh: manualRefetch, // Smart refresh function
  };
};

