/**
 * Banner Debug Utilities
 * 
 * Helper functions for debugging banner issues
 */

import { bannerService, type BannerParams } from '@/lib/bannerService';
import { bannerCache } from './bannerCache';
import { APP_CONFIG } from '@/constants/config';
import { SUPABASE_CONFIG } from '@/constants/supabase';

/**
 * Tests banner API endpoint and logs detailed information
 */
export const testBannerAPI = async (params: Partial<BannerParams> = {}): Promise<void> => {
  console.log('=== BANNER API DEBUG TEST ===');
  
  const testParams: BannerParams = {
    appVersion: params.appVersion || APP_CONFIG.APP_VERSION,
    isLoggedIn: params.isLoggedIn ?? false,
    userId: params.userId,
    city: params.city,
    lat: params.lat,
    lng: params.lng,
  };
  
  console.log('Test params:', testParams);
  console.log('Supabase URL:', SUPABASE_CONFIG.URL);
  console.log('API Key present:', !!SUPABASE_CONFIG.PUBLISHABLE_KEY);
  console.log('Banner enabled:', APP_CONFIG.BANNER.ENABLED);
  
  // Test cache first
  console.log('\n--- Testing Cache ---');
  try {
    const cached = await bannerCache.getBanners();
    console.log('Cache result:', cached ? `${cached.banners.length} banners` : 'No cache');
  } catch (error) {
    console.error('Cache error:', error);
  }
  
  // Test API
  console.log('\n--- Testing API ---');
  try {
    const result = await bannerService.fetchBanners(testParams);
    console.log('API Success!');
    console.log('Banners received:', result.banners.length);
    console.log('Banner IDs:', result.banners.map(b => b.id));
    console.log('Response structure:', {
      placement: result.placement,
      version: result.version,
      ttl_seconds: result.ttl_seconds,
    });
  } catch (error) {
    console.error('API Error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Test direct fetch
    console.log('\n--- Testing Direct Fetch ---');
    try {
      const queryString = new URLSearchParams({
        app_version: testParams.appVersion,
        is_logged_in: testParams.isLoggedIn.toString(),
      });
      if (testParams.city) queryString.append('city', testParams.city);
      if (testParams.userId) queryString.append('user_id', testParams.userId);
      if (testParams.lat !== undefined && testParams.lng !== undefined) {
        queryString.append('lat', testParams.lat.toString());
        queryString.append('lng', testParams.lng.toString());
      }
      
      const url = `${SUPABASE_CONFIG.URL}/functions/v1/get-banners?${queryString}`;
      console.log('Direct fetch URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_CONFIG.PUBLISHABLE_KEY}`,
          'apikey': SUPABASE_CONFIG.PUBLISHABLE_KEY,
        },
      });
      
      console.log('Direct fetch status:', response.status);
      console.log('Direct fetch headers:', Object.fromEntries(response.headers.entries()));
      
      const text = await response.text();
      console.log('Direct fetch response:', text.substring(0, 500));
      
      if (response.ok) {
        const data = JSON.parse(text);
        console.log('Direct fetch parsed:', data);
      }
    } catch (directError) {
      console.error('Direct fetch error:', directError);
    }
  }
  
  console.log('\n=== END DEBUG TEST ===');
};

/**
 * Clears banner cache and forces fresh fetch
 */
export const clearBannerCacheAndRefresh = async (params: Partial<BannerParams> = {}): Promise<void> => {
  console.log('Clearing banner cache...');
  await bannerCache.clearCache();
  bannerService.clearETag();
  console.log('Cache cleared. Testing fresh fetch...');
  await testBannerAPI(params);
};

/**
 * Gets banner system status
 */
export const getBannerStatus = async (): Promise<{
  enabled: boolean;
  cacheExists: boolean;
  cacheValid: boolean;
  apiUrl: string;
  apiKeyPresent: boolean;
}> => {
  const cacheExists = await bannerCache.isCacheValid();
  const cached = await bannerCache.getBanners();
  
  return {
    enabled: APP_CONFIG.BANNER.ENABLED,
    cacheExists: !!cached,
    cacheValid: cacheExists,
    apiUrl: `${SUPABASE_CONFIG.URL}/functions/v1/get-banners`,
    apiKeyPresent: !!SUPABASE_CONFIG.PUBLISHABLE_KEY,
  };
};

