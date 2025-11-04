import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import type { User, Wallet, ReferralStats, Address, CartItem, WalletTransaction } from '@/types';
import { authService } from '@/lib/auth.service';
import { walletService } from '@/lib/wallet.service';
import { supabase } from '@/lib/supabase';

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
    virtualBalance: 0,
    actualBalance: 0,
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

  const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  const loadStoredData = async () => {
    try {
      console.log('[AuthContext] Loading stored data');
      const [storedCart] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CART),
      ]);

      if (storedCart) setCart(JSON.parse(storedCart));

      const sessionResult = await authService.getStoredSession();
      if (sessionResult && sessionResult.user && sessionResult.token) {
        if (!isValidUUID(sessionResult.user.id)) {
          console.log('[AuthContext] Invalid user ID format (not UUID), skipping Supabase data loading');
          setUser(sessionResult.user);
          setToken(sessionResult.token);
          setIsLoading(false);
          return;
        }
        
        console.log('[AuthContext] Found stored session, loading profile');
        setUser(sessionResult.user);
        setToken(sessionResult.token);
        
        await loadWalletData(sessionResult.user.id);
        await loadReferralStats(sessionResult.user.id);
        
        setupRealtimeSubscriptions(sessionResult.user.id);
      } else {
        console.log('[AuthContext] No stored session found');
      }
    } catch (error) {
      console.error('[AuthContext] Error loading stored data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWalletData = async (userId: string) => {
    try {
      console.log('[AuthContext] Loading wallet data for user:', userId);
      const balanceResult = await walletService.getWalletBalance(userId);
      if (balanceResult.success && balanceResult.data) {
        const transactionsResult = await walletService.getTransactions(userId, { limit: 50 });
        
        const dbTransactions = transactionsResult.success && transactionsResult.data ? transactionsResult.data : [];
        const appTransactions: WalletTransaction[] = dbTransactions
          .filter(txn => txn && txn.id) // Filter out invalid transactions
          .map(txn => {
            try {
              return {
                id: txn.id,
                type: (txn.type || 'CASHBACK').toUpperCase() as keyof typeof import('@/constants/config').WALLET_TRANSACTION_TYPES,
                amount: txn.amount || 0,
                walletType: txn.wallet_type || 'virtual',
                direction: ((txn as any).transaction_type || (txn as any).direction || 'CREDIT').toUpperCase() as 'CREDIT' | 'DEBIT',
                kind: (txn.kind || 'CASHBACK').toUpperCase() as 'CASHBACK' | 'REFERRAL_REWARD' | 'REFUND' | 'ORDER_PAYMENT' | 'ADJUSTMENT',
                orderId: txn.order_id || undefined,
                refereeUserId: txn.referee_user_id || undefined,
                conversionId: txn.conversion_id || undefined,
                description: txn.description || '',
                timestamp: txn.created_at || new Date().toISOString(),
                balanceAfter: txn.balance_after || 0,
              };
            } catch (error) {
              console.warn('[AuthContext] Error processing transaction:', txn, error);
              return null;
            }
          })
          .filter(Boolean) as WalletTransaction[]; // Remove null entries

        setWallet({
          virtualBalance: balanceResult.data.virtualBalance || 0,
          actualBalance: balanceResult.data.actualBalance || 0,
          transactions: appTransactions,
        });
        console.log('[AuthContext] Wallet loaded:', balanceResult.data.virtualBalance, balanceResult.data.actualBalance);
      }
    } catch (error) {
      console.error('[AuthContext] Error loading wallet:', error);
    }
  };

  const loadReferralStats = async (userId: string) => {
    try {
      console.log('[AuthContext] Loading referral stats for user:', userId);
      const { data: conversions } = await supabase
        .from('referral_conversions')
        .select('*')
        .eq('referrer_user_id', userId)
        .order('created_at', { ascending: false });

      if (conversions) {
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        const thisMonthConversions = conversions.filter((c: any) => new Date(c.created_at) >= thisMonth);
        const lifetimeEarnings = conversions.reduce((sum: number, c: any) => sum + ((c.conversion_amount || 0)), 0);
        const thisMonthEarnings = thisMonthConversions.reduce((sum: number, c: any) => sum + ((c.conversion_amount || 0)), 0);

        setReferralStats({
          totalReferred: conversions.length,
          activeReferrers: conversions.length,
          lifetimeEarnings,
          thisMonthEarnings,
          convertedThisMonth: thisMonthConversions.length,
          lifetimeConverted: conversions.length,
          referrals: [],
        });
        console.log('[AuthContext] Referral stats loaded:', lifetimeEarnings);
      }
    } catch (error) {
      console.error('[AuthContext] Error loading referral stats:', error);
    }
  };

  const setupRealtimeSubscriptions = (userId: string) => {
    console.log('[AuthContext] Setting up real-time subscriptions for user:', userId);
    
    const profileSubscription = supabase
      .channel(`profile-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('[AuthContext] Profile updated:', payload.new);
          const profile = payload.new as any;
          if (profile) {
            setUser((prev) => prev ? {
              ...prev,
              name: profile.name,
              email: profile.email,
              phone: profile.phone,
            } : null);
            setWallet((prev) => ({
              ...prev,
              virtualBalance: profile.virtual_wallet || 0,
              actualBalance: profile.actual_wallet || 0,
            }));
          }
        }
      )
      .subscribe();

    const walletSubscription = supabase
      .channel(`wallet-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[AuthContext] New wallet transaction:', payload.new);
          loadWalletData(userId);
        }
      )
      .subscribe();

    return () => {
      profileSubscription.unsubscribe();
      walletSubscription.unsubscribe();
    };
  };

  const login = useCallback(async (userData: User, authToken: string) => {
    console.log('[AuthContext] Logging in user:', userData.id);
    setUser(userData);
    setToken(authToken);
    
    await loadWalletData(userData.id);
    await loadReferralStats(userData.id);
    setupRealtimeSubscriptions(userData.id);
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
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user) return;
    console.log('[AuthContext] Updating user profile:', updates);
    const result = await authService.updateProfile(user.id, updates);
    if (result.success) {
      const updatedUser: User = {
        ...user,
        ...updates,
      };
      setUser(updatedUser);
      console.log('[AuthContext] User profile updated successfully');
    }
  }, [user]);

  const updateWallet = useCallback(async (newWallet: Wallet) => {
    console.log('[AuthContext] Updating wallet (local only)');
    setWallet(newWallet);
  }, []);

  const updateReferralStats = useCallback(async (newStats: ReferralStats) => {
    console.log('[AuthContext] Updating referral stats (local only)');
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
