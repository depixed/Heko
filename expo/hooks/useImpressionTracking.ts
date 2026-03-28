import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { bannerService } from '@/lib/bannerService';
import { sessionManager } from '@/utils/sessionManager';
import { APP_CONFIG } from '@/constants/config';

interface UseImpressionTrackingOptions {
  bannerId: string;
  threshold?: number; // Visibility threshold (0-1), default 0.5 (50%)
  minDuration?: number; // Minimum visibility duration in ms, default 1000ms
}

/**
 * Hook for tracking banner impressions with viewport-based detection
 * 
 * Tracking Criteria:
 * - 50% of banner must be visible (configurable)
 * - Minimum 1 second visibility duration (configurable)
 * - Track only once per session per banner
 */
export const useImpressionTracking = ({
  bannerId,
  threshold = 0.5,
  minDuration = 1000,
}: UseImpressionTrackingOptions) => {
  const { user } = useAuth();
  const [tracked, setTracked] = useState(false);
  const visibilityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(false);

  const trackImpression = useCallback(async () => {
    if (tracked) {
      return;
    }

    try {
      const sessionId = await sessionManager.getSessionId();
      
      await bannerService.trackImpression(bannerId, {
        user_id: user?.id || null,
        session_id: sessionId,
        city: undefined, // Can be enhanced with location context
        app_version: APP_CONFIG.APP_VERSION,
        device_type: Platform.OS, // 'ios', 'android', 'web'
        visibility_threshold: threshold,
        visibility_duration: minDuration,
      });

      setTracked(true);
      console.log('[ImpressionTracking] Tracked impression for banner:', bannerId);
    } catch (error) {
      console.error('[ImpressionTracking] Failed to track impression:', error);
      // Don't set tracked to true on error, so we can retry
    }
  }, [bannerId, tracked, user?.id, threshold, minDuration]);

  /**
   * Call this when banner becomes visible (50%+ threshold)
   */
  const handleVisible = useCallback(() => {
    if (tracked || isVisibleRef.current) {
      return;
    }

    isVisibleRef.current = true;

    // Clear any existing timer
    if (visibilityTimerRef.current) {
      clearTimeout(visibilityTimerRef.current);
    }

    // Set timer to track after minimum duration
    visibilityTimerRef.current = setTimeout(() => {
      if (isVisibleRef.current && !tracked) {
        trackImpression();
      }
    }, minDuration);
  }, [tracked, minDuration, trackImpression]);

  /**
   * Call this when banner becomes hidden
   */
  const handleHidden = useCallback(() => {
    isVisibleRef.current = false;

    // Clear timer if banner is hidden before minimum duration
    if (visibilityTimerRef.current) {
      clearTimeout(visibilityTimerRef.current);
      visibilityTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (visibilityTimerRef.current) {
        clearTimeout(visibilityTimerRef.current);
      }
    };
  }, []);

  return {
    tracked,
    trackImpression,
    handleVisible,
    handleHidden,
  };
};

/**
 * Web-specific: Uses Intersection Observer API
 */
export const useWebImpressionTracking = ({
  bannerId,
  threshold = 0.5,
  minDuration = 1000,
}: UseImpressionTrackingOptions) => {
  const { user } = useAuth();
  const [tracked, setTracked] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibilityStartRef = useRef<number | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !elementRef.current) {
      return;
    }

    const trackImpression = async () => {
      if (tracked) {
        return;
      }

      try {
        const sessionId = await sessionManager.getSessionId();
        
        await bannerService.trackImpression(bannerId, {
          user_id: user?.id || null,
          session_id: sessionId,
          city: undefined,
          app_version: APP_CONFIG.APP_VERSION,
          device_type: Platform.OS,
          visibility_threshold: threshold,
          visibility_duration: minDuration,
        });

        setTracked(true);
        console.log('[ImpressionTracking] Tracked impression for banner:', bannerId);
      } catch (error) {
        console.error('[ImpressionTracking] Failed to track impression:', error);
      }
    };

    // Create Intersection Observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isVisible = entry.isIntersecting && entry.intersectionRatio >= threshold;

          if (isVisible && !visibilityStartRef.current) {
            // Banner became visible, start timer
            visibilityStartRef.current = Date.now();
          } else if (!isVisible && visibilityStartRef.current) {
            // Banner became hidden before duration, reset
            visibilityStartRef.current = null;
          } else if (isVisible && visibilityStartRef.current) {
            // Check if minimum duration has passed
            const duration = Date.now() - visibilityStartRef.current;
            if (duration >= minDuration && !tracked) {
              trackImpression();
            }
          }
        });
      },
      {
        threshold: threshold,
      }
    );

    // Observe the element
    if (elementRef.current) {
      observerRef.current.observe(elementRef.current);
    }

    return () => {
      if (observerRef.current && elementRef.current) {
        observerRef.current.unobserve(elementRef.current);
      }
    };
  }, [bannerId, tracked, user?.id, threshold, minDuration]);

  return {
    tracked,
    elementRef,
  };
};

