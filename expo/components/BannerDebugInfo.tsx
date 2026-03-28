/**
 * Banner Debug Info Component
 * 
 * Temporary component to help debug banner issues
 * Remove this after fixing the issue
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useBanners } from '@/hooks/useBanners';
import Colors from '@/constants/colors';

export const BannerDebugInfo: React.FC = () => {
  const { banners, loading, error } = useBanners({});

  if (!__DEV__) {
    return null; // Only show in development
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Banner Debug Info</Text>
      <ScrollView style={styles.scroll}>
        <View style={styles.section}>
          <Text style={styles.label}>Loading:</Text>
          <Text style={styles.value}>{loading ? 'Yes' : 'No'}</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.label}>Error:</Text>
          <Text style={styles.value}>{error ? error.message : 'None'}</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.label}>Banner Count:</Text>
          <Text style={styles.value}>{banners.length}</Text>
        </View>
        
        {banners.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Banners:</Text>
            {banners.map((banner, index) => (
              <View key={banner.id} style={styles.bannerItem}>
                <Text style={styles.bannerText}>
                  {index + 1}. {banner.title || 'No title'} (ID: {banner.id})
                </Text>
                <Text style={styles.bannerSubtext}>
                  Image: {banner.image_url?.substring(0, 50)}...
                </Text>
              </View>
            ))}
          </View>
        )}
        
        {banners.length === 0 && !loading && !error && (
          <View style={styles.section}>
            <Text style={styles.warning}>
              ⚠️ No banners found. Check:
            </Text>
            <Text style={styles.warningText}>
              1. Database has active banners{'\n'}
              2. Banner date ranges are valid{'\n'}
              3. Targeting rules match user context{'\n'}
              4. Check network tab for API response
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.secondary,
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    maxHeight: 300,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  scroll: {
    maxHeight: 250,
  },
  section: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  bannerItem: {
    backgroundColor: Colors.background.primary,
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  bannerText: {
    fontSize: 12,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  bannerSubtext: {
    fontSize: 10,
    color: Colors.text.tertiary,
    marginTop: 4,
  },
  warning: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.status.warning || '#FF9800',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 11,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
});

