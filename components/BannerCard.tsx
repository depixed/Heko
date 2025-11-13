import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import type { Banner } from '@/lib/bannerService';
import Colors from '@/constants/colors';
import { useImpressionTracking, useWebImpressionTracking } from '@/hooks/useImpressionTracking';
import BannerImage from './BannerImage';

interface BannerCardProps {
  banner: Banner;
  onPress: (banner: Banner) => void;
  onVisible?: (bannerId: string) => void; // Optional callback for external tracking
  priority?: 'low' | 'normal' | 'high'; // Image loading priority for lazy loading
}

const BannerCard: React.FC<BannerCardProps> = ({
  banner,
  onPress,
  onVisible,
  priority = 'normal',
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  
  // Use platform-specific impression tracking
  const nativeTracking = useImpressionTracking({
    bannerId: banner.id,
    threshold: 0.5, // 50% visibility required
    minDuration: 1000, // 1 second minimum
  });

  const webTracking = useWebImpressionTracking({
    bannerId: banner.id,
    threshold: 0.5,
    minDuration: 1000,
  });

  // Call external onVisible callback if provided (for backward compatibility)
  useEffect(() => {
    if (onVisible && (nativeTracking.tracked || webTracking.tracked)) {
      onVisible(banner.id);
    }
  }, [nativeTracking.tracked, webTracking.tracked, banner.id, onVisible]);

  // For native platforms, trigger visibility when component mounts (in carousel context)
  useEffect(() => {
    if (Platform.OS !== 'web') {
      // In a carousel, assume banner is visible when rendered
      // The carousel will handle scroll-based visibility tracking
      const timer = setTimeout(() => {
        nativeTracking.handleVisible();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [nativeTracking]);

  const handlePress = () => {
    onPress(banner);
  };

  // Use web ref for Intersection Observer
  const containerRef = Platform.OS === 'web' ? webTracking.elementRef : null;

  return (
    <TouchableOpacity
      ref={containerRef as any}
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={banner.title || 'Banner'}
    >
      <BannerImage
        uri={banner.image_url}
        style={styles.image}
        resizeMode="cover"
        priority={priority}
        bannerId={banner.id}
        onLoadStart={() => setImageLoading(true)}
        onLoadEnd={() => setImageLoading(false)}
        onError={() => setImageLoading(false)}
      />
      
      {(banner.title || banner.subtitle) && (
        <View style={styles.overlay}>
          {banner.title && (
            <Text style={styles.title} numberOfLines={2}>
              {banner.title}
            </Text>
          )}
          {banner.subtitle && (
            <Text style={styles.subtitle} numberOfLines={2}>
              {banner.subtitle}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 320,
    height: 160,
    borderRadius: 16,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: Colors.background.secondary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.inverse,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.inverse,
    opacity: 0.9,
  },
});

export default BannerCard;

