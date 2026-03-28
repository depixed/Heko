import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import BannerCarousel from './BannerCarousel';
import Colors from '@/constants/colors';
import type { Banner } from '@/lib/bannerService';

interface BannerSectionProps {
  banners: Banner[];
  loading: boolean;
  error: Error | null;
  onBannerPress?: (banner: Banner) => void;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

/**
 * BannerSection component with silent error handling
 * 
 * Error Strategy:
 * - Silent failures (banners are optional)
 * - Show cached banners on network error
 * - Retry in background
 * - No error UI shown to users
 */
const BannerSection: React.FC<BannerSectionProps> = ({
  banners,
  loading,
  error,
  onBannerPress,
  autoPlay = true,
  autoPlayInterval = 5000,
}) => {
  // Show skeleton only if loading AND no banners available
  if (loading && banners.length === 0) {
    return (
      <View style={styles.skeleton}>
        <ActivityIndicator size="large" color={Colors.brand.primary} />
      </View>
    );
  }

  // Log errors for debugging (even if silent to user)
  if (error) {
    console.error('[BannerSection] Error loading banners:', error);
    console.error('[BannerSection] Error details:', {
      message: error.message,
      stack: error.stack,
      bannersCount: banners.length,
      loading,
    });
  }

  // Silent failure - don't show error to user
  // Banners are optional content, so we just don't render anything
  if (error && banners.length === 0) {
    // Log error for debugging but don't show to user
    console.warn('[BannerSection] Error loading banners (silent failure):', error);
    return null;
  }

  // No banners available - don't show section
  if (banners.length === 0) {
    // Log for debugging
    if (__DEV__) {
      console.log('[BannerSection] No banners to display', { loading, error: error?.message });
    }
    return null;
  }

  // Render carousel with available banners (could be cached or fresh)
  return (
    <BannerCarousel
      banners={banners}
      onBannerPress={onBannerPress}
      autoPlay={autoPlay}
      autoPlayInterval={autoPlayInterval}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    height: 160,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BannerSection;

