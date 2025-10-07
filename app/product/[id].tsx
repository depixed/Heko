import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ChevronLeft, Truck, Package, MessageCircle, ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react-native';
import { useState, useRef, useEffect } from 'react';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { MOCK_PRODUCTS } from '@/mocks/data';
import type { Product } from '@/types';

const FEATURE_ICON_COLOR = '#8A4B36';
const FEATURE_BG_COLOR = '#EEE0C2';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cart, addToCart, updateCartItem, cartTotal } = useAuth();

  const product = MOCK_PRODUCTS.find((p) => p.id === id);
  const similarProducts = MOCK_PRODUCTS.filter(
    (p) => p.category === product?.category && p.id !== id
  ).slice(0, 5);

  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const descriptionHeight = useRef(new Animated.Value(0)).current;

  const cartItem = cart.find((item) => item.product.id === id);
  const quantity = cartItem?.quantity || 0;

  useEffect(() => {
    Animated.timing(descriptionHeight, {
      toValue: descriptionExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [descriptionExpanded, descriptionHeight]);

  if (!product) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Product Details',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ChevronLeft size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Product not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleAddToCart = () => {
    addToCart({ product, quantity: 1 });
  };

  const handleQuantityChange = (newQty: number) => {
    if (newQty === 0) {
      updateCartItem(product.id, 0);
    } else {
      updateCartItem(product.id, newQty);
    }
  };

  const handleSimilarProductAdd = (similarProduct: Product) => {
    addToCart({ product: similarProduct, quantity: 1 });
  };

  const maxDescriptionHeight = descriptionHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 500],
  });

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Product Details',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.heroContainer}>
          <Image source={{ uri: product.image }} style={styles.heroImage} resizeMode="contain" />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {product.name}
          </Text>

          <View style={styles.pricingRow}>
            <Text style={styles.finalPrice}>₹{product.price}</Text>
            {product.discount > 0 && (
              <>
                <Text style={styles.mrpStrike}>₹{product.mrp}</Text>
                <Text style={styles.discountBadge}>{product.discount}% OFF</Text>
              </>
            )}
          </View>
          {product.unit && <Text style={styles.unitSuffix}>/{product.unit}</Text>}

          {!product.inStock && (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>Out of stock</Text>
            </View>
          )}

          <View style={styles.featurePillsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featurePillsScroll}>
              <View style={styles.featurePill}>
                <View style={[styles.featureIconCircle, { backgroundColor: FEATURE_BG_COLOR }]}>
                  <Truck size={20} color={FEATURE_ICON_COLOR} />
                </View>
                <Text style={styles.featurePillLabel}>Fast Delivery</Text>
              </View>

              <View style={styles.featurePill}>
                <View style={[styles.featureIconCircle, { backgroundColor: FEATURE_BG_COLOR }]}>
                  <Package size={20} color={FEATURE_ICON_COLOR} />
                </View>
                <Text style={styles.featurePillLabel}>No Return/Exchange</Text>
              </View>

              <View style={styles.featurePill}>
                <View style={[styles.featureIconCircle, { backgroundColor: FEATURE_BG_COLOR }]}>
                  <MessageCircle size={20} color={FEATURE_ICON_COLOR} />
                </View>
                <Text style={styles.featurePillLabel}>24/7 Support</Text>
              </View>
            </ScrollView>
          </View>

          <View style={styles.descriptionSection}>
            <TouchableOpacity
              style={styles.descriptionHeader}
              onPress={() => setDescriptionExpanded(!descriptionExpanded)}
            >
              <Text style={styles.descriptionHeaderText}>Product Description</Text>
              {descriptionExpanded ? (
                <ChevronUp size={20} color={Colors.text.secondary} />
              ) : (
                <ChevronDown size={20} color={Colors.text.secondary} />
              )}
            </TouchableOpacity>

            <Animated.View style={[styles.descriptionContent, { maxHeight: maxDescriptionHeight, overflow: 'hidden' }]}>
              <Text style={styles.descriptionText} numberOfLines={descriptionExpanded ? undefined : 0}>
                {product.description}
              </Text>
              {product.ingredients && (
                <View style={styles.descriptionDetail}>
                  <Text style={styles.descriptionDetailLabel}>Ingredients:</Text>
                  <Text style={styles.descriptionDetailText}>{product.ingredients}</Text>
                </View>
              )}
              {product.nutrition && (
                <View style={styles.descriptionDetail}>
                  <Text style={styles.descriptionDetailLabel}>Nutrition:</Text>
                  <Text style={styles.descriptionDetailText}>{product.nutrition}</Text>
                </View>
              )}
            </Animated.View>
          </View>

          {similarProducts.length > 0 && (
            <View style={styles.similarSection}>
              <View style={styles.similarHeader}>
                <Text style={styles.similarTitle}>Similar Products</Text>
                <TouchableOpacity onPress={() => router.push('/categories' as any)}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.similarScroll}>
                {similarProducts.map((item) => {
                  const similarCartItem = cart.find((ci) => ci.product.id === item.id);
                  const similarQty = similarCartItem?.quantity || 0;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.similarCard}
                      onPress={() => router.push(`/product/${item.id}` as any)}
                    >
                      <Image source={{ uri: item.image }} style={styles.similarImage} />
                      <Text style={styles.similarName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <View style={styles.similarPricing}>
                        <Text style={styles.similarPrice}>₹{item.price}</Text>
                        {item.discount > 0 && <Text style={styles.similarMrp}>₹{item.mrp}</Text>}
                      </View>
                      {item.unit && <Text style={styles.similarUnit}>{item.unit}</Text>}
                      {similarQty === 0 ? (
                        <TouchableOpacity
                          style={styles.similarAddButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleSimilarProductAdd(item);
                          }}
                        >
                          <Text style={styles.similarAddButtonText}>Add to cart</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.similarQtyStepper}>
                          <TouchableOpacity
                            style={styles.similarQtyButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              updateCartItem(item.id, similarQty - 1);
                            }}
                          >
                            <Minus size={14} color={Colors.text.inverse} />
                          </TouchableOpacity>
                          <Text style={styles.similarQtyText}>{similarQty}</Text>
                          <TouchableOpacity
                            style={styles.similarQtyButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              updateCartItem(item.id, similarQty + 1);
                            }}
                          >
                            <Plus size={14} color={Colors.text.inverse} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      <View style={styles.bottomActionArea}>
        {quantity === 0 ? (
          <TouchableOpacity
            style={[styles.addToCartButton, !product.inStock && styles.addToCartButtonDisabled]}
            onPress={handleAddToCart}
            disabled={!product.inStock}
          >
            <Text style={styles.addToCartButtonText}>
              {product.inStock ? 'Add to cart' : 'Out of stock'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.bottomActionRow}>
            <View style={styles.qtyStepper}>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => handleQuantityChange(quantity - 1)}
              >
                <Minus size={20} color={Colors.brand.primary} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => handleQuantityChange(quantity + 1)}
              >
                <Plus size={20} color={Colors.brand.primary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.viewCartButton}
              onPress={() => router.push('/cart' as any)}
            >
              <Text style={styles.viewCartButtonText}>View cart ₹{cartTotal.toFixed(0)}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  scrollView: {
    flex: 1,
  },
  heroContainer: {
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
  },
  heroImage: {
    width: 280,
    height: 280,
  },
  contentContainer: {
    padding: 16,
  },
  productTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 12,
    lineHeight: 28,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  finalPrice: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.brand.primary,
  },
  mrpStrike: {
    fontSize: 18,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.status.success,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  unitSuffix: {
    fontSize: 14,
    color: Colors.text.tertiary,
    marginBottom: 16,
  },
  outOfStockBadge: {
    borderWidth: 1,
    borderColor: Colors.brand.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  outOfStockText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.brand.primary,
  },
  featurePillsContainer: {
    marginVertical: 24,
  },
  featurePillsScroll: {
    gap: 24,
    paddingHorizontal: 4,
  },
  featurePill: {
    alignItems: 'center',
    gap: 8,
    width: 100,
  },
  featureIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featurePillLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  descriptionSection: {
    marginTop: 8,
    marginBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingTop: 16,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  descriptionHeaderText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  descriptionContent: {
    paddingTop: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  descriptionDetail: {
    marginBottom: 12,
  },
  descriptionDetailLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  descriptionDetailText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.text.secondary,
  },
  similarSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingTop: 16,
  },
  similarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  similarTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.brand.primary,
  },
  similarScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  similarCard: {
    width: 140,
    marginRight: 12,
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    padding: 12,
  },
  similarImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  similarName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 6,
    minHeight: 36,
  },
  similarPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  similarPrice: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.brand.primary,
  },
  similarMrp: {
    fontSize: 12,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  similarUnit: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginBottom: 8,
  },
  similarAddButton: {
    borderWidth: 1,
    borderColor: Colors.brand.primary,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  similarAddButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.brand.primary,
  },
  similarQtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.brand.primary,
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  similarQtyButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  similarQtyText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text.inverse,
    flex: 1,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 100,
  },
  bottomActionArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
      },
    }),
  },
  addToCartButton: {
    backgroundColor: Colors.brand.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartButtonDisabled: {
    backgroundColor: Colors.border.medium,
  },
  addToCartButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.inverse,
  },
  bottomActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 16,
  },
  qtyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    minWidth: 24,
    textAlign: 'center',
  },
  viewCartButton: {
    flex: 1,
    backgroundColor: Colors.brand.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewCartButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.inverse,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.brand.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.inverse,
  },
});
