import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, ChevronDown, Home, Briefcase, MapPin, Trash2, Plus, Minus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useAddresses } from '@/contexts/AddressContext';
import { useProducts } from '@/contexts/ProductContext';
import type { Product } from '@/types';

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cart, updateCartItem, addToCart, isAuthenticated, isLoading } = useAuth();
  const { getDefaultAddress } = useAddresses();
  const { products } = useProducts();

  const handleCheckout = () => {
    // Wait for auth to finish loading before checking
    if (isLoading) {
      return;
    }
    
    if (!isAuthenticated) {
      // Directly redirect to auth page (better UX for web)
      if (Platform.OS === 'web') {
        router.replace('/auth');
      } else {
        // On mobile, show alert for better UX
        Alert.alert(
          'Login Required',
          'Please login to continue with checkout',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Login', onPress: () => router.push('/auth') }
          ]
        );
      }
      return;
    }
    router.push('/checkout' as any);
  };

  const defaultAddress = getDefaultAddress();

  const priceDetails = {
    itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    price: cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    itemDiscount: cart.reduce(
      (sum, item) => sum + (item.product.mrp - item.product.price) * item.quantity,
      0
    ),
    deliveryFee: 0,
  };

  const totalPayable = priceDetails.price + priceDetails.deliveryFee;
  const totalSavings = priceDetails.itemDiscount;

  const similarProducts = products.filter(
    (p) => !cart.some((item) => item.product.id === p.id)
  ).slice(0, 5);

  const handleQuantityChange = (productId: string, newQty: number) => {
    if (newQty === 0) {
      Alert.alert(
        'Remove Item',
        'Are you sure you want to remove this item from cart?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => updateCartItem(productId, 0),
          },
        ]
      );
    } else {
      updateCartItem(productId, newQty);
    }
  };

  const handleRemoveItem = (productId: string) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => updateCartItem(productId, 0),
        },
      ]
    );
  };

  const handleSimilarProductAdd = async (product: Product) => {
    await addToCart({ product, quantity: 1 });
  };

  const getAddressIcon = () => {
    if (!defaultAddress) return <Home size={16} color={Colors.brand.primary} />;
    switch (defaultAddress.type) {
      case 'home':
        return <Home size={16} color={Colors.brand.primary} />;
      case 'work':
        return <Briefcase size={16} color={Colors.brand.primary} />;
      default:
        return <MapPin size={16} color={Colors.brand.primary} />;
    }
  };

  if (cart.length === 0) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Your Cart',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ChevronLeft size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Add items to get started</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push('/categories' as any)}
          >
            <Text style={styles.browseButtonText}>Browse products</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Your Cart',
        }}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
      >
        <TouchableOpacity
          style={styles.addressCard}
          onPress={() => router.push('/addresses?from=cart' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.addressHeader}>
            <View style={styles.addressLeft}>
              <View style={styles.addressIconPill}>
                {getAddressIcon()}
              </View>
              <View style={styles.addressTextContainer}>
                <View style={styles.addressTitleRow}>
                  <Text style={styles.addressTitle}>
                    Delivering to {defaultAddress?.type ? defaultAddress.type.charAt(0).toUpperCase() + defaultAddress.type.slice(1) : 'Home'}
                  </Text>
                  <ChevronDown size={16} color={Colors.text.secondary} />
                </View>
                <Text style={styles.addressSubtext} numberOfLines={2}>
                  {defaultAddress
                    ? `${defaultAddress.flat}, ${defaultAddress.area}, ${defaultAddress.city} ${defaultAddress.pincode}`
                    : 'No address selected. Tap to add.'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/addresses?from=cart' as any)}>
              <Text style={styles.changeButton}>Change</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        <View style={styles.cartItemsCard}>
          {cart.map((item, index) => {
            const cartItem = cart.find((ci) => ci.product.id === item.product.id);
            const qty = cartItem?.quantity || 0;

            return (
              <View key={item.product.id}>
                {index > 0 && <View style={styles.itemDivider} />}
                <View style={styles.cartItem}>
                  <Image
                    source={{ uri: item.product.image }}
                    style={styles.itemThumbnail}
                  />
                  <View style={styles.itemMiddle}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {item.product.name}
                    </Text>
                    <View style={styles.itemPriceRow}>
                      <Text style={styles.itemPrice}>₹{item.product.price.toFixed(2)}</Text>
                      {item.product.discount > 0 && (
                        <Text style={styles.itemMrp}>₹{item.product.mrp.toFixed(2)}</Text>
                      )}
                      {item.product.unit && (
                        <Text style={styles.itemUnit}>/{item.product.unit}</Text>
                      )}
                    </View>
                    <View style={styles.itemQtyStepper}>
                      <TouchableOpacity
                        style={styles.itemQtyButton}
                        onPress={() => handleQuantityChange(item.product.id, qty - 1)}
                      >
                        <Minus size={14} color={Colors.text.inverse} />
                      </TouchableOpacity>
                      <Text style={styles.itemQtyText}>{qty}</Text>
                      <TouchableOpacity
                        style={styles.itemQtyButton}
                        onPress={() => handleQuantityChange(item.product.id, qty + 1)}
                      >
                        <Plus size={14} color={Colors.text.inverse} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.itemRight}>
                    <TouchableOpacity
                      style={styles.trashButton}
                      onPress={() => handleRemoveItem(item.product.id)}
                    >
                      <Trash2 size={20} color={Colors.text.tertiary} />
                    </TouchableOpacity>
                    <Text style={styles.itemTotal}>
                      ₹{(item.product.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.addMoreButton}
            onPress={() => router.push('/categories' as any)}
          >
            <Plus size={16} color={Colors.brand.primary} />
            <Text style={styles.addMoreButtonText}>Add more item</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.paymentDetailsCard}>
          <Text style={styles.paymentDetailsTitle}>Payment Details</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>
              Price ({priceDetails.itemCount} Item{priceDetails.itemCount !== 1 ? 's' : ''})
            </Text>
            <Text style={styles.paymentValue}>₹{priceDetails.price.toFixed(2)}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Item Discount</Text>
            <Text style={[styles.paymentValue, styles.paymentDiscount]}>
              -₹{priceDetails.itemDiscount.toFixed(2)}
            </Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Delivery Fee</Text>
            <Text style={styles.paymentValue}>
              {priceDetails.deliveryFee === 0 ? (
                <Text style={styles.freeTag}>₹0</Text>
              ) : (
                `₹${priceDetails.deliveryFee}`
              )}
            </Text>
          </View>
          <View style={styles.paymentDivider} />
          <View style={styles.paymentRow}>
            <Text style={styles.paymentTotalLabel}>Total Payable</Text>
            <Text style={styles.paymentTotalValue}>₹{totalPayable.toFixed(2)}</Text>
          </View>
        </View>

        {similarProducts.length > 0 && (
          <View style={styles.similarSection}>
            <View style={styles.similarHeader}>
              <Text style={styles.similarTitle}>Similar Products</Text>
              <TouchableOpacity onPress={() => router.push('/categories' as any)}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.similarScroll}
            >
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
                      <Text style={styles.similarPrice}>₹{item.price.toFixed(2)}</Text>
                      {item.discount > 0 && (
                        <Text style={styles.similarMrp}>₹{item.mrp.toFixed(2)}</Text>
                      )}
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
                            if (similarQty === 1) {
                              Alert.alert(
                                'Remove Item',
                                'Are you sure you want to remove this item from cart?',
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Remove',
                                    style: 'destructive',
                                    onPress: () => updateCartItem(item.id, 0),
                                  },
                                ]
                              );
                            } else {
                              updateCartItem(item.id, similarQty - 1);
                            }
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
      </ScrollView>

      <View style={[styles.stickyBottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.bottomBarTop}>
          <Text style={styles.bottomBarLabel}>Total Payable</Text>
          <Text style={styles.bottomBarValue}>₹{totalPayable.toFixed(2)}</Text>
        </View>
        {totalSavings > 0 && (
          <Text style={styles.bottomBarSavings}>
            You will save ₹{totalSavings.toFixed(2)} on this order
          </Text>
        )}
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
        >
          <Text style={styles.checkoutButtonText}>Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: Colors.brand.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.inverse,
  },
  addressCard: {
    backgroundColor: '#FFF5ED',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 12,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  addressLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  addressIconPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressTextContainer: {
    flex: 1,
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  addressSubtext: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  changeButton: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.brand.primary,
  },
  cartItemsCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  cartItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  itemDivider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 12,
  },
  itemThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  itemMiddle: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.brand.primary,
  },
  itemMrp: {
    fontSize: 13,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  itemUnit: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  itemQtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brand.primary,
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 8,
    alignSelf: 'flex-start',
  },
  itemQtyButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemQtyText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text.inverse,
    minWidth: 20,
    textAlign: 'center',
  },
  itemRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  trashButton: {
    padding: 4,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.brand.primary,
    borderRadius: 20,
    paddingVertical: 10,
    marginTop: 16,
  },
  addMoreButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.brand.primary,
  },
  paymentDetailsCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  paymentDetailsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  paymentDiscount: {
    color: Colors.status.success,
  },
  freeTag: {
    color: Colors.status.success,
    fontWeight: '600' as const,
  },
  paymentDivider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 8,
  },
  paymentTotalLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  paymentTotalValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  similarSection: {
    marginTop: 8,
    paddingTop: 16,
  },
  similarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
    paddingLeft: 16,
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
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingHorizontal: 16,
    paddingTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
      },
    }),
  },
  bottomBarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  bottomBarLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  bottomBarValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  bottomBarSavings: {
    fontSize: 12,
    color: Colors.status.success,
    marginBottom: 12,
  },
  checkoutButton: {
    backgroundColor: Colors.brand.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.inverse,
  },
});
