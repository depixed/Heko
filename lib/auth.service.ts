import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@/types';
import type { Database } from '@/types/database';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

const STORAGE_KEY = '@heko_session';

export const authService = {
  async sendOTP(phone: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[AUTH] Sending OTP to:', phone);
      
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

      if (!existingProfile) {
        return { success: false, error: 'Phone number not registered. Please sign up first.' };
      }

      await AsyncStorage.setItem(`@heko_otp_${phone}`, '123456');
      
      return { success: true };
    } catch (error) {
      console.error('[AUTH] Error sending OTP:', error);
      return { success: false, error: 'Failed to send OTP' };
    }
  },

  async verifyOTP(phone: string, otp: string): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    try {
      console.log('[AUTH] Verifying OTP for:', phone);
      
      const storedOTP = await AsyncStorage.getItem(`@heko_otp_${phone}`);
      
      if (storedOTP !== otp) {
        return { success: false, error: 'Invalid OTP' };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

      if (error || !data) {
        console.error('[AUTH] Profile not found:', error);
        return { success: false, error: 'User not found' };
      }

      const profile = data as ProfileRow;

      const user: User = {
        id: profile.id,
        name: profile.name,
        phone: profile.phone,
        email: profile.email || undefined,
        referralId: profile.referral_id,
        referredBy: profile.referred_by || undefined,
        createdAt: profile.created_at,
      };

      const token = `token_${profile.id}_${Date.now()}`;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
      await AsyncStorage.removeItem(`@heko_otp_${phone}`);

      console.log('[AUTH] Login successful for user:', profile.id);
      return { success: true, user, token };
    } catch (error) {
      console.error('[AUTH] Error verifying OTP:', error);
      return { success: false, error: 'Failed to verify OTP' };
    }
  },

  async signUp(data: { name: string; phone: string; email?: string; referredBy?: string }): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    try {
      console.log('[AUTH] Signing up user:', data.phone);

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', data.phone)
        .maybeSingle();

      if (existingProfile) {
        return { success: false, error: 'Phone number already registered' };
      }

      const referralId = `HEKO${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const insertData: ProfileInsert = {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        referral_id: referralId,
        referred_by: data.referredBy || null,
        virtual_wallet: 0,
        actual_wallet: 0,
      };

      const { data: resultData, error } = await supabase
        .from('profiles')
        .insert(insertData as any)
        .select()
        .single();

      if (error || !resultData) {
        console.error('[AUTH] Error creating profile:', error);
        return { success: false, error: 'Failed to create account' };
      }

      const newProfile = resultData as ProfileRow;

      const user: User = {
        id: newProfile.id,
        name: newProfile.name,
        phone: newProfile.phone,
        email: newProfile.email || undefined,
        referralId: newProfile.referral_id,
        referredBy: newProfile.referred_by || undefined,
        createdAt: newProfile.created_at,
      };

      const token = `token_${newProfile.id}_${Date.now()}`;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));

      console.log('[AUTH] Sign up successful for user:', newProfile.id);
      return { success: true, user, token };
    } catch (error) {
      console.error('[AUTH] Error signing up:', error);
      return { success: false, error: 'Failed to create account' };
    }
  },

  async getStoredSession(): Promise<{ user: User; token: string } | null> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (error) {
      console.error('[AUTH] Error getting stored session:', error);
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('[AUTH] Logout successful');
    } catch (error) {
      console.error('[AUTH] Error logging out:', error);
    }
  },

  async updateProfile(userId: string, updates: Partial<{ name: string; email: string }>): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[AUTH] Updating profile:', userId);

      const updateData: ProfileUpdate = {
        name: updates.name,
        email: updates.email || null,
        updated_at: new Date().toISOString(),
      };

      const updateResult = await supabase
        .from('profiles')
        // @ts-expect-error - Supabase type inference issue with generated types
        .update(updateData)
        .eq('id', userId);
      
      const { error } = updateResult;

      if (error) {
        console.error('[AUTH] Error updating profile:', error);
        return { success: false, error: 'Failed to update profile' };
      }

      return { success: true };
    } catch (error) {
      console.error('[AUTH] Error updating profile:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  },

  async getProfile(userId: string): Promise<{ success: boolean; profile?: ProfileRow; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        console.error('[AUTH] Error fetching profile:', error);
        return { success: false, error: 'Failed to fetch profile' };
      }

      return { success: true, profile: data as ProfileRow };
    } catch (error) {
      console.error('[AUTH] Error fetching profile:', error);
      return { success: false, error: 'Failed to fetch profile' };
    }
  },
};
