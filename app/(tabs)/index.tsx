import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Mic, Minus, Plus } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts } from '@/contexts/ProductContext';
import { useBanners } from '@/hooks/useBanners';
import { useAddresses } from '@/contexts/AddressContext';
import { APP_CONFIG } from '@/constants/config';
import type { Product } from '@/types';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import TopNav from '@/components/TopNav';
import BannerSection from '@/components/BannerSection';

export default function HomeScreen() {
  const router = useRouter();
  const { user, cart, addToCart, updateCartItem } = useAuth();
  const { categories, products, isLoadingCategories, isLoadingProducts, searchProducts } = useProducts();
  const { getDefaultAddress } = useAddresses();
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

  const handleAddToCart = (product: any) => {
    addToCart({ product, quantity: 1 });
  };

  // Handle banner press - BannerCarousel will handle click tracking and deep links
  const handleBannerPress = (banner: any) => {
    // BannerCarousel already handles deep link navigation and click tracking
    // This is just for backward compatibility if needed
    console.log('[HomeScreen] Banner pressed:', banner.id);
  };

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
        cat.subcategories.some(sub => sub.toLowerCase().includes(query.toLowerCase()))
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

  const getAddressDisplayText = () => {
    if (!defaultAddress) {
      return 'Add Address';
    }
    
    const addressType = defaultAddress.type === 'other' && defaultAddress.otherLabel 
      ? defaultAddress.otherLabel 
      : defaultAddress.type.charAt(0).toUpperCase() + defaultAddress.type.slice(1);
    
    const area = defaultAddress.area || defaultAddress.city;
    return `${addressType} - ${area}`;
  };

  return (
    <ResponsiveContainer>
      <View style={styles.container}>
        <TopNav 
          showBackButton={false} 
          showAddress={true}
          addressLabel="Deliver to"
          addressValue={getAddressDisplayText()}
          onAddressPress={() => router.push('/addresses' as any)}
        />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for products, categories..."
              placeholderTextColor={Colors.text.tertiary}
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
              onSubmitEditing={() => handleSearch(searchQuery)}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={clearSearch}>
                <Text style={styles.clearButton}>✕</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity>
                <Mic size={20} color={Colors.text.tertiary} />
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
                        <Text style={styles.productUnit}>{product.unit}</Text>
                        <Text style={styles.productCategory}>{product.category}</Text>
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

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Shop by Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.categoryCard}
                    onPress={() => router.push(`/category/${category.id}` as any)}
                  >
                    <Image source={{ uri: category.image }} style={styles.categoryImage} />
                    <Text style={styles.categoryName}>{category.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {APP_CONFIG.REFERRAL.ENABLED && (
              <TouchableOpacity
                style={styles.referralBanner}
                onPress={() => router.push('/referral' as any)}
              >
                <View style={styles.referralContent}>
                  <Text style={styles.referralTitle}>Refer & Earn</Text>
                  <Text style={styles.referralSubtitle}>
                    Get {APP_CONFIG.REFERRAL.COMMISSION_PERCENTAGE}% on every order
                  </Text>
                </View>
                <Text style={styles.referralArrow}>→</Text>
              </TouchableOpacity>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recommended for You</Text>
              <View style={styles.productsGrid}>
                {products.slice(0, 10).map((product) => {
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
                        <Text style={styles.productUnit}>{product.unit}</Text>
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
            </View>
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
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  clearButton: {
    fontSize: 18,
    color: Colors.text.tertiary,
    fontWeight: '600' as const,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoriesScroll: {
    paddingLeft: 16,
  },
  categoryCard: {
    width: 100,
    marginRight: 12,
    alignItems: 'center',
  },
  categoryImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    textAlign: 'center',
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
    backgroundColor: Colors.background.secondary,
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
});
