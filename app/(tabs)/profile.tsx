import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Wallet, Gift, MapPin, Bell, HelpCircle, FileText, LogOut, Trash2, ChevronRight, Edit3 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { APP_CONFIG } from '@/constants/config';
import React from "react";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, wallet, logout, isAuthenticated } = useAuth();
  const { unreadCount } = useNotifications();

  // Show login screen if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.loginPrompt}>
          <Text style={styles.loginEmoji}>👤</Text>
          <Text style={styles.loginTitle}>Login to Continue</Text>
          <Text style={styles.loginSubtitle}>Access your profile, wallet, and orders</Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/auth')}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/auth/' as any);
        }},
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          Alert.alert('Account Deletion', 'Your account deletion request has been submitted.');
        }},
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => router.push('/notifications' as any)}
          testID="notifications-button"
        >
          <Bell size={24} color={Colors.text.primary} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.profileCard} onPress={() => router.push('/profile/edit' as any)}>
          <View style={styles.avatar}>
            <User size={32} color={Colors.text.inverse} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
            <Text style={styles.profilePhone}>{user?.phone || '+91 XXXXXXXXXX'}</Text>
            <Text style={styles.profileReferral}>Referral ID: {user?.referralId || 'N/A'}</Text>
          </View>
          <View style={styles.editButton}>
            <Edit3 size={20} color={Colors.brand.primary} />
          </View>
        </TouchableOpacity>

        <View style={styles.walletSection}>
          <Text style={styles.sectionTitle}>My Wallets</Text>
          <TouchableOpacity style={styles.walletCard} onPress={() => router.push('/wallet' as any)}>
            <View style={styles.walletRow}>
              <View style={styles.walletInfo}>
                <View style={[styles.walletIcon, { backgroundColor: Colors.wallet.virtual }]}>
                  <Wallet size={20} color={Colors.text.inverse} />
                </View>
                <View>
                  <Text style={styles.walletLabel}>Virtual Wallet</Text>
                  <Text style={styles.walletSubtext}>Cashback from purchases</Text>
                </View>
              </View>
              <Text style={styles.walletAmount}>₹{wallet.virtualBalance.toFixed(2)}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.walletCard} onPress={() => router.push('/wallet' as any)}>
            <View style={styles.walletRow}>
              <View style={styles.walletInfo}>
                <View style={[styles.walletIcon, { backgroundColor: Colors.wallet.actual }]}>
                  <Wallet size={20} color={Colors.text.inverse} />
                </View>
                <View>
                  <Text style={styles.walletLabel}>Actual Wallet</Text>
                  <Text style={styles.walletSubtext}>Referral earnings & refunds</Text>
                </View>
              </View>
              <Text style={styles.walletAmount}>₹{wallet.actualBalance.toFixed(2)}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <MenuItem
            icon={<Gift size={20} color={Colors.brand.primary} />}
            title="Refer & Earn"
            subtitle={`Get ${APP_CONFIG.REFERRAL.COMMISSION_PERCENTAGE}% on every order`}
            onPress={() => router.push('/referral' as any)}
          />
          <MenuItem
            icon={<MapPin size={20} color={Colors.brand.primary} />}
            title="My Addresses"
            onPress={() => router.push('/addresses' as any)}
          />
          <MenuItem
            icon={<Bell size={20} color={Colors.brand.primary} />}
            title="Notifications"
            badge={unreadCount > 0 ? unreadCount : undefined}
            onPress={() => router.push('/notifications' as any)}
          />
          <MenuItem
            icon={<HelpCircle size={20} color={Colors.brand.primary} />}
            title="Help & Support"
            onPress={() => {}}
          />
          <MenuItem
            icon={<FileText size={20} color={Colors.brand.primary} />}
            title="Terms & Privacy"
            onPress={() => {}}
          />
        </View>

        <View style={styles.section}>
          <MenuItem
            icon={<LogOut size={20} color={Colors.status.error} />}
            title="Logout"
            onPress={handleLogout}
            showChevron={false}
          />
          <MenuItem
            icon={<Trash2 size={20} color={Colors.status.error} />}
            title="Delete Account"
            onPress={handleDeleteAccount}
            showChevron={false}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Version {APP_CONFIG.APP_VERSION}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: number;
  onPress: () => void;
  showChevron?: boolean;
}

function MenuItem({ icon, title, subtitle, badge, onPress, showChevron = true }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <View style={styles.menuIcon}>
          {icon}
          {badge !== undefined && badge > 0 && (
            <View style={styles.menuBadge}>
              <Text style={styles.menuBadgeText}>{badge > 99 ? '99+' : badge}</Text>
            </View>
          )}
        </View>
        <View>
          <Text style={styles.menuTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {showChevron && <ChevronRight size={20} color={Colors.text.tertiary} />}
    </TouchableOpacity>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  loginPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loginEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
  },
  badge: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    backgroundColor: Colors.brand.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: Colors.background.primary,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.text.inverse,
  },
  content: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    margin: 16,
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  profileReferral: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  walletCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    padding: 16,
    marginBottom: 12,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  walletSubtext: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  walletAmount: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
  },
  menuBadge: {
    position: 'absolute' as const,
    top: -2,
    right: -2,
    backgroundColor: Colors.brand.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  menuBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: Colors.text.inverse,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text.primary,
  },
  menuSubtitle: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
});
