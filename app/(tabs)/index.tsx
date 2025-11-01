import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Bell, Search, Mic, ShoppingCart, Minus, Plus } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useProducts } from '@/contexts/ProductContext';
import { useBanners } from '@/contexts/BannerContext';
import { useAddresses } from '@/contexts/AddressContext';
import { APP_CONFIG } from '@/constants/config';
import type { Product } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const { wallet, cartItemCount, cart, addToCart, updateCartItem } = useAuth();
  const { unreadCount } = useNotifications();
  const { categories, products, isLoadingCategories, isLoadingProducts, searchProducts } = useProducts();
  const { banners, isLoading: isLoadingBanners } = useBanners();
  const { getDefaultAddress } = useAddresses();
  const insets = useSafeAreaInsets();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const defaultAddress = getDefaultAddress();

  const handleAddToCart = (product: any) => {
    addToCart({ product, quantity: 1 });
  };

  const handleBannerPress = (banner: any) => {
    if (!banner.action) return;
    
    if (banner.action.startsWith('category:')) {
      const categoryId = banner.action.split(':')[1];
      router.push(`/category/${categoryId}` as any);
    } else if (banner.action === 'referral') {
      router.push('/referral' as any);
    } else if (banner.action === 'wallet') {
      router.push('/wallet' as any);
    } else if (banner.action.startsWith('product:')) {
      const productId = banner.action.split(':')[1];
      router.push(`/product/${productId}` as any);
    }
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
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.addressButton} onPress={() => router.push('/addresses' as any)}>
          <MapPin size={20} color={Colors.brand.primary} />
          <View style={styles.addressText}>
            <Text style={styles.addressLabel}>Deliver to</Text>
            <Text style={styles.addressValue}>{getAddressDisplayText()}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.walletBadge} onPress={() => router.push('/wallet' as any)}>
            <Text style={styles.walletText}>₹{(wallet.virtualBalance + wallet.actualBalance).toFixed(0)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => router.push('/notifications' as any)}
            testID="home-notifications-button"
          >
            <Bell size={24} color={Colors.text.primary} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cartButton} onPress={() => router.push('/cart' as any)}>
            <ShoppingCart size={24} color={Colors.text.primary} />
            {cartItemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                      <Image source={{ uri: product.image }} style={styles.productImage} />
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                        <Text style={styles.productUnit}>{product.unit}</Text>
                        <Text style={styles.productCategory}>{product.category}</Text>
                        <View style={styles.productPricing}>
                          <Text style={styles.productPrice}>₹{product.price}</Text>
                          {product.discount > 0 && (
                            <>
                              <Text style={styles.productMrp}>₹{product.mrp}</Text>
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
            {!isLoadingBanners && banners.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bannersContainer}>
                {banners.map((banner) => (
                  <TouchableOpacity
                    key={banner.id}
                    style={styles.banner}
                    onPress={() => handleBannerPress(banner)}
                  >
                    <Image source={{ uri: banner.image }} style={styles.bannerImage} />
                    <View style={styles.bannerOverlay}>
                      <Text style={styles.bannerTitle}>{banner.title}</Text>
                      {banner.subtitle && (
                        <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

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
                      <Image source={{ uri: product.image }} style={styles.productImage} />
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                        <Text style={styles.productUnit}>{product.unit}</Text>
                        <View style={styles.productPricing}>
                          <Text style={styles.productPrice}>₹{product.price}</Text>
                          {product.discount > 0 && (
                            <>
                              <Text style={styles.productMrp}>₹{product.mrp}</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  addressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  addressText: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  addressValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  walletBadge: {
    backgroundColor: Colors.wallet.virtual,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  walletText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.inverse,
  },
  bellButton: {
    position: 'relative' as const,
  },
  notificationBadge: {
    position: 'absolute' as const,
    top: -6,
    right: -6,
    backgroundColor: Colors.brand.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.text.inverse,
  },
  cartButton: {
    position: 'relative' as const,
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.status.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.text.inverse,
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
  bannersContainer: {
    paddingLeft: 16,
    marginBottom: 24,
  },
  banner: {
    width: 320,
    height: 160,
    borderRadius: 16,
    marginRight: 16,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.inverse,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: Colors.text.inverse,
    marginTop: 4,
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
    height: 140,
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
