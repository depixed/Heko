/**
 * Banner Testing Utilities
 * 
 * Helper functions for testing banner functionality
 */

import { bannerService, type Banner, type BannerParams } from '@/lib/bannerService';
import { bannerCache } from './bannerCache';
import { Platform } from 'react-native';

export interface TestBanner extends Banner {
  testId?: string;
}

/**
 * Creates mock banner data for testing
 */
export const createMockBanner = (overrides: Partial<Banner> = {}): Banner => {
  const defaultBanner: Banner = {
    id: `test-banner-${Date.now()}`,
    title: 'Test Banner',
    subtitle: 'Test Subtitle',
    image_url: 'https://via.placeholder.com/320x160',
    priority: 1,
    start_at: new Date().toISOString(),
    end_at: null,
    deeplink: 'heko://home',
    action_type: 'home',
    action_value: '',
    ...overrides,
  };

  return defaultBanner;
};

/**
 * Creates multiple mock banners for carousel testing
 */
export const createMockBanners = (count: number): Banner[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockBanner({
      id: `test-banner-${index}`,
      title: `Banner ${index + 1}`,
      priority: index + 1,
    })
  );
};

/**
 * Waits for banners to load (for testing)
 */
export const waitForBanners = async (
  maxWaitTime: number = 5000
): Promise<Banner[]> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const cachedBanners = await bannerCache.getBanners();
    if (cachedBanners && cachedBanners.banners.length > 0) {
      return cachedBanners.banners;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return [];
};

/**
 * Clears banner cache (for testing)
 */
export const clearBannerCache = async (): Promise<void> => {
  await bannerCache.clearCache();
  bannerService.clearETag();
};

/**
 * Mocks network conditions for testing
 */
export const mockNetworkCondition = (
  condition: 'online' | 'offline' | 'slow'
): void => {
  if (Platform.OS === 'web') {
    // For web, use navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: condition !== 'offline',
    });
    
    // Dispatch online/offline events
    if (condition === 'offline') {
      window.dispatchEvent(new Event('offline'));
    } else {
      window.dispatchEvent(new Event('online'));
    }
  }
};

/**
 * Validates banner data structure
 */
export const validateBanner = (banner: any): boolean => {
  return (
    banner &&
    typeof banner.id === 'string' &&
    typeof banner.title === 'string' &&
    typeof banner.image_url === 'string' &&
    typeof banner.priority === 'number' &&
    typeof banner.deeplink === 'string'
  );
};

/**
 * Validates banner response structure
 */
export const validateBannerResponse = (response: any): boolean => {
  return (
    response &&
    typeof response.placement === 'string' &&
    typeof response.version === 'number' &&
    Array.isArray(response.banners) &&
    response.banners.every(validateBanner)
  );
};

/**
 * Checks if banner is currently active (within date range)
 */
export const isBannerActive = (banner: Banner): boolean => {
  const now = new Date();
  
  if (banner.start_at) {
    const startDate = new Date(banner.start_at);
    if (now < startDate) {
      return false;
    }
  }
  
  if (banner.end_at) {
    const endDate = new Date(banner.end_at);
    if (now > endDate) {
      return false;
    }
  }
  
  return true;
};

/**
 * Filters banners by targeting criteria
 */
export const filterBannersByTargeting = (
  banners: Banner[],
  options: {
    isNewUser?: boolean;
    isLoggedIn?: boolean;
    city?: string;
    appVersion?: string;
  }
): Banner[] => {
  return banners.filter(banner => {
    // Add targeting logic here based on banner properties
    // This is a simplified version - actual implementation depends on banner schema
    return isBannerActive(banner);
  });
};

/**
 * Simulates banner impression tracking
 */
export const simulateImpressionTracking = async (
  bannerId: string,
  metadata: object = {}
): Promise<boolean> => {
  try {
    await bannerService.trackImpression(bannerId, metadata);
    return true;
  } catch (error) {
    console.error('[TestUtils] Failed to track impression:', error);
    return false;
  }
};

/**
 * Simulates banner click tracking
 */
export const simulateClickTracking = async (
  bannerId: string,
  metadata: object = {}
): Promise<boolean> => {
  try {
    await bannerService.trackClick(bannerId, metadata);
    return true;
  } catch (error) {
    console.error('[TestUtils] Failed to track click:', error);
    return false;
  }
};

/**
 * Measures banner load performance
 */
export const measureBannerLoadPerformance = async (
  params: BannerParams
): Promise<{
  loadTime: number;
  success: boolean;
  error?: Error;
}> => {
  const startTime = Date.now();
  
  try {
    await bannerService.fetchBanners(params);
    const loadTime = Date.now() - startTime;
    return { loadTime, success: true };
  } catch (error) {
    const loadTime = Date.now() - startTime;
    return {
      loadTime,
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

/**
 * Validates deep link format
 */
export const validateDeepLink = (deeplink: string): boolean => {
  if (!deeplink || typeof deeplink !== 'string') {
    return false;
  }
  
  // Valid formats:
  // - heko://category?groceries
  // - heko://product?product_id=123
  // - https://example.com
  // - heko://category/123
  
  const hekoPattern = /^heko:\/\//;
  const httpPattern = /^https?:\/\//;
  
  return hekoPattern.test(deeplink) || httpPattern.test(deeplink);
};

/**
 * Extracts action type from deep link
 */
export const extractActionType = (deeplink: string): string | null => {
  if (!validateDeepLink(deeplink)) {
    return null;
  }
  
  if (deeplink.startsWith('http://') || deeplink.startsWith('https://')) {
    return 'url';
  }
  
  const match = deeplink.match(/^heko:\/\/([^\/\?]+)/);
  return match ? match[1] : null;
};

/**
 * Test helper: Creates test environment
 */
export const setupTestEnvironment = async (): Promise<void> => {
  // Clear cache
  await clearBannerCache();
  
  // Reset network condition
  mockNetworkCondition('online');
  
  console.log('[TestUtils] Test environment setup complete');
};

/**
 * Test helper: Cleans up test environment
 */
export const cleanupTestEnvironment = async (): Promise<void> => {
  // Clear cache
  await clearBannerCache();
  
  console.log('[TestUtils] Test environment cleanup complete');
};

/**
 * Asserts banner count matches expected
 */
export const assertBannerCount = (
  banners: Banner[],
  expectedCount: number,
  message?: string
): void => {
  if (banners.length !== expectedCount) {
    throw new Error(
      message ||
        `Expected ${expectedCount} banners, got ${banners.length}`
    );
  }
};

/**
 * Asserts banner exists in array
 */
export const assertBannerExists = (
  banners: Banner[],
  bannerId: string,
  message?: string
): void => {
  const exists = banners.some(b => b.id === bannerId);
  if (!exists) {
    throw new Error(
      message || `Banner with id ${bannerId} not found`
    );
  }
};

/**
 * Asserts banner does not exist in array
 */
export const assertBannerNotExists = (
  banners: Banner[],
  bannerId: string,
  message?: string
): void => {
  const exists = banners.some(b => b.id === bannerId);
  if (exists) {
    throw new Error(
      message || `Banner with id ${bannerId} should not exist`
    );
  }
};

