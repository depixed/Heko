import { SUPABASE_CONFIG } from '@/constants/supabase';
import { bannerMonitoring } from '@/utils/bannerMonitoring';

const FUNCTIONS_URL = `${SUPABASE_CONFIG.URL}/functions/v1`;

export interface BannerParams {
  lat?: number;
  lng?: number;
  appVersion: string;
  city?: string;
  isLoggedIn: boolean;
  userId?: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  priority: number;
  start_at: string | null;
  end_at: string | null;
  deeplink: string;
  action_type: string;
  action_value: string;
}

export interface BannerResponse {
  placement: string;
  version: number;
  banners: Banner[];
  ttl_seconds: number;
}

class BannerService {
  private baseUrl: string;
  private apiKey: string;
  private lastETag: string | null = null;

  constructor() {
    this.baseUrl = FUNCTIONS_URL;
    this.apiKey = SUPABASE_CONFIG.PUBLISHABLE_KEY;
  }

  /**
   * Builds query parameters for banner API request
   */
  private buildQueryParams(params: BannerParams): string {
    const queryParams = new URLSearchParams();
    
    queryParams.append('app_version', params.appVersion);
    queryParams.append('is_logged_in', params.isLoggedIn.toString());
    
    if (params.lat !== undefined && params.lng !== undefined) {
      queryParams.append('lat', params.lat.toString());
      queryParams.append('lng', params.lng.toString());
    }
    
    if (params.city) {
      queryParams.append('city', params.city);
    }
    
    if (params.userId) {
      queryParams.append('user_id', params.userId);
    }
    
    return queryParams.toString();
  }

  /**
   * Fetches banners from the API with ETag caching support
   */
  async fetchBanners(params: BannerParams): Promise<BannerResponse> {
    const startTime = Date.now();
    
    try {
      console.log('[BannerService] Fetching banners with params:', params);
      console.log('[BannerService] Base URL:', this.baseUrl);
      console.log('[BannerService] API Key present:', !!this.apiKey);
      
      const queryString = this.buildQueryParams(params);
      const url = `${this.baseUrl}/get-banners?${queryString}`;
      
      console.log('[BannerService] Full URL:', url);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'apikey': this.apiKey,
      };
      
      // Add If-None-Match header if we have a cached ETag
      if (this.lastETag) {
        headers['If-None-Match'] = this.lastETag;
      }
      
      console.log('[BannerService] Making fetch request...');
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      
      console.log('[BannerService] Response status:', response.status);
      console.log('[BannerService] Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Handle 304 Not Modified - return cached data
      if (response.status === 304) {
        console.log('[BannerService] Received 304 Not Modified, using cached data');
        const loadTime = Date.now() - startTime;
        bannerMonitoring.logBannerLoad(true, loadTime, 'cache');
        // The caller should handle cached data from bannerCache
        throw new Error('NOT_MODIFIED');
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        const loadTime = Date.now() - startTime;
        const errorMessage = `Failed to fetch banners: ${response.status} ${errorText}`;
        console.error('[BannerService] Error fetching banners:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          url,
          headers: Object.fromEntries(response.headers.entries()),
        });
        bannerMonitoring.logBannerLoad(false, loadTime, 'api', errorMessage);
        
        // Provide more helpful error messages
        if (response.status === 404) {
          throw new Error('Banner endpoint not found. Please ensure the get-banners edge function is deployed.');
        } else if (response.status === 500) {
          throw new Error('Server error while fetching banners. Please check edge function logs.');
        } else if (response.status === 403) {
          throw new Error('Access forbidden. Please check API key permissions.');
        }
        
        throw new Error(errorMessage);
      }
      
      // Extract ETag from response headers
      const etag = response.headers.get('ETag');
      if (etag) {
        this.lastETag = etag;
        console.log('[BannerService] Received ETag:', etag);
      }
      
      const responseText = await response.text();
      console.log('[BannerService] Response body:', responseText.substring(0, 500)); // Log first 500 chars
      
      let data: BannerResponse;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[BannerService] Failed to parse JSON response:', parseError);
        console.error('[BannerService] Response text:', responseText);
        throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
      
      const loadTime = Date.now() - startTime;
      console.log(`[BannerService] Fetched ${data.banners?.length || 0} banners`);
      
      // Validate response structure
      if (!data.banners || !Array.isArray(data.banners)) {
        console.error('[BannerService] Invalid response structure:', {
          data,
          hasBanners: !!data.banners,
          isArray: Array.isArray(data.banners),
          type: typeof data.banners,
        });
        throw new Error('Invalid response structure: banners array missing');
      }
      
      // Log banner details for debugging
      if (data.banners.length > 0) {
        console.log('[BannerService] Banner IDs:', data.banners.map(b => b.id));
        console.log('[BannerService] Banner titles:', data.banners.map(b => b.title));
      } else {
        console.warn('[BannerService] API returned empty banners array. This could mean:');
        console.warn('  1. No active banners in database');
        console.warn('  2. All banners filtered out by targeting rules');
        console.warn('  3. Banner date ranges exclude current time');
      }
      
      // Validate each banner has required fields
      const invalidBanners = data.banners.filter(b => !b.id || !b.image_url);
      if (invalidBanners.length > 0) {
        console.warn('[BannerService] Found banners with missing required fields:', invalidBanners);
      }
      
      // Log successful API load
      bannerMonitoring.logBannerLoad(true, loadTime, 'api');
      
      return data;
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_MODIFIED') {
        // 304 is not an error - it's a cache hit
        throw error; // Re-throw to be handled by caller
      }
      
      // Log error if not already logged
      const loadTime = Date.now() - startTime;
      if (!error || (error instanceof Error && !error.message.includes('Failed to fetch banners'))) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        bannerMonitoring.logBannerLoad(false, loadTime, 'api', errorMessage);
      }
      
      console.error('[BannerService] Error fetching banners:', error);
      throw error;
    }
  }

  /**
   * Tracks banner impression
   */
  async trackImpression(bannerId: string, metadata: object = {}): Promise<void> {
    try {
      console.log('[BannerService] Tracking impression for banner:', bannerId);
      
      const response = await fetch(`${this.baseUrl}/track-banner-impression`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'apikey': this.apiKey,
        },
        body: JSON.stringify({
          banner_id: bannerId,
          ...metadata,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `Failed to track impression: ${response.status} ${errorText}`;
        console.error('[BannerService] Error tracking impression:', response.status, errorText);
        bannerMonitoring.logTrackingEvent('impression', bannerId, false, errorMessage);
        // Don't throw - tracking failures shouldn't break the app
        return;
      }
      
      console.log('[BannerService] Impression tracked successfully');
      bannerMonitoring.logTrackingEvent('impression', bannerId, true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[BannerService] Error tracking impression:', error);
      bannerMonitoring.logTrackingEvent('impression', bannerId, false, errorMessage);
      // Don't throw - tracking failures shouldn't break the app
    }
  }

  /**
   * Tracks banner click
   */
  async trackClick(bannerId: string, metadata: object = {}): Promise<void> {
    try {
      console.log('[BannerService] Tracking click for banner:', bannerId);
      
      const response = await fetch(`${this.baseUrl}/track-banner-click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'apikey': this.apiKey,
        },
        body: JSON.stringify({
          banner_id: bannerId,
          ...metadata,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `Failed to track click: ${response.status} ${errorText}`;
        console.error('[BannerService] Error tracking click:', response.status, errorText);
        bannerMonitoring.logTrackingEvent('click', bannerId, false, errorMessage);
        // Don't throw - tracking failures shouldn't break the app
        return;
      }
      
      console.log('[BannerService] Click tracked successfully');
      bannerMonitoring.logTrackingEvent('click', bannerId, true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[BannerService] Error tracking click:', error);
      bannerMonitoring.logTrackingEvent('click', bannerId, false, errorMessage);
      // Don't throw - tracking failures shouldn't break the app
    }
  }

  /**
   * Clears the cached ETag (useful for force refresh)
   */
  clearETag(): void {
    this.lastETag = null;
    console.log('[BannerService] ETag cleared');
  }

  /**
   * Prefetches banners in the background on app launch
   * This helps ensure banners are ready when the home screen loads
   */
  async prefetchBanners(params?: Partial<BannerParams>): Promise<void> {
    try {
      console.log('[BannerService] Prefetching banners');
      
      const defaultParams: BannerParams = {
        appVersion: params?.appVersion || '1.0.0',
        isLoggedIn: params?.isLoggedIn || false,
        userId: params?.userId,
        city: params?.city,
        lat: params?.lat,
        lng: params?.lng,
      };

      // Fetch banners and cache them
      const data = await this.fetchBanners(defaultParams);
      
      // Cache is automatically saved by bannerCache in useBanners hook
      console.log('[BannerService] Banners prefetched successfully');
    } catch (error) {
      // Silent failure - prefetching is optional
      console.warn('[BannerService] Prefetch failed (non-critical):', error);
    }
  }
}

export const bannerService = new BannerService();

