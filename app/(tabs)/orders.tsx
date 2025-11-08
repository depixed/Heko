import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useOrders } from '@/contexts/OrderContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/types/database';

type OrderStatus = Database['public']['Tables']['orders']['Row']['status'];

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orders, isLoadingOrders, refreshOrders } = useOrders();
  const { isAuthenticated } = useAuth();

  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated) {
        refreshOrders();
      }
    }, [isAuthenticated, refreshOrders])
  );

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

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {!isAuthenticated ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔒</Text>
            <Text style={styles.emptyTitle}>Login Required</Text>
            <Text style={styles.emptySubtitle}>Please login to view your orders</Text>
            <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/auth')}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          </View>
        ) : isLoadingOrders ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.brand.primary} />
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>Start shopping to see your orders here</Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {orders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => router.push(`/order/${order.id}` as any)}
              >
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>Order #: {order.order_number}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                    <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
                  </View>
                </View>

                <View style={styles.orderItems}>
                  {(order.order_items || []).slice(0, 2).map((item, index) => {
                    // Validate and sanitize image URL
                    const getImageUri = () => {
                      const imageUrl = item.product_image;
                      
                      // Debug: Log the actual image URL
                      console.log('[Orders] Product image URL:', imageUrl, 'for product:', item.product_name);
                      
                      // Check if imageUrl is valid (not empty, null, undefined)
                      if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
                        console.warn('[Orders] Empty or invalid image URL, using fallback');
                        return null; // Return null to show placeholder component
                      }
                      
                      // Check if it's a valid HTTP/HTTPS URL (including Supabase storage URLs)
                      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                        // Additional validation: ensure it's not a blob URL or localhost
                        if (imageUrl.startsWith('blob:') || imageUrl.includes('localhost')) {
                          console.warn('[Orders] Blob or localhost URL detected, using fallback');
                          return null;
                        }
                        console.log('[Orders] Using valid image URL:', imageUrl);
                        return imageUrl;
                      }
                      
                      // If it's a local file path or invalid, return null for placeholder
                      console.warn('[Orders] Invalid URL format, using fallback');
                      return null;
                    };

                    const imageUri = getImageUri();

                    return (
                      <View key={index} style={styles.orderItem}>
                        {imageUri ? (
                          <Image 
                            source={{ uri: imageUri }} 
                            style={styles.itemImage}
                            onError={(error) => {
                              console.error('[Orders] Image load failed for URL:', imageUri, 'Error:', error.nativeEvent.error);
                            }}
                            onLoad={() => {
                              console.log('[Orders] Image loaded successfully:', imageUri);
                            }}
                          />
                        ) : (
                          <View style={styles.itemImagePlaceholder}>
                            <Text style={styles.itemImagePlaceholderText}>
                              {item.product_name?.charAt(0).toUpperCase() || '?'}
                            </Text>
                          </View>
                        )}
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName} numberOfLines={1}>{item.product_name || 'Product'}</Text>
                          <Text style={styles.itemQuantity}>Qty: {item.quantity} • {item.status}</Text>
                        </View>
                      </View>
                    );
                  })}
                  {(order.order_items?.length || 0) > 2 && (
                    <Text style={styles.moreItems}>+{(order.order_items?.length || 0) - 2} more items</Text>
                  )}
                </View>

                <View style={styles.orderFooter}>
                  <View>
                    <Text style={styles.orderDate}>
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.orderTotal}>₹{order.total.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.viewDetails}>View Details →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: 20,
    backgroundColor: Colors.brand.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  loginButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  ordersList: {
    padding: 16,
    gap: 16,
  },
  orderCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text.inverse,
  },
  orderItems: {
    marginBottom: 12,
    gap: 8,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.background.secondary,
  },
  itemImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  itemImagePlaceholderText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text.tertiary,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text.primary,
  },
  itemQuantity: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  moreItems: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  orderDate: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginTop: 2,
  },
  viewDetails: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.brand.primary,
  },
});
