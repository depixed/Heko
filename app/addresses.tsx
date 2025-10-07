import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Home, Briefcase, MapPin, MoreVertical } from 'lucide-react-native';
import { useAddresses } from '@/contexts/AddressContext';
import Colors from '@/constants/colors';
import type { Address } from '@/types';

export default function AddressesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { addresses, isLoading, deleteAddress, setDefaultAddress } = useAddresses();
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  
  const isSelectionMode = params.from === 'cart' || params.from === 'checkout';

  const handleCall = (phone: string) => {
    const cleanPhone = phone.replace(/\s/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const handleSetDefault = async (id: string) => {
    await setDefaultAddress(id);
    setMenuVisible(null);
    if (isSelectionMode) {
      router.back();
    }
  };
  
  const handleSelectAddress = async (id: string) => {
    if (isSelectionMode) {
      await setDefaultAddress(id);
      router.back();
    }
  };

  const handleEdit = (id: string) => {
    setMenuVisible(null);
    router.push(`/address/edit/${id}` as any);
  };

  const handleDelete = (id: string, isDefault: boolean) => {
    setMenuVisible(null);
    
    if (addresses.length === 1) {
      Alert.alert(
        'Cannot Delete',
        'You must have at least one address.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete this address?',
      "You won't be able to deliver to this address unless you add it again.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteAddress(id);
          },
        },
      ]
    );
  };

  const getAddressIcon = (type: Address['type']) => {
    switch (type) {
      case 'home':
        return <Home size={20} color={Colors.brand.primary} />;
      case 'work':
        return <Briefcase size={20} color={Colors.brand.primary} />;
      default:
        return <MapPin size={20} color={Colors.brand.primary} />;
    }
  };

  const getAddressLabel = (address: Address) => {
    if (address.type === 'other' && address.otherLabel) {
      return address.otherLabel;
    }
    return address.type.charAt(0).toUpperCase() + address.type.slice(1);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.brand.primary} />
      </View>
    );
  }

  if (addresses.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MapPin size={80} color={Colors.text.tertiary} />
        <Text style={styles.emptyTitle}>No addresses yet</Text>
        <Text style={styles.emptySubtitle}>
          Add your delivery address to get started
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/address/add' as any)}
        >
          <Text style={styles.addButtonText}>Add New Address</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {addresses.map((address) => (
          <TouchableOpacity
            key={address.id}
            style={styles.addressCard}
            activeOpacity={0.7}
            onPress={() => handleSelectAddress(address.id)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                {getAddressIcon(address.type)}
              </View>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => setMenuVisible(menuVisible === address.id ? null : address.id)}
              >
                <MoreVertical size={20} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {menuVisible === address.id && (
              <View style={styles.menu}>
                {!address.isDefault && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleSetDefault(address.id)}
                  >
                    <Text style={styles.menuItemText}>Set as Default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleEdit(address.id)}
                >
                  <Text style={styles.menuItemText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.menuItem, styles.menuItemLast]}
                  onPress={() => handleDelete(address.id, address.isDefault)}
                >
                  <Text style={[styles.menuItemText, styles.menuItemDanger]}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.cardContent}>
              <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="tail">
                {address.flat}, {address.area}, {address.city}
              </Text>
              <Text style={styles.nameText}>{address.name}</Text>
              <TouchableOpacity onPress={() => handleCall(address.phone)}>
                <Text style={styles.phoneText}>{address.phone}</Text>
              </TouchableOpacity>

              <View style={styles.badgeContainer}>
                {address.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                )}
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{getAddressLabel(address)}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/address/add' as any)}
        >
          <Text style={styles.addButtonText}>Add New Address</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.background.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  addressCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEE0C2',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  menuButton: {
    padding: 4,
  },
  menu: {
    position: 'absolute' as const,
    top: 50,
    right: 16,
    backgroundColor: Colors.background.primary,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    minWidth: 160,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500' as const,
  },
  menuItemDanger: {
    color: Colors.status.error,
  },
  cardContent: {
    gap: 6,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  nameText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  phoneText: {
    fontSize: 14,
    color: Colors.brand.primary,
    textDecorationLine: 'underline' as const,
  },
  badgeContainer: {
    flexDirection: 'row' as const,
    gap: 8,
    marginTop: 8,
  },
  defaultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.brand.primary,
  },
  defaultBadgeText: {
    fontSize: 12,
    color: Colors.brand.primary,
    fontWeight: '600' as const,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.background.tertiary,
  },
  typeBadgeText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '500' as const,
  },
  bottomBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  addButton: {
    backgroundColor: Colors.brand.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  addButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
