import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Platform,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, ChevronDown, ChevronUp, Home, Briefcase, MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useAddresses } from '@/contexts/AddressContext';
import { orderService } from '@/lib/order.service';
import { slotService, type TimeSlot, type DateSlots } from '@/lib/slot.service';

type PaymentMethod = 'cash' | 'upi';

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cart, wallet, clearCart, user, isAuthenticated, isLoading } = useAuth();
  const { getDefaultAddress } = useAddresses();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderPlacedSuccessfully, setOrderPlacedSuccessfully] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [orderSummaryExpanded, setOrderSummaryExpanded] = useState(false);
  const [actualWalletApplied, setActualWalletApplied] = useState(false);
  const [actualWalletCustom, setActualWalletCustom] = useState(false);
  const [actualWalletInput, setActualWalletInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [contactlessDelivery, setContactlessDelivery] = useState(false);
  const [promoExpanded, setPromoExpanded] = useState(false);

  // Delivery slot selection state
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<DateSlots[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Ensure component is mounted before navigation (fixes web refresh issue)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redirect to auth if not logged in (only after auth loading is complete and component is mounted)
  useEffect(() => {
    if (!isMounted || isLoading) return; // Wait for auth to finish loading
    
    if (!isAuthenticated) {
      // On web, add a small delay to ensure router is ready
      if (Platform.OS === 'web') {
        const timer = setTimeout(() => {
          router.replace('/auth');
        }, 100);
        return () => clearTimeout(timer);
      } else {
        router.replace('/auth');
      }
    }
  }, [isAuthenticated, isMounted, isLoading, router]);

  const defaultAddress = getDefaultAddress();

  const priceDetails = {
    itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    itemsTotal: cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    itemDiscount: cart.reduce(
      (sum, item) => sum + (item.product.mrp - item.product.price) * item.quantity,
      0
    ),
    deliveryFee: 0,
  };

  const subtotal = priceDetails.itemsTotal + priceDetails.deliveryFee;

  const calculateActualWalletAmount = () => {
    if (!actualWalletApplied) return 0;
    
    const maxActual = Math.min(wallet.actualBalance, subtotal);
    return actualWalletCustom
      ? Math.min(parseFloat(actualWalletInput) || 0, maxActual)
      : maxActual;
  };

  const actualApplied = calculateActualWalletAmount();
  const finalPayable = Math.max(0, subtotal - actualApplied);
  const totalSavings = priceDetails.itemDiscount + actualApplied;

  // Load delivery slots
  async function loadSlots() {
    setIsLoadingSlots(true);
    setSlotError(null);

    try {
      const result = await slotService.getAvailableSlots();
      
      console.log('[CHECKOUT] Slot loading result:', result);

      if (result.success && result.data) {
        console.log('[CHECKOUT] Slots loaded successfully:', result.data.dates.length, 'dates');
        setAvailableSlots(result.data.dates);
        
        // Auto-select first date with slots
        const firstDateWithSlots = result.data.dates.find(d => d.hasSlots);
        if (firstDateWithSlots) {
          setSelectedDate(firstDateWithSlots.date);
          
          // Auto-select first available slot
          const firstAvailableSlot = firstDateWithSlots.slots.find(s => s.is_selectable);
          if (firstAvailableSlot) {
            setSelectedSlot(firstAvailableSlot);
          }
        } else {
          console.warn('[CHECKOUT] No dates with slots found');
        }
      } else {
        console.error('[CHECKOUT] Failed to load slots:', result.error);
        setSlotError(result.error || 'Failed to load delivery slots');
      }
    } catch (error) {
      console.error('[CHECKOUT] Exception loading slots:', error);
      setSlotError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoadingSlots(false);
    }
  }

  // Load slots on mount
  useEffect(() => {
    loadSlots();
  }, []);

  // Handle slot selection
  function handleSlotSelect(slot: TimeSlot) {
    setSelectedSlot(slot);
  }

  // Refresh slots handler
  const refreshSlots = useCallback(() => {
    loadSlots();
    setSelectedSlot(null); // Clear selection on refresh
  }, []);

  const handleActualWalletToggle = (value: boolean) => {
    setActualWalletApplied(value);
    if (!value) {
      setActualWalletCustom(false);
      setActualWalletInput('');
    }
  };

  const handleActualUseMax = () => {
    setActualWalletCustom(false);
    setActualWalletInput('');
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

  const handlePlaceOrder = async () => {
    // Validate slot selection
    if (!selectedSlot) {
      Alert.alert(
        'Delivery Slot Required',
        'Please select a delivery time slot before placing your order.'
      );
      return;
    }

    if (!user?.id || !defaultAddress) {
      Alert.alert('Error', 'Please select a delivery address');
      return;
    }

    if (cart.length === 0) {
      Alert.alert('Error', 'Your cart is empty');
      return;
    }

    setIsPlacingOrder(true);

    try {
      const orderItems = cart.map(item => {
        return {
          productId: item.product.id,
          productName: item.product.name,
          productImage: item.product.image,
          quantity: item.quantity,
          totalPrice: Math.round(item.product.price * item.quantity),
          status: 'pending',
        };
      });

      const result = await orderService.createOrder({
        userId: user.id,
        addressId: defaultAddress.id,
        deliverySlotId: selectedSlot.id, // NEW
        items: orderItems,
        subtotal: priceDetails.itemsTotal,
        discount: priceDetails.itemDiscount,
        deliveryFee: priceDetails.deliveryFee,
        total: finalPayable,
        walletUsed: actualApplied,
        deliveryNotes,
        contactlessDelivery,
      });

      if (result.success && result.data) {
        setOrderPlacedSuccessfully(true);
        clearCart();
        
        // On web, directly navigate to orders page
        if (Platform.OS === 'web') {
          router.replace('/(tabs)/orders' as any);
        } else {
          // On mobile, show alert with options
          Alert.alert(
            'Order Placed',
            `Your order has been placed successfully!\n\nOrder #: ${result.data.order_number}\nDelivery: ${slotService.formatFullDate(selectedSlot.date)}, ${selectedSlot.display_label}`,
            [
              {
                text: 'View Order',
                onPress: () => router.replace(`/order/${result.data!.id}` as any),
              },
              {
                text: 'Go to Orders',
                onPress: () => router.replace('/(tabs)/orders' as any),
              },
            ]
          );
        }
      } else {
        // Handle slot validation errors
        if (result.error?.code && result.error.code.startsWith('SLOT_')) {
          Alert.alert(
            'Slot Unavailable',
            result.error.message,
            [
              { text: 'Choose Another Slot', onPress: refreshSlots }
            ]
          );
        } else {
          Alert.alert('Error', result.error?.message || 'Failed to place order. Please try again.');
        }
      }
    } catch (error) {
      console.error('[Checkout] Error placing order:', error);
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Avoid navigation/state changes during render; gate with an effect
  // Don't redirect if order was just placed successfully
  useEffect(() => {
    if (cart.length === 0 && !orderPlacedSuccessfully) {
      router.replace('/cart' as any);
    }
  }, [cart.length, orderPlacedSuccessfully]);

  // Show loading state while auth is loading
  if (isLoading || !isMounted) {
    return null;
  }

  // Don't render if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  if (cart.length === 0) return null;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Checkout',
        }}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
      >
        <TouchableOpacity
          style={styles.addressCard}
          onPress={() => router.push('/addresses?from=checkout' as any)}
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
            <TouchableOpacity onPress={() => router.push('/addresses?from=checkout' as any)}>
              <Text style={styles.changeButton}>Change</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* NEW: Delivery Slot Selection */}
        <View style={styles.sectionCard}>
          <View style={styles.slotSectionHeader}>
            <Text style={styles.sectionTitle}>Choose Delivery Time</Text>
            <TouchableOpacity onPress={refreshSlots} disabled={isLoadingSlots}>
              <Text style={styles.refreshButton}>Refresh</Text>
            </TouchableOpacity>
          </View>
          
          {isLoadingSlots ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.brand.primary} />
              <Text style={styles.loadingText}>Loading available slots...</Text>
            </View>
          ) : slotError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{slotError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadSlots}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : availableSlots.length === 0 ? (
            <View style={styles.emptySlots}>
              <Text style={styles.emptyText}>
                No delivery slots available at this time
              </Text>
              <Text style={styles.emptySubtext}>
                Please check back later or contact support
              </Text>
            </View>
          ) : (
            <>
              {/* Date Tabs */}
              <View style={styles.dateTabs}>
                {availableSlots.map((dateGroup) => (
                  <TouchableOpacity
                    key={dateGroup.date}
                    style={[
                      styles.dateTab,
                      selectedDate === dateGroup.date && styles.dateTabActive,
                      !dateGroup.hasSlots && styles.dateTabDisabled
                    ]}
                    onPress={() => dateGroup.hasSlots && setSelectedDate(dateGroup.date)}
                    disabled={!dateGroup.hasSlots}
                  >
                    <Text style={[
                      styles.dateTabText,
                      selectedDate === dateGroup.date && styles.dateTabTextActive
                    ]}>
                      {dateGroup.displayDate}
                    </Text>
                    {!dateGroup.hasSlots && (
                      <Text style={styles.noSlotsText}>No slots</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Slots for Selected Date */}
              <View style={styles.slotsList}>
                {availableSlots
                  .find(d => d.date === selectedDate)
                  ?.slots.map(slot => (
                    <SlotCard
                      key={slot.id}
                      slot={slot}
                      isSelected={selectedSlot?.id === slot.id}
                      onSelect={handleSlotSelect}
                    />
                  ))}
              </View>
            </>
          )}

          {/* Slot Required Warning */}
          {!selectedSlot && !isLoadingSlots && !slotError && availableSlots.length > 0 && (
            <View style={styles.slotRequiredBanner}>
              <Text style={styles.slotRequiredText}>
                ⚠️ Please select a delivery slot to continue
              </Text>
            </View>
          )}

          {/* Selected Slot Summary */}
          {selectedSlot && (
            <View style={styles.selectedSlotSummary}>
              <Text style={styles.selectedSlotLabel}>Selected Delivery Time:</Text>
              <Text style={styles.selectedSlotValue}>
                {slotService.formatDisplayDate(selectedSlot.date)}, {selectedSlot.display_label}
              </Text>
              {selectedSlot.label && (
                <View style={styles.slotLabelPill}>
                  <Text style={styles.slotLabelText}>{selectedSlot.label}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setOrderSummaryExpanded(!orderSummaryExpanded)}
          >
            <Text style={styles.sectionTitle}>
              Order Summary ({priceDetails.itemCount} item
              {priceDetails.itemCount !== 1 ? 's' : ''})
            </Text>
            {orderSummaryExpanded ? (
              <ChevronUp size={20} color={Colors.text.secondary} />
            ) : (
              <ChevronDown size={20} color={Colors.text.secondary} />
            )}
          </TouchableOpacity>

          {orderSummaryExpanded && (
            <View style={styles.orderItemsList}>
              {cart.map((item, index) => (
                <View key={item.product.id}>
                  {index > 0 && <View style={styles.itemDivider} />}
                  <View style={styles.orderItem}>
                    <Image source={{ uri: item.product.image }} style={styles.orderItemThumb} />
                    <View style={styles.orderItemMiddle}>
                      <Text style={styles.orderItemTitle} numberOfLines={1}>
                        {item.product.name}
                      </Text>
                      <Text style={styles.orderItemQty}>Qty: {item.quantity}</Text>
                    </View>
                    <Text style={styles.orderItemTotal}>
                      ₹{(item.product.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.walletHeader}>
            <Text style={styles.sectionTitle}>Wallet Redemption (Actual only)</Text>
          </View>

          <View style={styles.walletCard}>
            <View style={styles.walletCardHeader}>
              <View>
                <Text style={styles.walletCardTitle}>Actual Wallet</Text>
                <Text style={styles.walletCardSubtitle}>Spendable balance</Text>
                <Text style={styles.walletCardBalance}>₹{wallet.actualBalance.toFixed(2)}</Text>
              </View>
              <Switch
                value={actualWalletApplied}
                onValueChange={handleActualWalletToggle}
                trackColor={{ false: Colors.border.medium, true: Colors.brand.primary }}
                thumbColor={Colors.background.primary}
              />
            </View>

            {actualWalletApplied && (
              <View style={styles.walletAmountSelector}>
                <View style={styles.walletAmountRow}>
                  <TouchableOpacity
                    style={[
                      styles.walletAmountChip,
                      !actualWalletCustom && styles.walletAmountChipActive,
                    ]}
                    onPress={handleActualUseMax}
                  >
                    <Text
                      style={[
                        styles.walletAmountChipText,
                        !actualWalletCustom && styles.walletAmountChipTextActive,
                      ]}
                    >
                      Use Max
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.walletAmountChip,
                      actualWalletCustom && styles.walletAmountChipActive,
                    ]}
                    onPress={() => setActualWalletCustom(true)}
                  >
                    <Text
                      style={[
                        styles.walletAmountChipText,
                        actualWalletCustom && styles.walletAmountChipTextActive,
                      ]}
                    >
                      Custom Amount
                    </Text>
                  </TouchableOpacity>
                </View>

                {actualWalletCustom && (
                  <TextInput
                    style={styles.walletInput}
                    placeholder="Enter amount"
                    keyboardType="numeric"
                    value={actualWalletInput}
                    onChangeText={setActualWalletInput}
                    placeholderTextColor={Colors.text.tertiary}
                  />
                )}

                <View style={styles.walletProgressBar}>
                  <View
                    style={[
                      styles.walletProgressFill,
                      {
                        width: `${Math.min(
                          (actualApplied / Math.max(wallet.actualBalance, 1)) * 100,
                          100
                        )}%`,
                      },
                    ]}
                  />
                </View>

                <Text style={styles.walletAppliedNote}>
                  Applied to this order: ₹{actualApplied.toFixed(2)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.walletHintBox}>
            <Text style={styles.walletHintText}>
              Virtual Wallet is not spendable. Convert it to Actual by inviting friends.{' '}
              <Text
                style={styles.walletHintLink}
                onPress={() => router.push('/referral' as any)}
              >
                Learn how
              </Text>
            </Text>
          </View>

          {actualApplied > 0 && (
            <View style={styles.walletAppliedSummary}>
              <Text style={styles.walletAppliedSummaryLabel}>Wallet Applied:</Text>
              <Text style={styles.walletAppliedSummaryValue}>
                ₹{actualApplied.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>
              Items Total ({priceDetails.itemCount})
            </Text>
            <Text style={styles.paymentValue}>₹{priceDetails.itemsTotal.toFixed(2)}</Text>
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
                <Text style={styles.freeTag}>Free</Text>
              ) : (
                `₹${priceDetails.deliveryFee}`
              )}
            </Text>
          </View>
          {actualApplied > 0 && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Wallet Applied (Actual)</Text>
              <Text style={[styles.paymentValue, styles.paymentDiscount]}>
                -₹{actualApplied.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.paymentDivider} />
          <View style={styles.paymentRow}>
            <Text style={styles.paymentTotalLabel}>Total Payable</Text>
            <Text style={styles.paymentTotalValue}>₹{finalPayable.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <TouchableOpacity
            style={styles.paymentMethodOption}
            onPress={() => setPaymentMethod('cash')}
          >
            <View style={styles.radioOuter}>
              {paymentMethod === 'cash' && <View style={styles.radioInner} />}
            </View>
            <View style={styles.paymentMethodText}>
              <Text style={styles.paymentMethodTitle}>Pay at Delivery — Cash</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.paymentMethodOption}
            onPress={() => setPaymentMethod('upi')}
          >
            <View style={styles.radioOuter}>
              {paymentMethod === 'upi' && <View style={styles.radioInner} />}
            </View>
            <View style={styles.paymentMethodText}>
              <Text style={styles.paymentMethodTitle}>Pay at Delivery — UPI</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.paymentMethodNote}>
            No charges now. Pay the delivery partner.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Delivery Preferences</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add delivery notes (optional)"
            placeholderTextColor={Colors.text.tertiary}
            value={deliveryNotes}
            onChangeText={setDeliveryNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.contactlessRow}>
            <Text style={styles.contactlessLabel}>Contactless delivery</Text>
            <Switch
              value={contactlessDelivery}
              onValueChange={setContactlessDelivery}
              trackColor={{ false: Colors.border.medium, true: Colors.brand.primary }}
              thumbColor={Colors.background.primary}
            />
          </View>
        </View>

        {false && (
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.promoHeader}
              onPress={() => setPromoExpanded(!promoExpanded)}
            >
              <Text style={styles.promoHeaderText}>Have a promo code?</Text>
              {promoExpanded ? (
                <ChevronUp size={20} color={Colors.text.secondary} />
              ) : (
                <ChevronDown size={20} color={Colors.text.secondary} />
              )}
            </TouchableOpacity>

            {promoExpanded && (
              <View style={styles.promoInputRow}>
                <TextInput
                  style={styles.promoInput}
                  placeholder="Enter promo code"
                  placeholderTextColor={Colors.text.tertiary}
                />
                <TouchableOpacity style={styles.promoApplyButton}>
                  <Text style={styles.promoApplyButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.stickyBottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.bottomBarTop}>
          <Text style={styles.bottomBarLabel}>Total Payable</Text>
          <Text style={styles.bottomBarValue}>₹{finalPayable.toFixed(2)}</Text>
        </View>
        {totalSavings > 0 && (
          <Text style={styles.bottomBarSavings}>
            You save ₹{totalSavings.toFixed(2)} on this order
          </Text>
        )}
        <TouchableOpacity 
          style={[styles.placeOrderButton, isPlacingOrder && styles.placeOrderButtonDisabled]} 
          onPress={handlePlaceOrder}
          disabled={isPlacingOrder}
        >
          <Text style={styles.placeOrderButtonText}>
            {isPlacingOrder ? 'Placing Order...' : `Place Order${finalPayable === 0 ? ' — ₹0 at delivery' : ''}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// SlotCard Component
interface SlotCardProps {
  slot: TimeSlot;
  isSelected: boolean;
  onSelect: (slot: TimeSlot) => void;
}

function SlotCard({ slot, isSelected, onSelect }: SlotCardProps) {
  const getStatusBadge = () => {
    if (slot.status === 'full' || !slot.is_selectable) {
      return (
        <View style={styles.slotBadge_full}>
          <Text style={styles.slotBadgeText}>Full</Text>
        </View>
      );
    }
    
    if (slot.available_deliveries <= 3) {
      return (
        <View style={styles.slotBadge_limited}>
          <Text style={styles.slotBadgeText}>{slot.available_deliveries} left</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.slotBadge_available}>
        <Text style={styles.slotBadgeText}>Available</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.slotCard,
        isSelected && styles.slotCardSelected,
        !slot.is_selectable && styles.slotCardDisabled
      ]}
      onPress={() => slot.is_selectable && onSelect(slot)}
      disabled={!slot.is_selectable}
      activeOpacity={0.7}
    >
      <View style={styles.slotCardContent}>
        <View style={styles.slotCardLeft}>
          <Text style={[
            styles.slotTime,
            !slot.is_selectable && styles.slotTimeDisabled
          ]}>
            {slot.display_label}
          </Text>
          {slot.label && (
            <Text style={styles.slotSubLabel}>{slot.label}</Text>
          )}
        </View>

        <View style={styles.slotCardRight}>
          {getStatusBadge()}
          {isSelected && slot.is_selectable && (
            <View style={styles.selectedCheckmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
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
  sectionCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  orderItemsList: {
    marginTop: 16,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  itemDivider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 8,
  },
  orderItemThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  orderItemMiddle: {
    flex: 1,
  },
  orderItemTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  orderItemQty: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  orderItemTotal: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  walletHeader: {
    marginBottom: 16,
  },
  walletCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  walletCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletCardTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  walletCardSubtitle: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginBottom: 6,
  },
  walletCardBalance: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.brand.primary,
  },
  walletAmountSelector: {
    marginTop: 16,
  },
  walletAmountRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  walletAmountChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.brand.primary,
    alignItems: 'center',
  },
  walletAmountChipActive: {
    backgroundColor: Colors.brand.primary,
  },
  walletAmountChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.brand.primary,
  },
  walletAmountChipTextActive: {
    color: Colors.text.inverse,
  },
  walletInput: {
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  walletProgressBar: {
    height: 6,
    backgroundColor: Colors.border.light,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  walletProgressFill: {
    height: '100%',
    backgroundColor: Colors.brand.primary,
  },
  walletAppliedNote: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  walletHintBox: {
    backgroundColor: '#FFF5ED',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  walletHintText: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  walletHintLink: {
    color: Colors.brand.primary,
    fontWeight: '600' as const,
  },
  walletAppliedSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  walletAppliedSummaryLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  walletAppliedSummaryValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.brand.primary,
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
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.brand.primary,
  },
  paymentMethodText: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  paymentMethodNote: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 16,
    minHeight: 80,
  },
  contactlessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactlessLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoHeaderText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  promoInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text.primary,
  },
  promoApplyButton: {
    backgroundColor: Colors.brand.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  promoApplyButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.inverse,
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
  placeOrderButton: {
    backgroundColor: Colors.brand.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOrderButtonDisabled: {
    opacity: 0.6,
  },
  placeOrderButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.inverse,
  },
  // Slot Selection Styles
  slotSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    fontSize: 14,
    color: Colors.brand.primary,
    fontWeight: '600' as const,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  errorText: {
    fontSize: 14,
    color: Colors.status.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.brand.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emptySlots: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  dateTabs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
  },
  dateTabActive: {
    borderColor: Colors.brand.primary,
    backgroundColor: Colors.brand.primaryLight,
  },
  dateTabDisabled: {
    opacity: 0.5,
  },
  dateTabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  dateTabTextActive: {
    color: Colors.brand.primary,
  },
  noSlotsText: {
    fontSize: 10,
    color: Colors.text.tertiary,
    marginTop: 4,
  },
  slotsList: {
    gap: 12,
  },
  slotCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.background.primary,
    padding: 16,
  },
  slotCardSelected: {
    borderColor: Colors.brand.primary,
    borderWidth: 2,
    backgroundColor: Colors.brand.primaryLight,
  },
  slotCardDisabled: {
    opacity: 0.5,
  },
  slotCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotCardLeft: {
    flex: 1,
  },
  slotTime: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  slotTimeDisabled: {
    color: Colors.text.tertiary,
  },
  slotSubLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  slotCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotBadge_available: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
  },
  slotBadge_limited: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
  },
  slotBadge_full: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
  },
  slotBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  selectedCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: Colors.text.inverse,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  slotRequiredBanner: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.background.secondary,
  },
  slotRequiredText: {
    fontSize: 13,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  selectedSlotSummary: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.brand.primary,
  },
  selectedSlotLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  selectedSlotValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  slotLabelPill: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.brand.primaryLight,
  },
  slotLabelText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.brand.primary,
  },
});
