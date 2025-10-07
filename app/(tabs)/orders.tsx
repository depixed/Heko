import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { MOCK_ORDERS } from '@/mocks/data';
import { ORDER_STATUS } from '@/constants/config';

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const getStatusColor = (status: keyof typeof ORDER_STATUS) => {
    switch (status) {
      case 'DELIVERED':
        return Colors.status.success;
      case 'OUT_FOR_DELIVERY':
        return Colors.status.info;
      case 'CANCELED':
      case 'UNFULFILLABLE':
        return Colors.status.error;
      default:
        return Colors.status.warning;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {MOCK_ORDERS.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>Start shopping to see your orders here</Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {MOCK_ORDERS.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => router.push(`/order/${order.id}` as any)}
              >
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>Order #{order.id}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                    <Text style={styles.statusText}>{ORDER_STATUS[order.status]}</Text>
                  </View>
                </View>

                <View style={styles.orderItems}>
                  {order.items.slice(0, 2).map((item, index) => (
                    <View key={index} style={styles.orderItem}>
                      <Image source={{ uri: item.product.image }} style={styles.itemImage} />
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.product.name}</Text>
                        <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                      </View>
                    </View>
                  ))}
                  {order.items.length > 2 && (
                    <Text style={styles.moreItems}>+{order.items.length - 2} more items</Text>
                  )}
                </View>

                <View style={styles.orderFooter}>
                  <View>
                    <Text style={styles.orderDate}>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
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
