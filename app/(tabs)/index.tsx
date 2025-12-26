import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useState, useMemo, useCallback, memo } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Minus, Plus, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts } from '@/contexts/ProductContext';
import { useBanners } from '@/hooks/useBanners';
import { useAddresses } from '@/contexts/AddressContext';
import { useVendorAssignment } from '@/contexts/VendorAssignmentContext';
import { APP_CONFIG } from '@/constants/config';
import type { Product } from '@/types';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import TopNav from '@/components/TopNav';
import BannerSection from '@/components/BannerSection';
import { NoVendorAvailable } from '@/components/NoVendorAvailable';
import ProductGridCarousel from '@/components/ProductGridCarousel';

export default function HomeScreen() {
  const router = useRouter();
  const { user, cart, addToCart, updateCartItem } = useAuth();
  const { categories, products, isLoadingCategories, isLoadingProducts, searchProducts } = useProducts();
  const { getDefaultAddress } = useAddresses();
  const { mode, hasEligibleVendor, isLoading: isLoadingVendor } = useVendorAssignment();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  
  const defaultAddress = getDefaultAddress();
  
  // Get user location from default address if available
  const userLocation = defaultAddress?.lat && defaultAddress?.lng 
    ? { lat: defaultAddress.lat, lng: defaultAddress.lng }
    : undefined;
  
  // Get city from address or user
  const userCity = defaultAddress?.city || undefined;
  
  // Use new banner hook with location and city
  const { banners, loading: isLoadingBanners, error: bannersError } = useBanners({
    userLocation,
    city: userCity,
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleAddToCart = useCallback((product: any) => {
    addToCart({ product, quantity: 1 });
  }, [addToCart]);

  // Get products by category - memoized to avoid re-filtering on every render
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    products.forEach(product => {
      if (!grouped[product.category]) {
        grouped[product.category] = [];
      }
      grouped[product.category].push(product);
    });
    return grouped;
  }, [products]);

  // Pre-calculate responsive widths - memoized to avoid recalculating on every render
  const layoutDimensions = useMemo(() => {
    const effectiveWidth = Math.min(screenWidth, 1200);
    const isMobile = screenWidth <= 768;
    
    // Category card dimensions
    const categoryMaxCardWidth = 140;
    const categoryGridPadding = isMobile ? 32 : 64;
    const categoryGap = 12;
    const categoryNumColumns = isMobile ? 3 : 6;
    const categoryCardWidth = isMobile
      ? (screenWidth - categoryGridPadding - (categoryNumColumns - 1) * categoryGap) / categoryNumColumns
      : Math.min(categoryMaxCardWidth, (effectiveWidth - categoryGridPadding - (categoryNumColumns - 1) * categoryGap) / categoryNumColumns);
    
    // Subcategory card dimensions
    const subcategoryMaxCardWidth = 100;
    let subcategoryNumColumns, subcategoryCardWidth;
    if (screenWidth > 768) {
      subcategoryNumColumns = 8;
      subcategoryCardWidth = Math.min(subcategoryMaxCardWidth, (effectiveWidth - 64) / subcategoryNumColumns);
    } else if (screenWidth > 600) {
      subcategoryNumColumns = 5;
      subcategoryCardWidth = (screenWidth - 48 - (subcategoryNumColumns - 1) * 8) / subcategoryNumColumns;
    } else if (screenWidth > 400) {
      subcategoryNumColumns = 4;
      subcategoryCardWidth = (screenWidth - 48 - (subcategoryNumColumns - 1) * 8) / subcategoryNumColumns;
    } else {
      subcategoryNumColumns = 3;
      subcategoryCardWidth = (screenWidth - 48 - (subcategoryNumColumns - 1) * 8) / subcategoryNumColumns;
    }
    
    // Calculate product card width for 2-row grid (10 products per row)
    // Formula: (screenWidth - padding - gaps) / productsPerRow
    const horizontalPadding = 32; // 16 on each side
    const productsPerRow = 10;
    const gap = 12;
    const totalGaps = (productsPerRow - 1) * gap;
    const baseCardWidth = (screenWidth - horizontalPadding - totalGaps) / productsPerRow;
    
    // Apply different multipliers for mobile vs desktop
    // Desktop: 40% increase, Mobile: 25% increase
    const widthMultiplier = isMobile ? 1.25 : 1.4;
    const horizontalProductCardWidth = baseCardWidth * widthMultiplier;
    
    // Different max widths for mobile vs desktop
    const maxCardWidth = isMobile ? 200 : 252; // Mobile: ~160 * 1.25, Desktop: 180 * 1.4
    
    return {
      categoryCardWidth,
      subcategoryCardWidth,
      horizontalProductCardWidth: Math.max(120, Math.min(maxCardWidth, horizontalProductCardWidth)),
    };
  }, [screenWidth]);

  // Render product card for horizontal carousel
  const renderProductCard = useCallback((product: Product, cardWidth: number) => {
    const cartItem = cart.find((item) => item.product.id === product.id);
    const qty = cartItem?.quantity || 0;

    return (
      <TouchableOpacity
        key={product.id}
        style={[styles.horizontalProductCard, { width: cardWidth }]}
        onPress={() => router.push(`/product/${product.id}` as any)}
      >
        <Image 
          source={{ uri: product.image }} 
          style={styles.horizontalProductImage}
          resizeMode="contain"
        />
        <View style={styles.horizontalProductInfo}>
          <View style={styles.horizontalProductTop}>
            <Text style={styles.horizontalProductName} numberOfLines={2}>{product.name}</Text>
            {product.unit && product.unit.trim() && <Text style={styles.horizontalProductUnit}>{product.unit}</Text>}
            <View style={styles.horizontalProductPricing}>
              <View style={styles.horizontalPriceRow}>
                <Text style={styles.horizontalProductPrice}>₹{product.price.toFixed(2)}</Text>
                {product.discount > 0 && (
                  <Text style={styles.horizontalProductMrp}>₹{product.mrp.toFixed(2)}</Text>
                )}
              </View>
              {product.discount > 0 && (
                <Text style={styles.horizontalProductDiscount}>{product.discount}% OFF</Text>
              )}
            </View>
          </View>
          <View style={styles.horizontalProductBottom}>
            {qty === 0 ? (
              <TouchableOpacity
                style={styles.horizontalAddButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleAddToCart(product);
                }}
              >
                <Text style={styles.horizontalAddButtonText}>Add</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.horizontalQtyStepper}>
                <TouchableOpacity
                  style={styles.horizontalQtyButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    updateCartItem(product.id, qty - 1);
                  }}
                >
                  <Minus size={12} color={Colors.text.inverse} />
                </TouchableOpacity>
                <Text style={styles.horizontalQtyText}>{qty}</Text>
                <TouchableOpacity
                  style={styles.horizontalQtyButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    updateCartItem(product.id, qty + 1);
                  }}
                >
                  <Plus size={12} color={Colors.text.inverse} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [cart, router, updateCartItem, handleAddToCart]);

  // Handle banner press - BannerCarousel will handle click tracking and deep links
  const handleBannerPress = useCallback((banner: any) => {
    // BannerCarousel already handles deep link navigation and click tracking
    // This is just for backward compatibility if needed
    console.log('[HomeScreen] Banner pressed:', banner.id);
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length === 0) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    if (query.trim().length < 2) {
      return; // Don't search for very short queries
    }
    
    setIsSearching(true);
    try {
      // Search products
      const productResults = await searchProducts(query);
      
      // Search categories and subcategories
      const categoryResults = categories.filter(cat => 
        cat.name.toLowerCase().includes(query.toLowerCase()) ||
        cat.subcategories.some(sub => sub.name.toLowerCase().includes(query.toLowerCase()))
      );
      
      // Get products from matching categories
      const categoryProductResults: Product[] = [];
      for (const category of categoryResults) {
        const categoryProducts = products.filter(p => p.category === category.name);
        categoryProductResults.push(...categoryProducts);
      }
      
      // Combine and deduplicate results
      const allResults = [...productResults, ...categoryProductResults];
      const uniqueResults = allResults.filter((product, index, self) => 
        index === self.findIndex(p => p.id === product.id)
      );
      
      setSearchResults(uniqueResults);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const addressDisplayText = useMemo(() => {
    if (!defaultAddress) {
      return 'Add Address';
    }
    
    const addressType = defaultAddress.type === 'other' && defaultAddress.otherLabel 
      ? defaultAddress.otherLabel 
      : defaultAddress.type.charAt(0).toUpperCase() + defaultAddress.type.slice(1);
    
    const area = defaultAddress.area || defaultAddress.city;
    return `${addressType} - ${area}`;
  }, [defaultAddress]);

  // Show "No Vendor Available" message in single mode when no eligible vendor
  if (mode === 'single' && !hasEligibleVendor && !isLoadingVendor) {
    return (
      <ResponsiveContainer>
        <NoVendorAvailable />
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer>
      <View style={styles.container}>
        <TopNav
          showBackButton={false}
          showAddress={true}
          addressLabel="Deliver to"
          addressValue={addressDisplayText}
          onAddressPress={() => router.push('/addresses' as any)}
        />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={21}
      >
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.text.inverse} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for products, categories..."
              placeholderTextColor={Colors.text.inverse}
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
              onSubmitEditing={() => handleSearch(searchQuery)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch}>
                <Text style={styles.clearButton}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

{showSearchResults ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isSearching ? 'Searching...' : `Search Results (${searchResults.length})`}
            </Text>
            {searchResults.length > 0 ? (
              <View style={styles.productsGrid}>
                {searchResults.map((product) => {
                  const cartItem = cart.find((item) => item.product.id === product.id);
                  const qty = cartItem?.quantity || 0;

                  return (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.productCard}
                      onPress={() => router.push(`/product/${product.id}` as any)}
                    >
                      <Image 
                        source={{ uri: product.image }} 
                        style={[styles.productImage, { 
                          height: Math.max(120, Math.min(200, ((screenWidth - 16) * 0.48) * 0.85))
                        }]} 
                        resizeMode="contain"
                      />
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                        {product.unit && product.unit.trim() && <Text style={styles.productUnit}>{product.unit}</Text>}
                        {product.category && product.category.trim() && <Text style={styles.productCategory}>{product.category}</Text>}
                        <View style={styles.productPricing}>
                          <Text style={styles.productPrice}>₹{product.price.toFixed(2)}</Text>
                          {product.discount > 0 && (
                            <>
                              <Text style={styles.productMrp}>₹{product.mrp.toFixed(2)}</Text>
                              <Text style={styles.productDiscount}>{product.discount}% OFF</Text>
                            </>
                          )}
                        </View>
                        {qty === 0 ? (
                          <TouchableOpacity
                            style={styles.addButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleAddToCart(product);
                            }}
                          >
                            <Text style={styles.addButtonText}>Add to cart</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.qtyStepper}>
                            <TouchableOpacity
                              style={styles.qtyButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                updateCartItem(product.id, qty - 1);
                              }}
                            >
                              <Minus size={14} color={Colors.text.inverse} />
                            </TouchableOpacity>
                            <Text style={styles.qtyText}>{qty}</Text>
                            <TouchableOpacity
                              style={styles.qtyButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                updateCartItem(product.id, qty + 1);
                              }}
                            >
                              <Plus size={14} color={Colors.text.inverse} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : !isSearching ? (
              <Text style={styles.noResults}>No products found for "{searchQuery}"</Text>
            ) : null}
          </View>
        ) : (
          <>
            {/* Banner Section with silent error handling */}
            <BannerSection
              banners={banners}
              loading={isLoadingBanners}
              error={bannersError}
              onBannerPress={handleBannerPress}
              autoPlay={true}
              autoPlayInterval={5000}
            />

            {/* Shop by Category Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Shop by Category</Text>
              <View style={styles.categoriesGrid}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.categoryCard, { width: layoutDimensions.categoryCardWidth }]}
                    onPress={() => router.push(`/category/${category.id}` as any)}
                  >
                    <View style={styles.categoryImageContainer}>
                      <Image 
                        source={{ uri: category.image }} 
                        style={styles.categoryImage}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={styles.categoryName} numberOfLines={2}>{category.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Shop by Subcategory Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Shop by Subcategory</Text>
              <View style={styles.subcategoriesGrid}>
                {categories.flatMap((category) =>
                  category.subcategories.map((subcategory) => (
                    <TouchableOpacity
                      key={subcategory.id}
                      style={[styles.subcategoryCard, { width: layoutDimensions.subcategoryCardWidth }]}
                      onPress={() => router.push(`/subcategory/${category.id}/${encodeURIComponent(subcategory.name)}` as any)}
                    >
                      <View style={styles.subcategoryImageContainer}>
                        <Image 
                          source={{ uri: subcategory.image }} 
                          style={styles.subcategoryImage}
                          resizeMode="contain"
                        />
                      </View>
                      <Text style={styles.subcategoryName} numberOfLines={2}>{subcategory.name}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>

            {APP_CONFIG.REFERRAL.ENABLED && (
              <TouchableOpacity
                style={styles.referralBanner}
                onPress={() => router.push('/referral' as any)}
              >
                <View style={styles.referralContent}>
                  <Text style={styles.referralTitle}>Refer & Earn</Text>
                  <Text style={styles.referralSubtitle}>
                    Earn 10% real cash on every referral order.*
                  </Text>
                </View>
                <Text style={styles.referralArrow}>→</Text>
              </TouchableOpacity>
            )}

            {/* Category-based product sections */}
            {categories.map((category) => {
              const categoryProducts = productsByCategory[category.name] || [];
              if (categoryProducts.length === 0) return null;
              
              return (
                <View key={category.id} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{category.name}</Text>
                    <TouchableOpacity
                      style={styles.seeAllButton}
                      onPress={() => router.push(`/category/${category.id}` as any)}
                    >
                      <Text style={styles.seeAllText}>See All</Text>
                      <ChevronRight size={16} color={Colors.brand.primary} />
                    </TouchableOpacity>
                  </View>
                  <ProductGridCarousel
                    products={categoryProducts}
                    renderProductCard={renderProductCard}
                    cardWidth={layoutDimensions.horizontalProductCardWidth}
                    productsPerRow={10}
                    initialProductsCount={20}
                    loadMoreChunkSize={20}
                  />
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brand.accentYellow,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.inverse,
  },
  clearButton: {
    fontSize: 18,
    color: Colors.text.inverse,
    fontWeight: '600' as const,
  },
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.brand.primary,
  },
  horizontalScroll: {
    paddingLeft: 16,
  },
  horizontalScrollContent: {
    paddingRight: 16,
    gap: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    justifyContent: 'flex-start',
  },
  categoryCard: {
    marginBottom: 12,
    alignItems: 'center',
  },
  categoryImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginBottom: 8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 4,
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
  subcategoryImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginBottom: 6,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subcategoryImage: {
    width: '100%',
    height: '100%',
  },
  subcategoryName: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 12,
    paddingHorizontal: 2,
  },
  referralBanner: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: Colors.brand.primaryLight,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  referralContent: {
    flex: 1,
  },
  referralTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.inverse,
  },
  referralSubtitle: {
    fontSize: 14,
    color: Colors.text.inverse,
    marginTop: 4,
  },
  referralArrow: {
    fontSize: 32,
    color: Colors.text.inverse,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  productCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 16,
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    backgroundColor: Colors.background.primary,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  productUnit: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginBottom: 8,
  },
  productCategory: {
    fontSize: 11,
    color: Colors.brand.primary,
    marginBottom: 4,
    fontWeight: '500' as const,
  },
  noResults: {
    textAlign: 'center',
    fontSize: 16,
    color: Colors.text.tertiary,
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  productPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  productMrp: {
    fontSize: 12,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  productDiscount: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.status.success,
  },
  addButton: {
    borderWidth: 1,
    borderColor: Colors.brand.primary,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.brand.primary,
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.brand.primary,
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  qtyButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text.inverse,
    flex: 1,
    textAlign: 'center',
  },
  horizontalProductCard: {
    marginRight: 12,
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  horizontalProductImage: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.background.primary,
  },
  horizontalProductInfo: {
    padding: 10,
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 120,
  },
  horizontalProductTop: {
    flex: 1,
  },
  horizontalProductBottom: {
    marginTop: 'auto',
  },
  horizontalProductName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
    minHeight: 32,
  },
  horizontalProductUnit: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginBottom: 6,
  },
  horizontalProductPricing: {
    marginBottom: 8,
  },
  horizontalPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  horizontalProductPrice: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  horizontalProductMrp: {
    fontSize: 11,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  horizontalProductDiscount: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: Colors.status.success,
  },
  horizontalAddButton: {
    borderWidth: 1,
    borderColor: Colors.brand.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  horizontalAddButtonText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.brand.primary,
  },
  horizontalQtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.brand.primary,
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  horizontalQtyButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalQtyText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text.inverse,
    paddingHorizontal: 8,
  },
});
