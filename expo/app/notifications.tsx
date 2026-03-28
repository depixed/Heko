import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Filter, Search } from 'lucide-react-native';
import { useNotifications } from '@/contexts/NotificationContext';
import { Notification } from '@/types';
import colors from '@/constants/colors';
import TopNav from '@/components/TopNav';
import { handleDeepLink as handleDeepLinkRouter } from '@/utils/deepLinkRouter';
import { notificationAnalyticsService } from '@/lib/notificationAnalytics.service';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    notifications,
    unreadCount,
    searchQuery,
    setSearchQuery,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    notifications.forEach(notification => {
      const date = new Date(notification.createdAt);
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      let key: string;
      if (dateOnly.getTime() === today.getTime()) {
        key = 'Today';
      } else if (dateOnly.getTime() === yesterday.getTime()) {
        key = 'Yesterday';
      } else {
        key = date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(notification);
    });

    return groups;
  }, [notifications]);

  const handleNotificationPress = (notification: Notification) => {
    console.log('[Notifications] Notification pressed:', notification.id);
    if (!notification.read) {
      markAsRead(notification.id);
    }
    // Track click analytics (fire and forget - don't block UI)
    notificationAnalyticsService.trackClicked(notification.id, notification.deeplink).catch((error) => {
      console.error('[Notifications] Error tracking click analytics:', error);
      // Continue execution - analytics is optional
    });
    handleDeepLink(notification.deeplink);
  };
  
  const handleDeepLink = (deeplink: string) => {
    console.log('[Notifications] Handling deeplink:', deeplink);
    // Use centralized deep link router
    handleDeepLinkRouter(deeplink, router);
  };

  const handleLongPress = (notificationId: string) => {
    console.log('[Notifications] Long press on notification:', notificationId);
    setSelectedNotification(notificationId);
    setShowActionMenu(true);
  };

  const handleMarkAsRead = () => {
    if (selectedNotification) {
      markAsRead(selectedNotification);
      setShowActionMenu(false);
      setSelectedNotification(null);
    }
  };

  const handleMarkAsUnread = () => {
    if (selectedNotification) {
      markAsUnread(selectedNotification);
      setShowActionMenu(false);
      setSelectedNotification(null);
    }
  };

  const handleDelete = () => {
    if (selectedNotification) {
      Alert.alert(
        'Delete Notification',
        'Are you sure you want to delete this notification?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteNotification(selectedNotification);
              setShowActionMenu(false);
              setSelectedNotification(null);
            },
          },
        ]
      );
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ORDERS':
        return '📦';
      case 'WALLET':
        return '💰';
      case 'REFERRALS':
        return '👥';
      case 'PROMOS':
        return '🎉';
      case 'SYSTEM':
        return '⚙️';
      default:
        return '🔔';
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <TopNav title="Notifications" />
      <View style={styles.actionsBar}>
        <TouchableOpacity
          onPress={() => setShowFilterSheet(true)}
          style={styles.iconButton}
          testID="filter-button"
        >
          <Filter size={20} color={colors.text.primary} />
        </TouchableOpacity>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={markAllAsRead}
            style={styles.markAllButton}
            testID="mark-all-read-button"
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchContainer}>
        <Search size={18} color={colors.text.tertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notifications"
          placeholderTextColor={colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          testID="search-input"
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {Object.keys(groupedNotifications).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptySubtitle}>New updates show up here</Text>
          </View>
        ) : (
          Object.entries(groupedNotifications).map(([date, items]) => (
            <View key={date} style={styles.dateGroup}>
              <View style={styles.dateHeader}>
                <Text style={styles.dateText}>{date}</Text>
              </View>
              {items.map((notification, index) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onPress={() => handleNotificationPress(notification)}
                  onLongPress={() => handleLongPress(notification.id)}
                  formatTime={formatTime}
                  getIcon={getNotificationIcon}
                  isLast={index === items.length - 1}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showActionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionMenu(false)}
        >
          <View style={styles.actionMenu}>
            {selectedNotification &&
              !notifications.find(n => n.id === selectedNotification)?.read ? (
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={handleMarkAsRead}
                testID="mark-read-action"
              >
                <Text style={styles.actionMenuText}>Mark as read</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={handleMarkAsUnread}
                testID="mark-unread-action"
              >
                <Text style={styles.actionMenuText}>Mark as unread</Text>
              </TouchableOpacity>
            )}
            <View style={styles.actionMenuDivider} />
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={handleDelete}
              testID="delete-action"
            >
              <Text style={[styles.actionMenuText, styles.actionMenuTextDanger]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <FilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
      />
    </View>
  );
}

interface NotificationRowProps {
  notification: Notification;
  onPress: () => void;
  onLongPress: () => void;
  formatTime: (timestamp: string) => string;
  getIcon: (type: string) => string;
  isLast: boolean;
}

const NotificationRow = React.memo<NotificationRowProps>(function NotificationRow({ notification, onPress, onLongPress, formatTime, getIcon, isLast }) {
    return (
      <TouchableOpacity
        style={[styles.notificationRow, isLast && styles.notificationRowLast]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        testID={`notification-${notification.id}`}
      >
        <View style={styles.notificationContent}>
          {!notification.read && <View style={styles.unreadDot} />}
          <View style={styles.notificationIcon}>
            <Text style={styles.notificationIconText}>{getIcon(notification.type)}</Text>
          </View>
          <View style={styles.notificationBody}>
            <Text
              style={[
                styles.notificationTitle,
                !notification.read && styles.notificationTitleUnread,
              ]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            <Text style={styles.notificationText} numberOfLines={2}>
              {notification.message}
            </Text>
          </View>
          <Text style={styles.notificationTime}>{formatTime(notification.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  }
);

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
}

function FilterSheet({ visible, onClose }: FilterSheetProps) {
  const { filters, updateFilters, resetFilters } = useNotifications();
  const [localFilters, setLocalFilters] = useState(filters);

  const handleApply = () => {
    console.log('[FilterSheet] Applying filters:', localFilters);
    updateFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    console.log('[FilterSheet] Resetting filters');
    resetFilters();
    setLocalFilters({
      types: ['ORDERS', 'WALLET', 'REFERRALS', 'PROMOS', 'SYSTEM'],
      unreadOnly: false,
      range: '30d',
    });
  };

  const toggleType = (type: string) => {
    const types = localFilters.types.includes(type as any)
      ? localFilters.types.filter(t => t !== type)
      : [...localFilters.types, type as any];
    setLocalFilters({ ...localFilters, types });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.filterOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.filterSheet}>
          <View style={styles.filterHandle} />
          <Text style={styles.filterTitle}>Filter Notifications</Text>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Types</Text>
            <View style={styles.filterChips}>
              {['ORDERS', 'WALLET', 'REFERRALS', 'PROMOS', 'SYSTEM'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterChip,
                    localFilters.types.includes(type as any) && styles.filterChipActive,
                  ]}
                  onPress={() => toggleType(type)}
                  testID={`filter-type-${type.toLowerCase()}`}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      localFilters.types.includes(type as any) &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Status</Text>
            <View style={styles.filterChips}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  !localFilters.unreadOnly && styles.filterChipActive,
                ]}
                onPress={() => setLocalFilters({ ...localFilters, unreadOnly: false })}
                testID="filter-status-all"
              >
                <Text
                  style={[
                    styles.filterChipText,
                    !localFilters.unreadOnly && styles.filterChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  localFilters.unreadOnly && styles.filterChipActive,
                ]}
                onPress={() => setLocalFilters({ ...localFilters, unreadOnly: true })}
                testID="filter-status-unread"
              >
                <Text
                  style={[
                    styles.filterChipText,
                    localFilters.unreadOnly && styles.filterChipTextActive,
                  ]}
                >
                  Unread only
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Time</Text>
            <View style={styles.filterChips}>
              {[
                { label: 'Today', value: 'today' },
                { label: 'Last 7 days', value: '7d' },
                { label: 'Last 30 days', value: '30d' },
              ].map(({ label, value }) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.filterChip,
                    localFilters.range === value && styles.filterChipActive,
                  ]}
                  onPress={() =>
                    setLocalFilters({ ...localFilters, range: value as any })
                  }
                  testID={`filter-time-${value}`}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      localFilters.range === value && styles.filterChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.filterResetButton}
              onPress={handleReset}
              testID="filter-reset-button"
            >
              <Text style={styles.filterResetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterApplyButton}
              onPress={handleApply}
              testID="filter-apply-button"
            >
              <Text style={styles.filterApplyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text.inverse,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  dateGroup: {
    marginTop: 16,
  },
  dateHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background.secondary,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text.secondary,
    textTransform: 'uppercase' as const,
  },
  notificationRow: {
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  notificationRowLast: {
    borderBottomWidth: 0,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.primary,
    position: 'absolute' as const,
    left: 4,
    top: 24,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIconText: {
    fontSize: 20,
  },
  notificationBody: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: colors.text.primary,
    marginBottom: 4,
  },
  notificationTitleUnread: {
    fontWeight: '700' as const,
  },
  notificationText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenu: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    minWidth: 200,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  actionMenuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  actionMenuText: {
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'center' as const,
  },
  actionMenuTextDanger: {
    color: colors.status.error,
  },
  actionMenuDivider: {
    height: 1,
    backgroundColor: colors.border.light,
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  filterHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border.medium,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 24,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 12,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  filterChipActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: colors.text.inverse,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  filterResetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
  },
  filterResetText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  filterApplyButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
  },
  filterApplyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.inverse,
  },
});
