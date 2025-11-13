import React, { useState, useRef } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, Image as RNImage } from 'react-native';
import Colors from '@/constants/colors';
import { bannerMonitoring } from '@/utils/bannerMonitoring';

// Conditionally import expo-image only on native platforms
let ExpoImage: any = null;
if (Platform.OS !== 'web') {
  try {
    ExpoImage = require('expo-image').Image;
  } catch (error) {
    console.warn('[BannerImage] expo-image not available, using React Native Image');
  }
}

interface BannerImageProps {
  uri: string;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  priority?: 'low' | 'normal' | 'high';
  bannerId?: string; // Optional banner ID for monitoring
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: () => void;
}

/**
 * Optimized banner image component with:
 * - Progressive loading with placeholders
 * - Image caching (expo-image on native, browser cache on web)
 * - WebP format support
 * - Loading states
 */
const BannerImage: React.FC<BannerImageProps> = ({
  uri,
  style,
  resizeMode = 'cover',
  priority = 'high',
  bannerId,
  onLoadStart,
  onLoadEnd,
  onError,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const loadStartTimeRef = useRef<number | null>(null);

  // Convert WebP URLs if needed (expo-image handles this automatically)
  const optimizedUri = optimizeImageUrl(uri);

  const handleLoadStart = () => {
    loadStartTimeRef.current = Date.now();
    setLoading(true);
    setError(false);
    onLoadStart?.();
  };

  const handleLoadEnd = () => {
    setLoading(false);
    
    // Log successful image load
    if (bannerId && loadStartTimeRef.current) {
      const loadTime = Date.now() - loadStartTimeRef.current;
      bannerMonitoring.logImageLoad(bannerId, true, loadTime);
      loadStartTimeRef.current = null;
    }
    
    onLoadEnd?.();
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
    
    // Log failed image load
    if (bannerId && loadStartTimeRef.current) {
      const loadTime = Date.now() - loadStartTimeRef.current;
      bannerMonitoring.logImageLoad(bannerId, false, loadTime, 'Image load failed');
      loadStartTimeRef.current = null;
    }
    
    onError?.();
  };

  // Use expo-image on native for better caching, React Native Image on web
  if (Platform.OS === 'web' || !ExpoImage) {
    // Web: Use standard Image with browser caching
    return (
      <View style={[styles.container, style]}>
        {loading && (
          <View style={styles.placeholder}>
            <ActivityIndicator size="small" color={Colors.brand.primary} />
          </View>
        )}
        <RNImage
          source={{ uri: optimizedUri }}
          style={[styles.image, style, loading && styles.imageLoading]}
          resizeMode={resizeMode}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
        />
      </View>
    );
  }

  // Native: Use expo-image for advanced caching and performance
  return (
    <View style={[styles.container, style]}>
      {loading && (
        <View style={styles.placeholder}>
          <ActivityIndicator size="small" color={Colors.brand.primary} />
        </View>
      )}
      <ExpoImage
        source={{ uri: optimizedUri }}
        style={[styles.image, style, loading && styles.imageLoading]}
        contentFit={resizeMode}
        transition={200}
        priority={priority === 'high' ? 'high' : priority === 'low' ? 'low' : 'normal'}
        cachePolicy="memory-disk"
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }} // Light gray blurhash placeholder
      />
    </View>
  );
};

/**
 * Optimizes image URL for better performance
 * - Converts to WebP if supported (only for Supabase storage URLs)
 * - Adds query parameters for optimization
 */
const optimizeImageUrl = (uri: string): string => {
  if (!uri || typeof uri !== 'string') {
    return uri;
  }

  // Only optimize Supabase storage URLs or known CDN URLs
  // Don't modify external URLs that might not support these params
  const isSupabaseUrl = uri.includes('supabase.co/storage');
  const isKnownCDN = uri.includes('cloudinary.com') || uri.includes('imgix.net');
  
  if (!isSupabaseUrl && !isKnownCDN) {
    return uri; // Return as-is for other URLs
  }

  // If URL already has query params, append to them
  const separator = uri.includes('?') ? '&' : '?';
  
  // Add optimization parameters (Supabase storage supports these)
  const optimizations = [
    'format=webp', // Prefer WebP format
    'quality=85', // Good quality with smaller size
    'width=640', // Optimize for banner width (2x for retina)
  ];

  return `${uri}${separator}${optimizations.join('&')}`;
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageLoading: {
    opacity: 0,
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
  },
});

export default BannerImage;

