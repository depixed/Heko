import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import type { Product } from '@/types';

interface ProductGridCarouselProps {
  products: Product[];
  renderProductCard: (product: Product, cardWidth: number) => React.ReactNode;
  cardWidth: number;
  productsPerRow?: number;
  initialProductsCount?: number;
  loadMoreChunkSize?: number;
}

const PRODUCTS_PER_ROW = 10;
const INITIAL_PRODUCTS_COUNT = 20; // 2 rows x 10 products
const LOAD_MORE_CHUNK_SIZE = 20; // Load 20 more products at a time
const GAP = 12;

export default function ProductGridCarousel({
  products,
  renderProductCard,
  cardWidth,
  productsPerRow = PRODUCTS_PER_ROW,
  initialProductsCount = INITIAL_PRODUCTS_COUNT,
  loadMoreChunkSize = LOAD_MORE_CHUNK_SIZE,
}: ProductGridCarouselProps) {
  const [visibleProductsCount, setVisibleProductsCount] = useState(initialProductsCount);
  const scrollViewRef = useRef<ScrollView>(null);
  const isLoadingMoreRef = useRef(false);

  // Reset visible count when products change
  useEffect(() => {
    setVisibleProductsCount(initialProductsCount);
  }, [products.length, initialProductsCount]);

  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollX = contentOffset.x;
    const scrollableWidth = contentSize.width - layoutMeasurement.width;
    
    // Load more when user scrolls 70% of the way
    if (scrollableWidth > 0 && scrollX / scrollableWidth > 0.7) {
      if (!isLoadingMoreRef.current && visibleProductsCount < products.length) {
        isLoadingMoreRef.current = true;
        const nextCount = Math.min(
          products.length,
          visibleProductsCount + loadMoreChunkSize
        );
        setVisibleProductsCount(nextCount);
        // Reset loading flag after a short delay
        setTimeout(() => {
          isLoadingMoreRef.current = false;
        }, 100);
      }
    }
  }, [visibleProductsCount, products.length, loadMoreChunkSize]);

  // Get visible products
  const visibleProducts = products.slice(0, visibleProductsCount);
  
  // Group products into "pages" of 20 (2 rows x 10 products each)
  // Each page will be rendered as a 2-row grid that scrolls horizontally
  const pages: Array<{ row1: Product[]; row2: Product[] }> = [];
  
  for (let i = 0; i < visibleProducts.length; i += productsPerRow * 2) {
    const pageProducts = visibleProducts.slice(i, i + productsPerRow * 2);
    const row1 = pageProducts.slice(0, productsPerRow);
    const row2 = pageProducts.slice(productsPerRow, productsPerRow * 2);
    pages.push({ row1, row2 });
  }

  // Calculate total content width
  // Each page takes: productsPerRow * cardWidth + (productsPerRow - 1) * GAP
  const pageWidth = productsPerRow * cardWidth + (productsPerRow - 1) * GAP;
  const contentWidth = pages.length * pageWidth + (pages.length > 0 ? GAP * (pages.length - 1) : 0) + 32; // 32 for padding (16 on each side)

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={[styles.scrollContent, { width: contentWidth }]}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      removeClippedSubviews={true}
    >
      <View style={styles.container}>
        {pages.map((page, pageIndex) => (
          <View
            key={pageIndex}
            style={[
              styles.page,
              { width: pageWidth },
              pageIndex < pages.length - 1 && { marginRight: GAP }
            ]}
          >
            {/* Row 1 of this page */}
            <View style={styles.row}>
              {page.row1.map((product, index) => (
                <View
                  key={product.id}
                  style={[
                    styles.productWrapper,
                    { width: cardWidth },
                    index < page.row1.length - 1 && { marginRight: GAP }
                  ]}
                >
                  {renderProductCard(product, cardWidth)}
                </View>
              ))}
            </View>

            {/* Row 2 of this page */}
            <View style={[styles.row, styles.row2]}>
              {page.row2.map((product, index) => (
                <View
                  key={product.id}
                  style={[
                    styles.productWrapper,
                    { width: cardWidth },
                    index < page.row2.length - 1 && { marginRight: GAP }
                  ]}
                >
                  {renderProductCard(product, cardWidth)}
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    paddingLeft: 16,
  },
  scrollContent: {
    paddingRight: 16,
  },
  container: {
    flexDirection: 'row', // Pages are arranged horizontally
  },
  page: {
    flexDirection: 'column', // Each page has 2 rows
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  row2: {
    marginBottom: 0,
  },
  productWrapper: {
    // Product card styling is handled by the renderProductCard function
  },
});

