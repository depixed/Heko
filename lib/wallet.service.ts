import { supabase } from './supabase';
import type { Database } from '@/types/database';

type WalletTransactionRow = Database['public']['Tables']['wallet_transactions']['Row'];
type WalletTransactionInsert = Database['public']['Tables']['wallet_transactions']['Insert'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
type ReferralConversionInsert = Database['public']['Tables']['referral_conversions']['Insert'];

export interface WalletBalance {
  virtualBalance: number;
  actualBalance: number;
}

export interface TransactionFilters {
  walletType?: 'virtual' | 'actual';
  kind?: WalletTransactionRow['kind'];
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export const walletService = {
  async getWalletBalance(userId: string): Promise<{ success: boolean; data?: WalletBalance; error?: string }> {
    try {
      console.log('[WALLET] Fetching wallet balance for user:', userId);

      const { data, error } = await supabase
        .from('profiles')
        .select('virtual_wallet, actual_wallet')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        console.error('[WALLET] Error fetching wallet balance:', error);
        return { success: false, error: 'Failed to fetch wallet balance' };
      }

      const balance: WalletBalance = {
        virtualBalance: (data as ProfileRow).virtual_wallet,
        actualBalance: (data as ProfileRow).actual_wallet,
      };

      console.log('[WALLET] Wallet balance:', balance);
      return { success: true, data: balance };
    } catch (error) {
      console.error('[WALLET] Error fetching wallet balance:', error);
      return { success: false, error: 'Failed to fetch wallet balance' };
    }
  },

  async getTransactions(userId: string, filters?: TransactionFilters): Promise<{ success: boolean; data?: WalletTransactionRow[]; error?: string }> {
    try {
      console.log('[WALLET] Fetching transactions for user:', userId);

      let query = supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId);

      if (filters?.walletType) {
        query = query.eq('wallet_type', filters.walletType);
      }

      if (filters?.kind) {
        query = query.eq('kind', filters.kind);
      }

      if (filters?.fromDate) {
        query = query.gte('created_at', filters.fromDate);
      }

      if (filters?.toDate) {
        query = query.lte('created_at', filters.toDate);
      }

      query = query.order('created_at', { ascending: false });

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[WALLET] Error fetching transactions:', error);
        return { success: false, error: 'Failed to fetch transactions' };
      }

      console.log(`[WALLET] Fetched ${data?.length || 0} transactions`);
      return { success: true, data: data as WalletTransactionRow[] };
    } catch (error) {
      console.error('[WALLET] Error fetching transactions:', error);
      return { success: false, error: 'Failed to fetch transactions' };
    }
  },

  async addCashback(userId: string, amount: number, orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[WALLET] Adding cashback for user:', userId, amount);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('virtual_wallet')
        .eq('id', userId)
        .maybeSingle();

      if (profileError || !profile) {
        console.error('[WALLET] Error fetching profile:', profileError);
        return { success: false, error: 'Failed to fetch profile' };
      }

      const newBalance = (profile as ProfileRow).virtual_wallet + amount;

      const updateData: ProfileUpdate = { virtual_wallet: newBalance };
      const { error: updateError } = await supabase
        .from('profiles')
        // @ts-expect-error - Supabase generated types issue with update
        .update(updateData)
        .eq('id', userId);

      if (updateError) {
        console.error('[WALLET] Error updating balance:', updateError);
        return { success: false, error: 'Failed to update balance' };
      }

      const transaction = {
        user_id: userId,
        transaction_type: 'credit',
        amount: amount,
        wallet_type: 'virtual',
        kind: 'cashback',
        order_id: orderId,
        description: `Cashback for order #${orderId.slice(-6)}`,
        balance_after: newBalance,
      };

      const { error: txnError } = await supabase
        .from('wallet_transactions')
        .insert(transaction as any);

      if (txnError) {
        console.error('[WALLET] Error creating transaction:', txnError);
        return { success: false, error: 'Failed to create transaction' };
      }

      console.log('[WALLET] Cashback added successfully');
      return { success: true };
    } catch (error) {
      console.error('[WALLET] Error adding cashback:', error);
      return { success: false, error: 'Failed to add cashback' };
    }
  },

  async processReferralConversion(referrerId: string, refereeId: string, orderId: string, conversionAmount: number): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[WALLET] Processing referral conversion:', referrerId, conversionAmount);

      const { data: referrerProfile, error: profileError } = await supabase
        .from('profiles')
        .select('virtual_wallet, actual_wallet')
        .eq('id', referrerId)
        .maybeSingle();

      if (profileError || !referrerProfile) {
        console.error('[WALLET] Error fetching referrer profile:', profileError);
        return { success: false, error: 'Failed to fetch referrer profile' };
      }

      const amountInRupees = Math.round(conversionAmount);

      if ((referrerProfile as ProfileRow).virtual_wallet < amountInRupees) {
        return { success: false, error: 'Insufficient virtual wallet balance' };
      }

      const newVirtualBalance = (referrerProfile as ProfileRow).virtual_wallet - amountInRupees;
      const newActualBalance = (referrerProfile as ProfileRow).actual_wallet + amountInRupees;

      const updateData: ProfileUpdate = {
        virtual_wallet: newVirtualBalance,
        actual_wallet: newActualBalance,
      };
      const { error: updateError } = await supabase
        .from('profiles')
        // @ts-expect-error - Supabase generated types issue with update
        .update(updateData)
        .eq('id', referrerId);

      if (updateError) {
        console.error('[WALLET] Error updating balances:', updateError);
        return { success: false, error: 'Failed to update balances' };
      }

      const virtualDebitTxn = {
        user_id: referrerId,
        transaction_type: 'debit',
        amount: amountInRupees,
        wallet_type: 'virtual',
        kind: 'adjustment',
        order_id: orderId,
        description: `Referral conversion from order #${orderId.slice(-6)}`,
        balance_after: newVirtualBalance,
      };

      const { data: virtualTxn, error: virtualTxnError } = await supabase
        .from('wallet_transactions')
        .insert(virtualDebitTxn as any)
        .select('id')
        .single();

      if (virtualTxnError || !virtualTxn) {
        console.error('[WALLET] Error creating virtual debit transaction:', virtualTxnError);
        return { success: false, error: 'Failed to create virtual transaction' };
      }

      const virtualTxnId = (virtualTxn as { id: string }).id;

      const actualCreditTxn = {
        user_id: referrerId,
        transaction_type: 'credit',
        amount: amountInRupees,
        wallet_type: 'actual',
        kind: 'referral_reward',
        order_id: orderId,
        description: `Referral conversion to Actual Wallet`,
        balance_after: newActualBalance,
      };

      const { data: actualTxn, error: actualTxnError } = await supabase
        .from('wallet_transactions')
        .insert(actualCreditTxn as any)
        .select('id')
        .single();

      if (actualTxnError || !actualTxn) {
        console.error('[WALLET] Error creating actual credit transaction:', actualTxnError);
        return { success: false, error: 'Failed to create actual transaction' };
      }

      const actualTxnId = (actualTxn as { id: string }).id;

      const conversionRecord: ReferralConversionInsert = {
        referrer_id: referrerId,
        referee_id: refereeId,
        order_id: orderId,
        conversion_amount: amountInRupees,
        virtual_debit_txn_id: virtualTxnId,
        actual_credit_txn_id: actualTxnId,
      };

      const { error: conversionError } = await supabase
        .from('referral_conversions')
        .insert(conversionRecord as any);

      if (conversionError) {
        console.error('[WALLET] Error creating conversion record:', conversionError);
        return { success: false, error: 'Failed to create conversion record' };
      }

      console.log('[WALLET] Referral conversion processed successfully');
      return { success: true };
    } catch (error) {
      console.error('[WALLET] Error processing referral conversion:', error);
      return { success: false, error: 'Failed to process referral conversion' };
    }
  },

  async redeemWallet(userId: string, amount: number, orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[WALLET] Redeeming wallet for user:', userId, amount);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('actual_wallet')
        .eq('id', userId)
        .maybeSingle();

      if (profileError || !profile) {
        console.error('[WALLET] Error fetching profile:', profileError);
        return { success: false, error: 'Failed to fetch profile' };
      }

      const amountInRupees = amount;

      if ((profile as ProfileRow).actual_wallet < amountInRupees) {
        return { success: false, error: 'Insufficient actual wallet balance' };
      }

      const newBalance = (profile as ProfileRow).actual_wallet - amountInRupees;

      const updateData: ProfileUpdate = { actual_wallet: newBalance };
      const { error: updateError } = await supabase
        .from('profiles')
        // @ts-expect-error - Supabase generated types issue with update
        .update(updateData)
        .eq('id', userId);

      if (updateError) {
        console.error('[WALLET] Error updating balance:', updateError);
        return { success: false, error: 'Failed to update balance' };
      }

      const transaction = {
        user_id: userId,
        transaction_type: 'debit',
        amount: amountInRupees,
        wallet_type: 'actual',
        kind: 'order_payment',
        order_id: orderId,
        description: `Wallet redeemed for order #${orderId.slice(-6)}`,
        balance_after: newBalance,
      };

      const { error: txnError } = await supabase
        .from('wallet_transactions')
        .insert(transaction as any);

      if (txnError) {
        console.error('[WALLET] Error creating transaction:', txnError);
        return { success: false, error: 'Failed to create transaction' };
      }

      console.log('[WALLET] Wallet redeemed successfully');
      return { success: true };
    } catch (error) {
      console.error('[WALLET] Error redeeming wallet:', error);
      return { success: false, error: 'Failed to redeem wallet' };
    }
  },

  async addRefund(userId: string, amount: number, orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[WALLET] Adding refund for user:', userId, amount);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('actual_wallet')
        .eq('id', userId)
        .maybeSingle();

      if (profileError || !profile) {
        console.error('[WALLET] Error fetching profile:', profileError);
        return { success: false, error: 'Failed to fetch profile' };
      }

      const amountInRupees = amount;
      const newBalance = (profile as ProfileRow).actual_wallet + amountInRupees;

      const updateData: ProfileUpdate = { actual_wallet: newBalance };
      const { error: updateError } = await supabase
        .from('profiles')
        // @ts-expect-error - Supabase generated types issue with update
        .update(updateData)
        .eq('id', userId);

      if (updateError) {
        console.error('[WALLET] Error updating balance:', updateError);
        return { success: false, error: 'Failed to update balance' };
      }

      const transaction = {
        user_id: userId,
        transaction_type: 'credit',
        amount: amountInRupees,
        wallet_type: 'actual',
        kind: 'refund',
        order_id: orderId,
        description: `Refund for order #${orderId.slice(-6)}`,
        balance_after: newBalance,
      };

      const { error: txnError } = await supabase
        .from('wallet_transactions')
        .insert(transaction as any);

      if (txnError) {
        console.error('[WALLET] Error creating transaction:', txnError);
        return { success: false, error: 'Failed to create transaction' };
      }

      console.log('[WALLET] Refund added successfully');
      return { success: true };
    } catch (error) {
      console.error('[WALLET] Error adding refund:', error);
      return { success: false, error: 'Failed to add refund' };
    }
  },
};
