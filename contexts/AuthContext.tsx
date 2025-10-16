import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import type { User, Wallet, ReferralStats, Address, CartItem } from '@/types';
import { MOCK_REFERRAL_STATS, MOCK_WALLET_TRANSACTIONS } from '@/mocks/data';

const STORAGE_KEYS = {
  USER: '@heko_user',
  TOKEN: '@heko_token',
  WALLET: '@heko_wallet',
  REFERRAL_STATS: '@heko_referral_stats',
  ADDRESSES: '@heko_addresses',
  CART: '@heko_cart',
} as const;

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet>({
    virtualBalance: 4175,
    actualBalance: 555,
    transactions: [],
  });
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    totalReferred: 0,
    activeReferrers: 0,
    lifetimeEarnings: 0,
    thisMonthEarnings: 0,
    convertedThisMonth: 0,
    lifetimeConverted: 0,
    referrals: [],
  });
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      const [storedUser, storedToken, storedWallet, storedReferralStats, storedAddresses, storedCart] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER),
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.WALLET),
        AsyncStorage.getItem(STORAGE_KEYS.REFERRAL_STATS),
        AsyncStorage.getItem(STORAGE_KEYS.ADDRESSES),
        AsyncStorage.getItem(STORAGE_KEYS.CART),
      ]);

      if (storedUser) setUser(JSON.parse(storedUser));
      if (storedToken) setToken(storedToken);
      
      if (storedWallet) {
        setWallet(JSON.parse(storedWallet));
      } else {
        const initialWallet = {
          virtualBalance: 4175,
          actualBalance: 555,
          transactions: MOCK_WALLET_TRANSACTIONS,
        };
        setWallet(initialWallet);
        await AsyncStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify(initialWallet));
      }
      
      if (storedReferralStats) {
        setReferralStats(JSON.parse(storedReferralStats));
      } else {
        const initialStats = MOCK_REFERRAL_STATS;
        setReferralStats(initialStats);
        await AsyncStorage.setItem(STORAGE_KEYS.REFERRAL_STATS, JSON.stringify(initialStats));
      }
      
      if (storedAddresses) setAddresses(JSON.parse(storedAddresses));
      if (storedCart) setCart(JSON.parse(storedCart));
    } catch (error) {
      console.error('Error loading stored data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, authToken);
    
    if (!referralStats.totalReferred) {
      const initialStats = MOCK_REFERRAL_STATS;
      setReferralStats(initialStats);
      await AsyncStorage.setItem(STORAGE_KEYS.REFERRAL_STATS, JSON.stringify(initialStats));
    }
    
    if (wallet.transactions.length === 0) {
      const initialWallet = {
        virtualBalance: 4175,
        actualBalance: 555,
        transactions: MOCK_WALLET_TRANSACTIONS,
      };
      setWallet(initialWallet);
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify(initialWallet));
    }
  }, [referralStats.totalReferred, wallet.transactions.length]);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.multiRemove([STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN]);
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
  }, [user]);

  const updateWallet = useCallback(async (newWallet: Wallet) => {
    setWallet(newWallet);
    await AsyncStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify(newWallet));
  }, []);

  const updateReferralStats = useCallback(async (newStats: ReferralStats) => {
    setReferralStats(newStats);
    await AsyncStorage.setItem(STORAGE_KEYS.REFERRAL_STATS, JSON.stringify(newStats));
  }, []);

  const addAddress = useCallback(async (address: Address) => {
    const newAddresses = [...addresses, address];
    setAddresses(newAddresses);
    await AsyncStorage.setItem(STORAGE_KEYS.ADDRESSES, JSON.stringify(newAddresses));
  }, [addresses]);

  const updateAddress = useCallback(async (addressId: string, updates: Partial<Address>) => {
    const newAddresses = addresses.map(addr =>
      addr.id === addressId ? { ...addr, ...updates } : addr
    );
    setAddresses(newAddresses);
    await AsyncStorage.setItem(STORAGE_KEYS.ADDRESSES, JSON.stringify(newAddresses));
  }, [addresses]);

  const deleteAddress = useCallback(async (addressId: string) => {
    const newAddresses = addresses.filter(addr => addr.id !== addressId);
    setAddresses(newAddresses);
    await AsyncStorage.setItem(STORAGE_KEYS.ADDRESSES, JSON.stringify(newAddresses));
  }, [addresses]);

  const addToCart = useCallback(async (item: CartItem) => {
    const existingIndex = cart.findIndex(i => i.product.id === item.product.id);
    let newCart: CartItem[];
    
    if (existingIndex >= 0) {
      newCart = [...cart];
      newCart[existingIndex] = { ...newCart[existingIndex], quantity: newCart[existingIndex].quantity + item.quantity };
    } else {
      newCart = [...cart, item];
    }
    
    setCart(newCart);
    await AsyncStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(newCart));
  }, [cart]);

  const updateCartItem = useCallback(async (productId: string, quantity: number) => {
    const newCart = quantity > 0
      ? cart.map(item => item.product.id === productId ? { ...item, quantity } : item)
      : cart.filter(item => item.product.id !== productId);
    
    setCart(newCart);
    await AsyncStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(newCart));
  }, [cart]);

  const clearCart = useCallback(async () => {
    setCart([]);
    await AsyncStorage.removeItem(STORAGE_KEYS.CART);
  }, []);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0), [cart]);
  const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  return useMemo(() => ({
    user,
    token,
    wallet,
    referralStats,
    addresses,
    cart,
    cartTotal,
    cartItemCount,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    updateUser,
    updateWallet,
    updateReferralStats,
    addAddress,
    updateAddress,
    deleteAddress,
    addToCart,
    updateCartItem,
    clearCart,
  }), [
    user,
    token,
    wallet,
    referralStats,
    addresses,
    cart,
    cartTotal,
    cartItemCount,
    isLoading,
    login,
    logout,
    updateUser,
    updateWallet,
    updateReferralStats,
    addAddress,
    updateAddress,
    deleteAddress,
    addToCart,
    updateCartItem,
    clearCart,
  ]);
});
