import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import type { Banner } from '@/types';
import { appService } from '@/lib/app.service';

export const [BannerProvider, useBanners] = createContextHook(() => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = useCallback(async () => {
    try {
      console.log('[BannerContext] Loading banners');
      setIsLoading(true);
      const result = await appService.getBanners();
      if (result.success && result.data) {
        const appBanners: Banner[] = result.data.map(banner => ({
          id: banner.id,
          image: banner.image,
          title: banner.title,
          subtitle: banner.subtitle || undefined,
          action: banner.action_type && banner.action_value ? `${banner.action_type}:${banner.action_value}` : undefined,
        }));
        setBanners(appBanners);
        console.log('[BannerContext] Banners loaded:', appBanners.length);
      } else {
        console.error('[BannerContext] Error loading banners:', result.error);
        setBanners([]);
      }
    } catch (error) {
      console.error('[BannerContext] Error loading banners:', error);
      setBanners([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshBanners = useCallback(() => {
    return loadBanners();
  }, [loadBanners]);

  return {
    banners,
    isLoading,
    refreshBanners,
  };
});
