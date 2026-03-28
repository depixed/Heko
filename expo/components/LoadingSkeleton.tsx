import React from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { useEffect, useRef } from 'react';
import Colors from '@/constants/colors';

const SkeletonPulse = ({ width, height, borderRadius = 12, style }: { 
  width: number | string; 
  height: number; 
  borderRadius?: number;
  style?: any;
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: Colors.border.light,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const CategorySkeleton = ({ cardWidth }: { cardWidth: number }) => (
  <View style={[styles.categoryCard, { width: cardWidth }]}>
    <SkeletonPulse width="100%" height={cardWidth} borderRadius={12} />
    <SkeletonPulse width="80%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
  </View>
);

export const SubcategorySkeleton = ({ cardWidth }: { cardWidth: number }) => (
  <View style={[styles.subcategoryCard, { width: cardWidth }]}>
    <SkeletonPulse width="100%" height={cardWidth} borderRadius={8} />
    <SkeletonPulse width="70%" height={10} borderRadius={5} style={{ marginTop: 6 }} />
  </View>
);

export const ProductCardSkeleton = ({ cardWidth }: { cardWidth: number }) => (
  <View style={[styles.productCard, { width: cardWidth }]}>
    <SkeletonPulse width="100%" height={140} borderRadius={0} />
    <View style={styles.productInfo}>
      <SkeletonPulse width="90%" height={13} borderRadius={6} />
      <SkeletonPulse width="60%" height={11} borderRadius={5} style={{ marginTop: 6 }} />
      <SkeletonPulse width="70%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
      <SkeletonPulse width="100%" height={32} borderRadius={16} style={{ marginTop: 8 }} />
    </View>
  </View>
);

export const CategoriesGridSkeleton = () => {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth <= 768;
  const categoryCardWidth = isMobile ? (screenWidth - 32 - 24) / 3 : 140;
  const count = isMobile ? 6 : 12;

  return (
    <View style={styles.section}>
      <SkeletonPulse width={180} height={24} borderRadius={8} style={{ marginLeft: 16, marginBottom: 16 }} />
      <View style={styles.categoriesGrid}>
        {Array.from({ length: count }).map((_, index) => (
          <CategorySkeleton key={index} cardWidth={categoryCardWidth} />
        ))}
      </View>
    </View>
  );
};

export const SubcategoriesGridSkeleton = () => {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth <= 768;
  let cardWidth;
  let count;
  
  if (screenWidth > 768) {
    cardWidth = 100;
    count = 16;
  } else if (screenWidth > 600) {
    cardWidth = (screenWidth - 48 - 32) / 5;
    count = 10;
  } else {
    cardWidth = (screenWidth - 48 - 24) / 4;
    count = 8;
  }

  return (
    <View style={styles.section}>
      <SkeletonPulse width={200} height={24} borderRadius={8} style={{ marginLeft: 16, marginBottom: 16 }} />
      <View style={styles.subcategoriesGrid}>
        {Array.from({ length: count }).map((_, index) => (
          <SubcategorySkeleton key={index} cardWidth={cardWidth} />
        ))}
      </View>
    </View>
  );
};

export const ProductsCarouselSkeleton = ({ cardWidth }: { cardWidth: number }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <SkeletonPulse width={150} height={24} borderRadius={8} />
      <SkeletonPulse width={70} height={20} borderRadius={6} />
    </View>
    <View style={styles.horizontalScroll}>
      {Array.from({ length: 5 }).map((_, index) => (
        <ProductCardSkeleton key={index} cardWidth={cardWidth} />
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryCard: {
    marginBottom: 12,
    alignItems: 'center',
  },
  subcategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  subcategoryCard: {
    marginBottom: 12,
    alignItems: 'center',
  },
  horizontalScroll: {
    flexDirection: 'row',
    paddingLeft: 16,
    gap: 12,
  },
  productCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    overflow: 'hidden',
  },
  productInfo: {
    padding: 10,
  },
});

