import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import type { Banner } from '@/lib/bannerService';
import { bannerService } from '@/lib/bannerService';
import { sessionManager } from '@/utils/sessionManager';
import { handleBannerDeepLink } from '@/utils/deeplinkHandler';
import { useAuth } from '@/contexts/AuthContext';
import { APP_CONFIG } from '@/constants/config';
import { bannerMonitoring } from '@/utils/bannerMonitoring';
import BannerCard from './BannerCard';
import Colors from '@/constants/colors';

interface BannerCarouselProps {
  banners: Banner[];
  onBannerPress?: (banner: Banner) => void;
  onBannerVisible?: (bannerId: string) => void;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = 320;
const BANNER_SPACING = 16;
const BANNER_ITEM_WIDTH = BANNER_WIDTH + BANNER_SPACING;

const BannerCarousel: React.FC<BannerCarouselProps> = ({
  banners,
  onBannerPress,
  onBannerVisible,
  autoPlay = true,
  autoPlayInterval = 5000,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);

  // Handle banner press with click tracking
  const handleBannerPress = useCallback(async (banner: Banner) => {
    try {
      // Track click event
      const sessionId = await sessionManager.getSessionId();
      
      await bannerService.trackClick(banner.id, {
        user_id: user?.id || null,
        session_id: sessionId,
        city: undefined, // Can be enhanced with location context
        app_version: APP_CONFIG.APP_VERSION,
        device_type: Platform.OS, // 'ios', 'android', 'web'
        banner_position: currentIndex,
        carousel_length: banners.length,
      });

      console.log('[BannerCarousel] Click tracked for banner:', banner.id);
    } catch (error) {
      console.error('[BannerCarousel] Failed to track click:', error);
      // Continue with navigation even if tracking fails
    }

    // Handle deep link navigation
    try {
      handleBannerDeepLink(banner, router);
      bannerMonitoring.logDeepLink(banner.deeplink, true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[BannerCarousel] Failed to handle deeplink:', error);
      bannerMonitoring.logDeepLink(banner.deeplink, false, errorMessage);
    }

    // Call external onBannerPress callback if provided (for backward compatibility)
    if (onBannerPress) {
      onBannerPress(banner);
    }
  }, [onBannerPress, user?.id, currentIndex, banners.length, router]);

  // Handle banner visibility for impression tracking
  const handleBannerVisible = useCallback((bannerId: string) => {
    if (onBannerVisible) {
      onBannerVisible(bannerId);
    }
  }, [onBannerVisible]);

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || banners.length <= 1) {
      return;
    }

    const startAutoPlay = () => {
      autoPlayTimerRef.current = setInterval(() => {
        // Skip auto-play if user is manually scrolling
        if (isScrollingRef.current) {
          return;
        }

        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % banners.length;
          
          // Scroll to next banner
          scrollViewRef.current?.scrollTo({
            x: nextIndex * BANNER_ITEM_WIDTH,
            animated: true,
          });

          return nextIndex;
        });
      }, autoPlayInterval);
    };

    startAutoPlay();

    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
    };
  }, [autoPlay, autoPlayInterval, banners.length]);

  // Handle scroll events to update current index
  const handleScroll = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / BANNER_ITEM_WIDTH);
    
    if (index !== currentIndex && index >= 0 && index < banners.length) {
      setCurrentIndex(index);
    }
  }, [currentIndex, banners.length]);

  // Handle scroll begin (user is manually scrolling)
  const handleScrollBeginDrag = useCallback(() => {
    isScrollingRef.current = true;
  }, []);

  // Handle scroll end (user finished scrolling)
  const handleScrollEndDrag = useCallback(() => {
    // Reset scrolling flag after a short delay
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 1000);
  }, []);

  // Handle momentum scroll end (for iOS smooth scrolling)
  const handleMomentumScrollEnd = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / BANNER_ITEM_WIDTH);
    
    if (index >= 0 && index < banners.length) {
      setCurrentIndex(index);
    }
    
    isScrollingRef.current = false;
  }, [banners.length]);

  if (banners.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={BANNER_ITEM_WIDTH}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        accessibilityRole="scrollbar"
        accessibilityLabel="Banner carousel"
      >
        {banners.map((banner, index) => {
          // Determine if banner should load images eagerly or lazily
          // Load current and adjacent banners eagerly, others lazily
          const isNearVisible = index >= currentIndex - 1 && index <= currentIndex + 1;
          
          return (
            <BannerCard
              key={banner.id}
              banner={banner}
              onPress={handleBannerPress}
              onVisible={handleBannerVisible}
              priority={isNearVisible ? 'high' : 'low'} // Pass priority for lazy loading
            />
          );
        })}
      </ScrollView>

      {/* Pagination Dots */}
      {banners.length > 1 && (
        <View style={styles.pagination}>
          {banners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentIndex && styles.paginationDotActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Banner ${index + 1} of ${banners.length}`}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  scrollContent: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border.medium,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: Colors.brand.primary,
  },
});

export default BannerCarousel;

