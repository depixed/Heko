import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { ChevronLeft, Bell, HelpCircle, ChevronDown, ChevronUp, Copy, Maximize2, Download } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import Colors from '@/constants/colors';
import { useOrders } from '@/contexts/OrderContext';
import type { OrderWithRelations } from '@/lib/order.service';
import type { Database } from '@/types/database';

type OrderStatus = Database['public']['Tables']['orders']['Row']['status'];

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getOrderById, cancelOrder: cancelOrderContext } = useOrders();
  
  const [order, setOrder] = useState<OrderWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [otpVisible, setOtpVisible] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [itemsExpanded, setItemsExpanded] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadOrder = async () => {
    if (!id) return;
    setIsLoading(true);
    const orderData = await getOrderById(id);
    setOrder(orderData);
    setIsLoading(false);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
        return Colors.status.success;
      case 'out_for_delivery':
        return Colors.status.info;
      case 'canceled':
      case 'unfulfillable':
        return Colors.status.error;
      default:
        return Colors.status.warning;
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'placed':
        return 'Placed';
      case 'processing':
        return 'Processing';
      case 'preparing':
        return 'Preparing';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
      case 'partially_delivered':
        return 'Partially Delivered';
      case 'unfulfillable':
        return 'Unfulfillable';
      case 'canceled':
        return 'Canceled';
      case 'return_in_progress':
        return 'Return in Progress';
      case 'returned':
        return 'Returned';
      default:
        return status;
    }
  };

  const getStatusSubtext = () => {
    if (!order) return '';
    
    switch (order.status) {
      case 'placed':
        return 'Your order has been placed';
      case 'processing':
        return 'Your order is being processed';
      case 'preparing':
        return order.delivery_window ? `Estimated delivery ${order.delivery_window}` : 'Estimated delivery today 2-4pm';
      case 'out_for_delivery':
        return 'Partner is on the way';
      case 'delivered':
        return `Delivered on ${new Date(order.updated_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })} at ${new Date(order.updated_at).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        })}`;
      case 'canceled':
        return 'Order was canceled';
      case 'unfulfillable':
        return 'Unable to fulfill this order';
      default:
        return '';
    }
  };

  const copyOtp = async () => {
    if (order?.delivery_otp) {
      await Clipboard.setStringAsync(order.delivery_otp);
      Alert.alert('Copied', 'OTP copied to clipboard');
    }
  };

  const showOtpLarge = () => {
    setOtpModalVisible(true);
  };



  const cancelOrder = async () => {
    if (!order?.id) return;

    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsCanceling(true);
            try {
              const success = await cancelOrderContext(order.id, 'Canceled by user');
              if (success) {
                Alert.alert(
                  'Order Canceled',
                  'Your order has been canceled successfully.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Reload the order to show updated status
                        loadOrder();
                      },
                    },
                  ]
                );
              } else {
                Alert.alert('Error', 'Failed to cancel order. Please try again.');
              }
            } catch (error) {
              console.error('[OrderDetails] Error canceling order:', error);
              Alert.alert('Error', 'Failed to cancel order. Please try again.');
            } finally {
              setIsCanceling(false);
            }
          },
        },
      ]
    );
  };



  const downloadInvoice = () => {
    Alert.alert('Download Invoice', 'Invoice download will be available soon');
  };

  const showOtpHelp = () => {
    Alert.alert(
      'OTP Not Working?',
      'If the delivery partner is unable to verify the OTP, please:\n\n1. Ensure you are sharing the correct OTP\n2. Check if the OTP has expired\n3. Contact support for assistance',
      [{ text: 'OK' }]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const showOFDActions = order.status === 'out_for_delivery';
  const showDeliveredActions = order.status === 'delivered';
  const canCancel = order.status !== 'out_for_delivery' && order.status !== 'delivered' && order.status !== 'canceled';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton}>
            <Bell size={20} color={Colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <HelpCircle size={20} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
          </View>
          <Text style={styles.statusSubtext}>{getStatusSubtext()}</Text>
        </View>

        {order.status === 'out_for_delivery' && order.delivery_otp && (
          <View style={styles.otpCard}>
            <Text style={styles.otpLabel}>Delivery OTP</Text>
            <TouchableOpacity onPress={() => setOtpVisible(!otpVisible)}>
              <Text style={styles.otpValue}>{otpVisible ? order.delivery_otp : '••••••'}</Text>
            </TouchableOpacity>
            <Text style={styles.otpInstruction}>
              Share this OTP with the delivery partner to complete delivery.
            </Text>
            <View style={styles.otpActions}>
              <TouchableOpacity style={styles.otpActionButton} onPress={copyOtp}>
                <Copy size={16} color={Colors.brand.primary} />
                <Text style={styles.otpActionText}>Copy OTP</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.otpActionButton} onPress={showOtpLarge}>
                <Maximize2 size={16} color={Colors.brand.primary} />
                <Text style={styles.otpActionText}>Show Large</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.otpActionButton} onPress={showOtpHelp}>
                <HelpCircle size={16} color={Colors.brand.primary} />
                <Text style={styles.otpActionText}>Help</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.otpNote}>Valid until delivery completes.</Text>
          </View>
        )}

        {order.user_addresses && (
          <View style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <Text style={styles.addressLabel}>
                Delivering to {order.user_addresses.type.charAt(0).toUpperCase() + order.user_addresses.type.slice(1)}
              </Text>
            </View>
            <Text style={styles.addressText}>
              {order.user_addresses.address_line1}
              {order.user_addresses.address_line2 ? `, ${order.user_addresses.address_line2}` : ''}
              {order.user_addresses.landmark ? `, ${order.user_addresses.landmark}` : ''}
              {'\n'}
              {order.user_addresses.city}, {order.user_addresses.state} - {order.user_addresses.pincode}
            </Text>
          </View>
        )}

        <View style={styles.itemsCard}>
          <TouchableOpacity
            style={styles.itemsHeader}
            onPress={() => setItemsExpanded(!itemsExpanded)}
          >
            <Text style={styles.itemsTitle}>Items ({order.order_items?.length || 0})</Text>
            {itemsExpanded ? (
              <ChevronUp size={20} color={Colors.text.secondary} />
            ) : (
              <ChevronDown size={20} color={Colors.text.secondary} />
            )}
          </TouchableOpacity>
          {itemsExpanded && (
            <View style={styles.itemsList}>
              {(order.order_items || []).map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.product_name || 'Product'}</Text>
                    <Text style={styles.itemQuantity}>Qty: {item.quantity} • {item.status}</Text>
                  </View>
                  <Text style={styles.itemPrice}>₹{item.total_price.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.paymentCard}>
          <Text style={styles.paymentTitle}>Payment Details</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Items Total ({order.order_items?.length || 0})</Text>
            <Text style={styles.paymentValue}>₹{order.subtotal.toFixed(2)}</Text>
          </View>
          {order.discount > 0 && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Item Discount</Text>
              <Text style={[styles.paymentValue, styles.discountText]}>
                -₹{order.discount.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Delivery Fee</Text>
            <Text style={styles.paymentValue}>
              {order.delivery_fee === 0 ? 'Free' : `₹${order.delivery_fee.toFixed(2)}`}
            </Text>
          </View>
          {order.wallet_used > 0 && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Wallet Applied (Actual)</Text>
              <Text style={[styles.paymentValue, styles.discountText]}>
                -₹{order.wallet_used.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.paymentDivider} />
          <View style={styles.paymentRow}>
            <Text style={styles.paymentTotalLabel}>
              {order.status === 'delivered' ? 'Total Paid' : 'Total Payable at Delivery'}
            </Text>
            <Text style={styles.paymentTotalValue}>₹{order.total.toFixed(2)}</Text>
          </View>
          {order.status !== 'delivered' && (
            <Text style={styles.paymentNote}>Pay cash or UPI to the delivery partner.</Text>
          )}
        </View>

        <View style={styles.metaCard}>
          <Text style={styles.metaTitle}>Order Information</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Order #</Text>
            <Text style={styles.metaValue}>{order.order_number}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Placed On</Text>
            <Text style={styles.metaValue}>
              {new Date(order.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}{' '}
              at{' '}
              {new Date(order.created_at).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Payment Method</Text>
            <Text style={styles.metaValue}>Pay at Delivery</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.bottomBarLeft}>
          <Text style={styles.bottomBarLabel}>
            {order.status === 'delivered' ? 'Total Paid' : 'Total Payable'}
          </Text>
          <Text style={styles.bottomBarValue}>₹{order.total.toFixed(2)}</Text>
        </View>
        <View style={styles.bottomBarRight}>
          {showOFDActions && (
            <TouchableOpacity style={styles.primaryButton} onPress={showOtpLarge}>
              <Text style={styles.primaryButtonText}>Show OTP</Text>
            </TouchableOpacity>
          )}
          {showDeliveredActions && (
            <TouchableOpacity style={styles.primaryButton} onPress={downloadInvoice}>
              <Download size={18} color={Colors.text.inverse} />
              <Text style={styles.primaryButtonText}>Invoice</Text>
            </TouchableOpacity>
          )}
          {canCancel && (
create            <TouchableOpacity 
              style={[styles.cancelButton, isCanceling && styles.cancelButtonDisabled]} 
              onPress={cancelOrder}
              disabled={isCanceling}
            >
              <Text style={styles.cancelButtonText}>
                {isCanceling ? 'Canceling...' : 'Cancel Order'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal
        visible={otpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOtpModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delivery OTP</Text>
            <Text style={styles.modalOtp}>{order.delivery_otp}</Text>
            <Text style={styles.modalInstruction}>
              Share this OTP with the delivery partner
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => setOtpModalVisible(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  content: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: Colors.background.primary,
    padding: 16,
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.inverse,
  },
  statusSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  otpCard: {
    backgroundColor: Colors.background.primary,
    padding: 20,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.brand.primary,
  },
  otpLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  otpValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.brand.primary,
    letterSpacing: 4,
    marginBottom: 12,
  },
  otpInstruction: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  otpActions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  otpActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  otpActionText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.brand.primary,
  },
  otpNote: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
  },
  addressCard: {
    backgroundColor: Colors.background.primary,
    padding: 16,
    marginBottom: 12,
  },
  addressHeader: {
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    textTransform: 'capitalize',
  },
  addressText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  itemsCard: {
    backgroundColor: Colors.background.primary,
    padding: 16,
    marginBottom: 12,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  itemsList: {
    marginTop: 16,
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  paymentCard: {
    backgroundColor: Colors.background.primary,
    padding: 16,
    marginBottom: 12,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text.primary,
  },
  discountText: {
    color: Colors.status.success,
  },
  paymentDivider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 12,
  },
  paymentTotalLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  paymentTotalValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  paymentNote: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 8,
  },
  metaCard: {
    backgroundColor: Colors.background.primary,
    padding: 16,
    marginBottom: 12,
  },
  metaTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text.primary,
  },
  bottomSpacer: {
    height: 100,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    minHeight: 80,
  },
  bottomBarLeft: {
    flex: 1,
  },
  bottomBarLabel: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginBottom: 4,
  },
  bottomBarValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  bottomBarRight: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.brand.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.inverse,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: Colors.status.error,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.status.error,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: Colors.brand.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.inverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 24,
  },
  modalOtp: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: Colors.brand.primary,
    letterSpacing: 8,
    marginBottom: 16,
  },
  modalInstruction: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: Colors.brand.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.inverse,
  },
});
