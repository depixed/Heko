import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, ShoppingCart, MapPin } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';

interface TopNavProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  showAddress?: boolean;
  addressLabel?: string;
  addressValue?: string;
  onAddressPress?: () => void;
  headerRight?: () => React.ReactNode;
}

export default function TopNav({ 
  title, 
  showBackButton, 
  onBackPress,
  showAddress,
  addressLabel,
  addressValue,
  onAddressPress,
  headerRight
}: TopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { wallet, cartItemCount } = useAuth();
  const { unreadCount } = useNotifications();

  // Determine if back button should be shown
  const canGoBack = router.canGoBack();
  const shouldShowBack = showBackButton !== undefined ? showBackButton : canGoBack;

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (canGoBack) {
      router.back();
    }
  };

  const totalBalance = (wallet.virtualBalance + wallet.actualBalance).toFixed(2);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Left: Back Button and/or Title or Address */}
        <View style={styles.leftSection}>
          {shouldShowBack && (
            <TouchableOpacity
              onPress={handleBackPress}
              style={styles.backButton}
              testID="top-nav-back-button"
            >
              <ChevronLeft size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          )}
          {showAddress ? (
            <TouchableOpacity 
              style={styles.addressButton} 
              onPress={onAddressPress || (() => router.push('/addresses' as any))}
            >
              <MapPin size={20} color={Colors.brand.primary} />
              <View style={styles.addressText}>
                <Text style={styles.addressLabel}>{addressLabel || 'Deliver to'}</Text>
                <Text style={styles.addressValue} numberOfLines={1}>
                  {addressValue || 'Add Address'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : title ? (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>

        {/* Right: Custom headerRight or Wallet, Notifications, Cart */}
        <View style={styles.rightSection}>
          {headerRight ? (
            headerRight()
          ) : (
            <>
              {/* Wallet Badge */}
              <TouchableOpacity
                style={styles.walletBadge}
                onPress={() => router.push('/wallet' as any)}
                testID="top-nav-wallet-button"
              >
                <Text style={styles.walletText}>₹{totalBalance}</Text>
              </TouchableOpacity>

              {/* Notifications Icon */}
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.push('/notifications' as any)}
                testID="top-nav-notifications-button"
              >
                <Bell size={24} color={Colors.text.primary} />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Cart Icon */}
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.push('/cart' as any)}
                testID="top-nav-cart-button"
              >
                <ShoppingCart size={24} color={Colors.text.primary} />
                {cartItemCount > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    ...Platform.select({
      ios: {
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    flex: 1,
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
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  iconButton: {
    position: 'relative' as const,
    padding: 4,
  },
  notificationBadge: {
    position: 'absolute' as const,
    top: -2,
    right: -2,
    backgroundColor: Colors.brand.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.background.primary,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.text.inverse,
  },
  cartBadge: {
    position: 'absolute' as const,
    top: -2,
    right: -2,
    backgroundColor: Colors.status.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.background.primary,
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.text.inverse,
  },
});
