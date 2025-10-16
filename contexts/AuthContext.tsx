import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import type { User, Wallet, ReferralStats, Address, CartItem, WalletTransaction } from '@/types';
import { authService } from '@/lib/auth.service';
import { walletService } from '@/lib/wallet.service';
import type { Database } from '@/types/database';

type WalletTransactionRow = Database['public']['Tables']['wallet_transactions']['Row'];

function convertDbTransactionToWalletTransaction(dbTxn: WalletTransactionRow): WalletTransaction {
  return {
    id: dbTxn.id,
    type: dbTxn.type as any,
    amount: dbTxn.amount / 100,
    walletType: dbTxn.wallet_type,
    direction: dbTxn.direction === 'credit' ? 'CREDIT' : 'DEBIT',
    kind: dbTxn.kind.toUpperCase() as any,
    orderId: dbTxn.order_id || undefined,
    refereeUserId: dbTxn.referee_user_id || undefined,
    conversionId: dbTxn.conversion_id || undefined,
    description: dbTxn.description,
    timestamp: dbTxn.created_at,
    balanceAfter: dbTxn.balance_after / 100,
  };
}

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
      console.log('[AuthContext] Loading stored data...');
      const session = await authService.getStoredSession();
      
      if (!session) {
        console.log('[AuthContext] No session found');
        setIsLoading(false);
        return;
      }

      console.log('[AuthContext] Session found, loading user data:', session.user.id);
      setUser(session.user);
      setToken(session.token);

      const profileResult = await authService.getProfile(session.user.id);
      if (profileResult.success && profileResult.profile) {
        const profile = profileResult.profile;
        
        const walletData: Wallet = {
          virtualBalance: profile.virtual_wallet,
          actualBalance: profile.actual_wallet,
          transactions: [],
        };
        setWallet(walletData);

        const walletResult = await walletService.getTransactions(session.user.id, { limit: 50 });
        if (walletResult.success && walletResult.data) {
          walletData.transactions = walletResult.data.map(convertDbTransactionToWalletTransaction);
          setWallet({ ...walletData });
        }
      }

      const [storedAddresses, storedCart] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ADDRESSES),
        AsyncStorage.getItem(STORAGE_KEYS.CART),
      ]);
      
      if (storedAddresses) setAddresses(JSON.parse(storedAddresses));
      if (storedCart) setCart(JSON.parse(storedCart));
    } catch (error) {
      console.error('[AuthContext] Error loading stored data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (userData: User, authToken: string) => {
    console.log('[AuthContext] Login user:', userData.id);
    setUser(userData);
    setToken(authToken);
    
    const profileResult = await authService.getProfile(userData.id);
    if (profileResult.success && profileResult.profile) {
      const profile = profileResult.profile;
      
      const walletData: Wallet = {
        virtualBalance: profile.virtual_wallet,
        actualBalance: profile.actual_wallet,
        transactions: [],
      };
      setWallet(walletData);

      const walletResult = await walletService.getTransactions(userData.id, { limit: 50 });
      if (walletResult.success && walletResult.data) {
        walletData.transactions = walletResult.data.map(convertDbTransactionToWalletTransaction);
        setWallet({ ...walletData });
      }
    }
  }, []);

  const logout = useCallback(async () => {
    console.log('[AuthContext] Logging out');
    await authService.logout();
    setUser(null);
    setToken(null);
    setWallet({
      virtualBalance: 0,
      actualBalance: 0,
      transactions: [],
    });
    setReferralStats({
      totalReferred: 0,
      activeReferrers: 0,
      lifetimeEarnings: 0,
      thisMonthEarnings: 0,
      convertedThisMonth: 0,
      lifetimeConverted: 0,
      referrals: [],
    });
    setAddresses([]);
    setCart([]);
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ADDRESSES,
      STORAGE_KEYS.CART,
    ]);
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user) return;
    
    const result = await authService.updateProfile(user.id, {
      name: updates.name,
      email: updates.email,
    });

    if (result.success) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
    }
  }, [user]);

  const updateWallet = useCallback(async (newWallet: Wallet) => {
    setWallet(newWallet);
  }, []);

  const updateReferralStats = useCallback(async (newStats: ReferralStats) => {
    setReferralStats(newStats);
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
