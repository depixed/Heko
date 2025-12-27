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
        
        // Load wallet data
        try {
          console.log('[AuthContext] Loading wallet data for user:', sessionResult.user.id);
          const balanceResult = await walletService.getWalletBalance(sessionResult.user.id);
          if (balanceResult.success && balanceResult.data) {
            const transactionsResult = await walletService.getTransactions(sessionResult.user.id, { limit: 50 });
            
            const dbTransactions = transactionsResult.success && transactionsResult.data ? transactionsResult.data : [];
            const appTransactions: WalletTransaction[] = dbTransactions
              .filter(txn => txn && txn.id)
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
              .filter(Boolean) as WalletTransaction[];

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

        // Load referral stats
        try {
          console.log('[AuthContext] Loading referral stats for user:', sessionResult.user.id);
          
          // Query referral_conversions to get unique referee IDs (friends joined)
          // This is the source of truth for referral relationships
          const { data: conversions, error: conversionsError } = await supabase
            .from('referral_conversions')
            .select('referee_id')
            .eq('referrer_id', sessionResult.user.id);
          
          // Get unique referee IDs
          const refereeIds = conversions && conversions.length > 0
            ? [...new Set(conversions.map((c: any) => c.referee_id).filter(Boolean))]
            : [];
          
          // Also query profiles to verify (for debugging)
          const { data: referredUsers } = await supabase
            .from('profiles')
            .select('id, created_at')
            .eq('referred_by', sessionResult.user.id);

          // Query orders to find active shoppers (referred users who placed orders this month)
          const now = new Date();
          const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          thisMonthStart.setHours(0, 0, 0, 0);
          
          // Use refereeIds from conversions for active shoppers query
          const referredUserIds = refereeIds;
          let activeShopperIds: string[] = [];
          if (referredUserIds.length > 0) {
            const { data: thisMonthOrders, error: ordersError } = await supabase
              .from('orders')
              .select('user_id')
              .in('user_id', referredUserIds)
              .gte('created_at', thisMonthStart.toISOString());
            
            activeShopperIds = [...new Set((thisMonthOrders || []).map((o: any) => o.user_id))];
          }

          // Query wallet transactions for earnings (conversions from virtual to actual)
          const { data: walletTransactions, error: walletTxnError } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('user_id', sessionResult.user.id)
            .eq('kind', 'referral_reward')
            .eq('wallet_type', 'actual')
            .eq('transaction_type', 'credit')
            .order('created_at', { ascending: false });

          // Get user registration date for lifetime earnings calculation
          const { data: userProfile, error: userProfileError } = await supabase
            .from('profiles')
            .select('created_at')
            .eq('id', sessionResult.user.id)
            .single();

          // Calculate stats - use refereeIds from conversions (source of truth)
          const totalReferred = refereeIds.length;
          const activeReferrers = activeShopperIds.length;
          
          let lifetimeEarnings = 0;
          let thisMonthEarnings = 0;
          
          if (walletTransactions && walletTransactions.length > 0) {
            const userCreatedAt = userProfile?.created_at ? new Date(userProfile.created_at) : null;
            
            lifetimeEarnings = walletTransactions.reduce((sum: number, txn: any) => {
              const txnDate = new Date(txn.created_at);
              if (userCreatedAt && txnDate >= userCreatedAt) {
                return sum + (Number(txn.amount) || 0);
              }
              return sum;
            }, 0);

            thisMonthEarnings = walletTransactions.reduce((sum: number, txn: any) => {
              const txnDate = new Date(txn.created_at);
              if (txnDate >= thisMonthStart) {
                return sum + (Number(txn.amount) || 0);
              }
              return sum;
            }, 0);
          }

          setReferralStats({
            totalReferred,
            activeReferrers,
            lifetimeEarnings,
            thisMonthEarnings,
            convertedThisMonth: 0,
            lifetimeConverted: 0,
            referrals: [],
          });
          console.log('[AuthContext] Referral stats loaded:', lifetimeEarnings);
        } catch (error) {
          console.error('[AuthContext] Error loading referral stats:', error);
        }
        
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

  const refreshReferralStats = useCallback(async (userId: string) => {
    try {
      console.log('[AuthContext] ===== REFRESHING REFERRAL STATS =====');
      console.log('[AuthContext] User ID:', userId);
      
      // Load referral conversions - this is the source of truth for earnings
      const { data: conversions, error: conversionsError } = await supabase
        .from('referral_conversions')
        .select('*')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });

      if (conversionsError) {
        console.error('[AuthContext] Error loading referral conversions:', conversionsError);
      }

      console.log('[AuthContext] Total conversions found:', conversions?.length || 0);
      if (conversions && conversions.length > 0) {
        console.log('[AuthContext] Sample conversion data:', JSON.stringify(conversions[0], null, 2));
      }

      // Get unique referee IDs from conversions (friends joined)
      const refereeIds = conversions && conversions.length > 0
        ? [...new Set(conversions.map((c: any) => c.referee_id).filter(Boolean))]
        : [];
      
      // Query orders to find active shoppers (referred users who placed orders this month)
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      thisMonthStart.setHours(0, 0, 0, 0);
      
      const referredUserIds = referredUsers?.map(u => u.id) || [];
      let activeShopperIds: string[] = [];
      if (referredUserIds.length > 0) {
        const { data: thisMonthOrders, error: ordersError } = await supabase
          .from('orders')
          .select('user_id')
          .in('user_id', referredUserIds)
          .gte('created_at', thisMonthStart.toISOString());
        
        activeShopperIds = [...new Set((thisMonthOrders || []).map((o: any) => o.user_id))];
      }

      // Query wallet transactions for earnings (conversions from virtual to actual)
      const { data: walletTransactions, error: walletTxnError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('kind', 'referral_reward')
        .eq('wallet_type', 'actual')
        .eq('transaction_type', 'credit')
        .order('created_at', { ascending: false });

      // Get user registration date for lifetime earnings calculation
      const { data: userProfile, error: userProfileError } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', userId)
        .single();

      // Calculate friends joined - use refereeIds from conversions (source of truth)
      const totalReferred = refereeIds.length;

      // Calculate active shoppers - referred users who placed orders this month
      const activeReferrers = activeShopperIds.length;

      // Calculate earnings from wallet_transactions (conversions from virtual to actual)
      let lifetimeEarnings = 0;
      let thisMonthEarnings = 0;
      
      if (walletTransactions && walletTransactions.length > 0) {
        const userCreatedAt = userProfile?.created_at ? new Date(userProfile.created_at) : null;
        
        // Calculate lifetime earnings - from user registration date until now
        lifetimeEarnings = walletTransactions.reduce((sum: number, txn: any) => {
          const txnDate = new Date(txn.created_at);
          if (userCreatedAt && txnDate >= userCreatedAt) {
            return sum + (Number(txn.amount) || 0);
          }
          return sum;
        }, 0);

        // Calculate this month earnings
        thisMonthEarnings = walletTransactions.reduce((sum: number, txn: any) => {
          const txnDate = new Date(txn.created_at);
          if (txnDate >= thisMonthStart) {
            return sum + (Number(txn.amount) || 0);
          }
          return sum;
        }, 0);
      }

      // Legacy calculations from conversions (for comparison)
      let convertedThisMonth = 0;
      let lifetimeConverted = 0;
      if (conversions) {
        const thisMonthConversions = conversions.filter((c: any) => new Date(c.created_at) >= thisMonthStart);
        convertedThisMonth = thisMonthConversions.length;
        lifetimeConverted = conversions.length;
      }

      setReferralStats({
        totalReferred,
        activeReferrers,
        lifetimeEarnings,
        thisMonthEarnings,
        convertedThisMonth,
        lifetimeConverted,
        referrals: [],
      });
      
      console.log('[AuthContext] ===== REFERRAL STATS REFRESHED =====');
      console.log('[AuthContext] Final stats:', {
        totalReferred,
        activeReferrers,
        lifetimeEarnings,
        thisMonthEarnings,
        convertedThisMonth,
        lifetimeConverted,
      });
    } catch (error) {
      console.error('[AuthContext] Error refreshing referral stats:', error);
    }
  }, []);

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

    const walletChannel = supabase
      .channel('wallet-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('[AuthContext] New wallet transaction:', payload.new);
          const transaction = payload.new as any;
          
          // Reload wallet data when new transaction occurs
          try {
            const balanceResult = await walletService.getWalletBalance(userId);
            if (balanceResult.success && balanceResult.data) {
              const transactionsResult = await walletService.getTransactions(userId, { limit: 50 });
              const dbTransactions = transactionsResult.success && transactionsResult.data ? transactionsResult.data : [];
              const appTransactions: WalletTransaction[] = dbTransactions
                .filter(txn => txn && txn.id)
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
                    return null;
                  }
                })
                .filter(Boolean) as WalletTransaction[];

              setWallet({
                virtualBalance: balanceResult.data.virtualBalance || 0,
                actualBalance: balanceResult.data.actualBalance || 0,
                transactions: appTransactions,
              });

              // Refresh referral stats if this is a referral reward transaction
              // Note: We now use referral_conversions table, but still refresh on wallet transaction
              // to ensure stats are updated when conversions happen
              if (transaction && 
                  transaction.kind === 'referral_reward' && 
                  transaction.wallet_type === 'actual' && 
                  transaction.transaction_type === 'credit') {
                console.log('[AuthContext] Referral reward transaction detected, refreshing stats');
                refreshReferralStats(userId);
              }
            }
          } catch (error) {
            console.error('[AuthContext] Error reloading wallet:', error);
          }
        }
      )
      .subscribe();

    // Subscribe to referral_conversions table changes
    const referralSubscription = supabase
      .channel(`referral-conversions-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'referral_conversions',
          filter: `referrer_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('[AuthContext] New referral conversion detected:', payload.new);
          console.log('[AuthContext] Refreshing referral stats due to new conversion');
          refreshReferralStats(userId);
        }
      )
      .subscribe();

    return () => {
      console.log('[AuthContext] Cleaning up real-time subscriptions');
      supabase.removeChannel(profileSubscription);
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(referralSubscription);
    };
  };

  const login = useCallback(async (userData: User, authToken: string) => {
    console.log('[AuthContext] Logging in user:', userData.id);
    setUser(userData);
    setToken(authToken);
    
    // Load wallet data
    try {
      console.log('[AuthContext] Loading wallet data for user:', userData.id);
      const balanceResult = await walletService.getWalletBalance(userData.id);
      if (balanceResult.success && balanceResult.data) {
        const transactionsResult = await walletService.getTransactions(userData.id, { limit: 50 });
        
        const dbTransactions = transactionsResult.success && transactionsResult.data ? transactionsResult.data : [];
        const appTransactions: WalletTransaction[] = dbTransactions
          .filter(txn => txn && txn.id)
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
          .filter(Boolean) as WalletTransaction[];

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

    // Load referral stats
    try {
      console.log('[AuthContext] ===== LOADING REFERRAL STATS =====');
      console.log('[AuthContext] User ID:', userData.id);
      
      // Query referral_conversions to get unique referee IDs (friends joined)
      // This is the source of truth for referral relationships
      const { data: conversions, error: conversionsError } = await supabase
        .from('referral_conversions')
        .select('referee_id')
        .eq('referrer_id', userData.id);
      
      // Get unique referee IDs
      const refereeIds = conversions && conversions.length > 0
        ? [...new Set(conversions.map((c: any) => c.referee_id).filter(Boolean))]
        : [];

      // Query orders to find active shoppers (referred users who placed orders this month)
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      thisMonthStart.setHours(0, 0, 0, 0);
      
      // Use refereeIds from conversions for active shoppers query
      const referredUserIds = refereeIds;
      let activeShopperIds: string[] = [];
      if (referredUserIds.length > 0) {
        const { data: thisMonthOrders, error: ordersError } = await supabase
          .from('orders')
          .select('user_id')
          .in('user_id', referredUserIds)
          .gte('created_at', thisMonthStart.toISOString());
        
        activeShopperIds = [...new Set((thisMonthOrders || []).map((o: any) => o.user_id))];
      }

      // Query wallet transactions for earnings (conversions from virtual to actual)
      const { data: walletTransactions, error: walletTxnError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userData.id)
        .eq('kind', 'referral_reward')
        .eq('wallet_type', 'actual')
        .eq('transaction_type', 'credit')
        .order('created_at', { ascending: false });

      // Get user registration date for lifetime earnings calculation
      const { data: userProfile, error: userProfileError } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', userData.id)
        .single();

      // Calculate stats - use refereeIds from conversions (source of truth)
      const totalReferred = refereeIds.length;
      const activeReferrers = activeShopperIds.length;
      
      let lifetimeEarnings = 0;
      let thisMonthEarnings = 0;
      
      if (walletTransactions && walletTransactions.length > 0) {
        const userCreatedAt = userProfile?.created_at ? new Date(userProfile.created_at) : null;
        
        lifetimeEarnings = walletTransactions.reduce((sum: number, txn: any) => {
          const txnDate = new Date(txn.created_at);
          if (userCreatedAt && txnDate >= userCreatedAt) {
            return sum + (Number(txn.amount) || 0);
          }
          return sum;
        }, 0);

        thisMonthEarnings = walletTransactions.reduce((sum: number, txn: any) => {
          const txnDate = new Date(txn.created_at);
          if (txnDate >= thisMonthStart) {
            return sum + (Number(txn.amount) || 0);
          }
          return sum;
        }, 0);
      }

      setReferralStats({
        totalReferred,
        activeReferrers,
        lifetimeEarnings,
        thisMonthEarnings,
        convertedThisMonth: 0,
        lifetimeConverted: 0,
        referrals: [],
      });
      
      console.log('[AuthContext] ===== REFERRAL STATS LOADED =====');
      console.log('[AuthContext] Final stats:', {
        totalReferred,
        activeReferrers,
        lifetimeEarnings,
        thisMonthEarnings,
      });
    } catch (error) {
      console.error('[AuthContext] Error loading referral stats:', error);
    }

    // Setup realtime subscriptions
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

    // If updating referredBy, just update local state (database already updated by addReferrer)
    if (updates.referredBy !== undefined) {
      const updatedUser: User = {
        ...user,
        ...updates,
      };
      setUser(updatedUser);
      console.log('[AuthContext] User referredBy updated successfully');
      return;
    }

    // For other fields (name, email), use updateProfile service
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
    // If user is logged in, sync with backend
    if (user?.id) {
      try {
        const { cartService } = await import('@/lib/cart.service');
        if (quantity <= 0) {
          const result = await cartService.removeFromCart(user.id, productId);
          if (result.success) {
            const newCart = cart.filter(item => item.product.id !== productId);
            setCart(newCart);
            await AsyncStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(newCart));
          }
        } else {
          const result = await cartService.updateCartItem(user.id, productId, quantity);
          if (result.success) {
            const newCart = cart.map(item => item.product.id === productId ? { ...item, quantity } : item);
            setCart(newCart);
            await AsyncStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(newCart));
          }
        }
      } catch (error) {
        console.error('[AuthContext] Error syncing cart with backend:', error);
        // Fallback to local update
        const newCart = quantity > 0
          ? cart.map(item => item.product.id === productId ? { ...item, quantity } : item)
          : cart.filter(item => item.product.id !== productId);
        setCart(newCart);
        await AsyncStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(newCart));
      }
    } else {
      // User not logged in, update local cart only
      const newCart = quantity > 0
        ? cart.map(item => item.product.id === productId ? { ...item, quantity } : item)
        : cart.filter(item => item.product.id !== productId);
      
      setCart(newCart);
      await AsyncStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(newCart));
    }
  }, [cart, user]);

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
