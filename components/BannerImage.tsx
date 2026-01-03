import React, { useState, useRef, useEffect } from 'react';
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
  // Start with loading false - image should be visible immediately
  // Loading state will be managed by onLoadStart/onLoadEnd events
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const loadStartTimeRef = useRef<number | null>(null);
  const imageRef = useRef<any>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef<boolean>(false); // Track if image has ever loaded

  // Convert WebP URLs if needed (expo-image handles this automatically)
  // Calculate optimal width based on screen size (2x for retina)
  const optimizedUri = optimizeImageUrl(uri, priority);

  // Fallback: Clear loading state after a timeout to prevent stuck loaders
  // Only set timeout if we actually started loading (loadStartTimeRef is set)
  useEffect(() => {
    if (loading && loadStartTimeRef.current && !hasLoadedRef.current) {
      // Clear any existing timeout
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      
      // Set a timeout to force clear loading state after 5 seconds
      // Only if we actually started loading and haven't loaded yet
      loadTimeoutRef.current = setTimeout(() => {
        if (loading && loadStartTimeRef.current && !hasLoadedRef.current) {
          // Only warn in dev mode to reduce console noise
          if (__DEV__) {
            console.warn('[BannerImage] Image load timeout, clearing loading state', { bannerId });
          }
          setLoading(false);
          loadStartTimeRef.current = null;
        }
      }, 5000);
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [loading, bannerId, optimizedUri]);

  const handleLoadStart = () => {
    // Only set loading if we haven't already loaded
    if (!hasLoadedRef.current) {
      loadStartTimeRef.current = Date.now();
      setLoading(true);
      setError(false);
      onLoadStart?.();
    }
  };

  const handleLoadEnd = () => {
    // Mark as loaded
    hasLoadedRef.current = true;
    
    // Clear timeout if image loads successfully
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    
    setLoading(false);
    
    // Log successful image load
    if (bannerId && loadStartTimeRef.current) {
      const loadTime = Date.now() - loadStartTimeRef.current;
      bannerMonitoring.logImageLoad(bannerId, true, loadTime);
      loadStartTimeRef.current = null;
    }
    
    onLoadEnd?.();
  };

  // Additional handler for web - onLoad event as backup
  const handleLoad = () => {
    // This is a backup for onLoadEnd which might not fire on web
    // Only call handleLoadEnd if we haven't already loaded
    if (!hasLoadedRef.current) {
      handleLoadEnd();
    }
  };

  const handleError = () => {
    // Clear timeout on error
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    
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
    // Web: Use standard Image with browser caching and eager loading for high priority
    return (
      <View style={[styles.container, style]}>
        {loading && (
          <View style={styles.placeholder}>
            <ActivityIndicator size="small" color={Colors.brand.primary} />
          </View>
        )}
        <RNImage
          ref={imageRef}
          source={{ uri: optimizedUri }}
          style={[styles.image, style, loading && styles.imageLoading]}
          resizeMode={resizeMode}
          onLoadStart={handleLoadStart}
          onLoad={handleLoad}
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
 * - Adjusts quality and width based on priority
 */
const optimizeImageUrl = (uri: string, priority: 'low' | 'normal' | 'high' = 'high'): string => {
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

  // If URL already has query params, check if it's already optimized
  if (uri.includes('format=webp') || uri.includes('quality=')) {
    return uri; // Already optimized
  }

  // If URL already has query params, append to them
  const separator = uri.includes('?') ? '&' : '?';
  
  // Calculate optimal width: 320px banner * 2 for retina = 640px
  // For low priority, use smaller width to reduce bandwidth
  const width = priority === 'low' ? 480 : 640;
  const quality = priority === 'low' ? 75 : 85; // Lower quality for low priority
  
  // Add optimization parameters (Supabase storage supports these)
  const optimizations = [
    'format=webp', // Prefer WebP format (smaller file size)
    `quality=${quality}`, // Adjust quality based on priority
    `width=${width}`, // Optimize for banner width (2x for retina)
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
    opacity: 0.3, // Show image with reduced opacity while loading instead of hiding it
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

