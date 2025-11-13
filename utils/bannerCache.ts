import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BannerResponse } from '@/lib/bannerService';

interface CachedBannerData {
  placement: string;
  version: number;
  banners: any[];
  ttl_seconds: number;
  cachedAt: number;
}

class BannerCache {
  private CACHE_KEY = 'heko-banners-cache';
  private CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

  /**
   * Saves banner data to AsyncStorage with timestamp
   */
  async saveBanners(data: BannerResponse): Promise<void> {
    try {
      console.log('[BannerCache] Saving banners to cache');
      
      const cachedData: CachedBannerData = {
        placement: data.placement,
        version: data.version,
        banners: data.banners,
        ttl_seconds: data.ttl_seconds,
        cachedAt: Date.now(),
      };
      
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(cachedData));
      console.log('[BannerCache] Banners cached successfully');
    } catch (error) {
      console.error('[BannerCache] Error saving banners to cache:', error);
      // Don't throw - caching failures shouldn't break the app
    }
  }

  /**
   * Retrieves cached banners if they exist and are not expired
   */
  async getBanners(): Promise<BannerResponse | null> {
    try {
      console.log('[BannerCache] Retrieving banners from cache');
      
      const cachedString = await AsyncStorage.getItem(this.CACHE_KEY);
      
      if (!cachedString) {
        console.log('[BannerCache] No cached banners found');
        return null;
      }
      
      const cachedData: CachedBannerData = JSON.parse(cachedString);
      
      // Check if cache is expired
      const now = Date.now();
      const cacheAge = now - cachedData.cachedAt;
      const cacheDuration = Math.min(
        this.CACHE_DURATION,
        (cachedData.ttl_seconds || 900) * 1000 // Use API TTL or default to 15 min
      );
      
      if (cacheAge > cacheDuration) {
        console.log('[BannerCache] Cache expired, clearing');
        await this.clearCache();
        return null;
      }
      
      console.log('[BannerCache] Found valid cached banners');
      
      // Convert back to BannerResponse format
      const bannerResponse: BannerResponse = {
        placement: cachedData.placement,
        version: cachedData.version,
        banners: cachedData.banners,
        ttl_seconds: cachedData.ttl_seconds,
      };
      
      return bannerResponse;
    } catch (error) {
      console.error('[BannerCache] Error retrieving banners from cache:', error);
      // Clear corrupted cache
      await this.clearCache();
      return null;
    }
  }

  /**
   * Clears the cached banner data
   */
  async clearCache(): Promise<void> {
    try {
      console.log('[BannerCache] Clearing cache');
      await AsyncStorage.removeItem(this.CACHE_KEY);
      console.log('[BannerCache] Cache cleared successfully');
    } catch (error) {
      console.error('[BannerCache] Error clearing cache:', error);
    }
  }

  /**
   * Checks if cache exists and is valid (not expired)
   */
  async isCacheValid(): Promise<boolean> {
    try {
      const cachedString = await AsyncStorage.getItem(this.CACHE_KEY);
      
      if (!cachedString) {
        return false;
      }
      
      const cachedData: CachedBannerData = JSON.parse(cachedString);
      const now = Date.now();
      const cacheAge = now - cachedData.cachedAt;
      const cacheDuration = Math.min(
        this.CACHE_DURATION,
        (cachedData.ttl_seconds || 900) * 1000
      );
      
      return cacheAge <= cacheDuration;
    } catch (error) {
      console.error('[BannerCache] Error checking cache validity:', error);
      return false;
    }
  }
}

export const bannerCache = new BannerCache();

