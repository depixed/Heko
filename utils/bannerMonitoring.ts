/**
 * Banner Monitoring Utilities
 * 
 * Tools for monitoring banner performance, errors, and analytics
 */

import { Platform } from 'react-native';
import { bannerService } from '@/lib/bannerService';
import { bannerCache } from './bannerCache';

export interface BannerMetrics {
  // Load metrics
  bannerLoadSuccessRate: number;
  bannerLoadTime: number;
  cacheHitRate: number;
  
  // Tracking metrics
  impressionTrackingRate: number;
  clickTrackingRate: number;
  
  // Error metrics
  apiErrorRate: number;
  imageLoadFailureRate: number;
  deepLinkErrorRate: number;
  
  // Performance metrics
  averageBannerCount: number;
}

interface BannerLoadEvent {
  timestamp: number;
  success: boolean;
  loadTime: number;
  source: 'cache' | 'api';
  error?: string;
}

interface BannerTrackingEvent {
  timestamp: number;
  type: 'impression' | 'click';
  bannerId: string;
  success: boolean;
  error?: string;
}

interface BannerImageLoadEvent {
  timestamp: number;
  bannerId: string;
  success: boolean;
  loadTime: number;
  error?: string;
}

interface DeepLinkEvent {
  timestamp: number;
  deeplink: string;
  success: boolean;
  error?: string;
}

class BannerMonitoring {
  private loadEvents: BannerLoadEvent[] = [];
  private trackingEvents: BannerTrackingEvent[] = [];
  private imageLoadEvents: BannerImageLoadEvent[] = [];
  private deepLinkEvents: DeepLinkEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events

  /**
   * Logs a banner load event
   */
  logBannerLoad(
    success: boolean,
    loadTime: number,
    source: 'cache' | 'api',
    error?: string
  ): void {
    const event: BannerLoadEvent = {
      timestamp: Date.now(),
      success,
      loadTime,
      source,
      error,
    };

    this.loadEvents.push(event);
    
    // Keep only last maxEvents
    if (this.loadEvents.length > this.maxEvents) {
      this.loadEvents.shift();
    }

    // Log to console in development
    if (__DEV__) {
      console.log('[BannerMonitoring] Load event:', event);
    }
  }

  /**
   * Logs a banner tracking event (impression or click)
   */
  logTrackingEvent(
    type: 'impression' | 'click',
    bannerId: string,
    success: boolean,
    error?: string
  ): void {
    const event: BannerTrackingEvent = {
      timestamp: Date.now(),
      type,
      bannerId,
      success,
      error,
    };

    this.trackingEvents.push(event);
    
    // Keep only last maxEvents
    if (this.trackingEvents.length > this.maxEvents) {
      this.trackingEvents.shift();
    }

    // Log to console in development
    if (__DEV__) {
      console.log('[BannerMonitoring] Tracking event:', event);
    }
  }

  /**
   * Logs a banner image load event
   */
  logImageLoad(
    bannerId: string,
    success: boolean,
    loadTime: number,
    error?: string
  ): void {
    const event: BannerImageLoadEvent = {
      timestamp: Date.now(),
      bannerId,
      success,
      loadTime,
      error,
    };

    this.imageLoadEvents.push(event);
    
    // Keep only last maxEvents
    if (this.imageLoadEvents.length > this.maxEvents) {
      this.imageLoadEvents.shift();
    }

    // Only log errors to console in development (reduce console spam)
    if (__DEV__ && !success) {
      console.warn('[BannerMonitoring] Image load failed:', { bannerId, loadTime, error });
    }
    // Optionally log slow loads (>2 seconds) for performance monitoring
    if (__DEV__ && success && loadTime > 2000) {
      console.warn('[BannerMonitoring] Slow image load:', { bannerId, loadTime: `${loadTime}ms` });
    }
  }

  /**
   * Logs a deep link navigation event
   */
  logDeepLink(deeplink: string, success: boolean, error?: string): void {
    const event: DeepLinkEvent = {
      timestamp: Date.now(),
      deeplink,
      success,
      error,
    };

    this.deepLinkEvents.push(event);
    
    // Keep only last maxEvents
    if (this.deepLinkEvents.length > this.maxEvents) {
      this.deepLinkEvents.shift();
    }

    // Log to console in development
    if (__DEV__) {
      console.log('[BannerMonitoring] Deep link event:', event);
    }
  }

  /**
   * Calculates banner load success rate
   */
  getBannerLoadSuccessRate(timeWindowMs: number = 3600000): number {
    const cutoff = Date.now() - timeWindowMs;
    const recentEvents = this.loadEvents.filter(e => e.timestamp >= cutoff);
    
    if (recentEvents.length === 0) {
      return 100; // No events = 100% success
    }

    const successCount = recentEvents.filter(e => e.success).length;
    return (successCount / recentEvents.length) * 100;
  }

  /**
   * Calculates average banner load time
   */
  getAverageBannerLoadTime(timeWindowMs: number = 3600000): number {
    const cutoff = Date.now() - timeWindowMs;
    const recentEvents = this.loadEvents.filter(
      e => e.timestamp >= cutoff && e.success
    );
    
    if (recentEvents.length === 0) {
      return 0;
    }

    const totalTime = recentEvents.reduce((sum, e) => sum + e.loadTime, 0);
    return totalTime / recentEvents.length;
  }

  /**
   * Calculates cache hit rate
   */
  getCacheHitRate(timeWindowMs: number = 3600000): number {
    const cutoff = Date.now() - timeWindowMs;
    const recentEvents = this.loadEvents.filter(e => e.timestamp >= cutoff);
    
    if (recentEvents.length === 0) {
      return 0;
    }

    const cacheHits = recentEvents.filter(e => e.source === 'cache').length;
    return (cacheHits / recentEvents.length) * 100;
  }

  /**
   * Calculates impression tracking rate
   */
  getImpressionTrackingRate(timeWindowMs: number = 3600000): number {
    const cutoff = Date.now() - timeWindowMs;
    const recentEvents = this.trackingEvents.filter(
      e => e.timestamp >= cutoff && e.type === 'impression'
    );
    
    if (recentEvents.length === 0) {
      return 100; // No events = 100% success
    }

    const successCount = recentEvents.filter(e => e.success).length;
    return (successCount / recentEvents.length) * 100;
  }

  /**
   * Calculates click tracking rate
   */
  getClickTrackingRate(timeWindowMs: number = 3600000): number {
    const cutoff = Date.now() - timeWindowMs;
    const recentEvents = this.trackingEvents.filter(
      e => e.timestamp >= cutoff && e.type === 'click'
    );
    
    if (recentEvents.length === 0) {
      return 100; // No events = 100% success
    }

    const successCount = recentEvents.filter(e => e.success).length;
    return (successCount / recentEvents.length) * 100;
  }

  /**
   * Calculates API error rate
   */
  getApiErrorRate(timeWindowMs: number = 3600000): number {
    const cutoff = Date.now() - timeWindowMs;
    const recentEvents = this.loadEvents.filter(
      e => e.timestamp >= cutoff && e.source === 'api'
    );
    
    if (recentEvents.length === 0) {
      return 0;
    }

    const errorCount = recentEvents.filter(e => !e.success).length;
    return (errorCount / recentEvents.length) * 100;
  }

  /**
   * Calculates image load failure rate
   */
  getImageLoadFailureRate(timeWindowMs: number = 3600000): number {
    const cutoff = Date.now() - timeWindowMs;
    const recentEvents = this.imageLoadEvents.filter(e => e.timestamp >= cutoff);
    
    if (recentEvents.length === 0) {
      return 0;
    }

    const failureCount = recentEvents.filter(e => !e.success).length;
    return (failureCount / recentEvents.length) * 100;
  }

  /**
   * Calculates deep link error rate
   */
  getDeepLinkErrorRate(timeWindowMs: number = 3600000): number {
    const cutoff = Date.now() - timeWindowMs;
    const recentEvents = this.deepLinkEvents.filter(e => e.timestamp >= cutoff);
    
    if (recentEvents.length === 0) {
      return 0;
    }

    const errorCount = recentEvents.filter(e => !e.success).length;
    return (errorCount / recentEvents.length) * 100;
  }

  /**
   * Gets all metrics in one object
   */
  getMetrics(timeWindowMs: number = 3600000): BannerMetrics {
    return {
      bannerLoadSuccessRate: this.getBannerLoadSuccessRate(timeWindowMs),
      bannerLoadTime: this.getAverageBannerLoadTime(timeWindowMs),
      cacheHitRate: this.getCacheHitRate(timeWindowMs),
      impressionTrackingRate: this.getImpressionTrackingRate(timeWindowMs),
      clickTrackingRate: this.getClickTrackingRate(timeWindowMs),
      apiErrorRate: this.getApiErrorRate(timeWindowMs),
      imageLoadFailureRate: this.getImageLoadFailureRate(timeWindowMs),
      deepLinkErrorRate: this.getDeepLinkErrorRate(timeWindowMs),
      averageBannerCount: 0, // Would need to track banner counts separately
    };
  }

  /**
   * Clears all monitoring data
   */
  clear(): void {
    this.loadEvents = [];
    this.trackingEvents = [];
    this.imageLoadEvents = [];
    this.deepLinkEvents = [];
    console.log('[BannerMonitoring] All monitoring data cleared');
  }

  /**
   * Exports monitoring data for analysis
   */
  exportData(): {
    loadEvents: BannerLoadEvent[];
    trackingEvents: BannerTrackingEvent[];
    imageLoadEvents: BannerImageLoadEvent[];
    deepLinkEvents: DeepLinkEvent[];
    metrics: BannerMetrics;
  } {
    return {
      loadEvents: [...this.loadEvents],
      trackingEvents: [...this.trackingEvents],
      imageLoadEvents: [...this.imageLoadEvents],
      deepLinkEvents: [...this.deepLinkEvents],
      metrics: this.getMetrics(),
    };
  }

  /**
   * Checks if metrics are within acceptable thresholds
   */
  checkHealth(): {
    healthy: boolean;
    issues: string[];
  } {
    const metrics = this.getMetrics();
    const issues: string[] = [];

    // Check thresholds
    if (metrics.bannerLoadSuccessRate < 90) {
      issues.push(`Banner load success rate is low: ${metrics.bannerLoadSuccessRate.toFixed(2)}%`);
    }

    if (metrics.apiErrorRate > 5) {
      issues.push(`API error rate is high: ${metrics.apiErrorRate.toFixed(2)}%`);
    }

    if (metrics.impressionTrackingRate < 85) {
      issues.push(`Impression tracking rate is low: ${metrics.impressionTrackingRate.toFixed(2)}%`);
    }

    if (metrics.clickTrackingRate < 90) {
      issues.push(`Click tracking rate is low: ${metrics.clickTrackingRate.toFixed(2)}%`);
    }

    if (metrics.imageLoadFailureRate > 2) {
      issues.push(`Image load failure rate is high: ${metrics.imageLoadFailureRate.toFixed(2)}%`);
    }

    if (metrics.deepLinkErrorRate > 1) {
      issues.push(`Deep link error rate is high: ${metrics.deepLinkErrorRate.toFixed(2)}%`);
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }
}

export const bannerMonitoring = new BannerMonitoring();

/**
 * Hook to get banner monitoring metrics (for React components)
 */
export const useBannerMonitoring = () => {
  const getMetrics = () => bannerMonitoring.getMetrics();
  const getHealth = () => bannerMonitoring.checkHealth();
  const exportData = () => bannerMonitoring.exportData();

  return {
    getMetrics,
    getHealth,
    exportData,
  };
};

