import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@/types';
import type { Database } from '@/types/database';
import { SUPABASE_CONFIG } from '@/constants/supabase';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

const STORAGE_KEY = '@heko_session';
const FUNCTIONS_URL = `${SUPABASE_CONFIG.URL}/functions/v1`;

export const authService = {
  async sendOTP(phone: string, mode: 'login' | 'signup' = 'login'): Promise<{ success: boolean; otp?: string; error?: string }> {
    try {
      console.log('[AUTH] Sending OTP to:', phone, 'mode:', mode);
      
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

      const response = await fetch(`${FUNCTIONS_URL}/customer-send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_CONFIG.PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ phone: formattedPhone }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('[AUTH] Error sending OTP:', data);
        return { success: false, error: data.error || 'Failed to send OTP' };
      }

      console.log('[AUTH] OTP sent successfully', data.otp ? `(dev: ${data.otp})` : '');
      return { success: true, otp: data.otp };
    } catch (error) {
      console.error('[AUTH] Error sending OTP:', error);
      return { success: false, error: 'Failed to send OTP' };
    }
  },

  async verifyOTPLogin(phone: string, otp: string): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    try {
      console.log('[AUTH] Verifying OTP for login:', phone);
      
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

      const response = await fetch(`${FUNCTIONS_URL}/customer-verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_CONFIG.PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ phone: formattedPhone, otp }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('[AUTH] Error verifying OTP:', data);
        return { success: false, error: data.error || 'Invalid OTP' };
      }

      if (data.isNewUser) {
        return { success: false, error: 'Please sign up first' };
      }

      if (!data.user || !data.sessionToken) {
        return { success: false, error: 'Invalid response from server' };
      }

      const user: User = {
        id: data.user.id,
        name: data.user.name,
        phone: data.user.phone,
        email: data.user.email || undefined,
        referralId: data.user.referral_code,
        referredBy: data.user.referred_by || undefined,
        createdAt: data.user.created_at,
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token: data.sessionToken }));

      console.log('[AUTH] Login successful for user:', user.id);
      return { success: true, user, token: data.sessionToken };
    } catch (error) {
      console.error('[AUTH] Error verifying OTP:', error);
      return { success: false, error: 'Failed to verify OTP' };
    }
  },

  async verifyOTPSignup(phone: string, otp: string): Promise<{ success: boolean; isNewUser?: boolean; error?: string }> {
    try {
      console.log('[AUTH] Verifying OTP for signup:', phone);
      
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

      const response = await fetch(`${FUNCTIONS_URL}/customer-verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_CONFIG.PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ phone: formattedPhone, otp }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('[AUTH] Error verifying OTP:', data);
        return { success: false, error: data.error || 'Invalid OTP' };
      }

      if (!data.isNewUser) {
        return { success: false, error: 'Phone number already registered. Please login instead.' };
      }

      console.log('[AUTH] OTP verified for new user');
      return { success: true, isNewUser: true };
    } catch (error) {
      console.error('[AUTH] Error verifying OTP for signup:', error);
      return { success: false, error: 'Failed to verify OTP' };
    }
  },

  async signUp(data: { name: string; phone: string; email?: string; referredBy?: string }): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    try {
      console.log('[AUTH] Signing up user:', data.phone);

      const formattedPhone = data.phone.startsWith('+') ? data.phone : `+91${data.phone}`;

      const response = await fetch(`${FUNCTIONS_URL}/customer-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_CONFIG.PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          phone: formattedPhone,
          name: data.name,
          email: data.email || undefined,
          referredBy: data.referredBy || undefined,
        }),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        console.error('[AUTH] Error signing up:', responseData);
        return { success: false, error: responseData.error || 'Failed to create account' };
      }

      if (!responseData.user || !responseData.sessionToken) {
        return { success: false, error: 'Invalid response from server' };
      }

      const user: User = {
        id: responseData.user.id,
        name: responseData.user.name,
        phone: responseData.user.phone,
        email: responseData.user.email || undefined,
        referralId: responseData.user.referral_code,
        referredBy: responseData.user.referred_by || undefined,
        createdAt: responseData.user.created_at,
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token: responseData.sessionToken }));

      console.log('[AUTH] Sign up successful for user:', user.id);
      return { success: true, user, token: responseData.sessionToken };
    } catch (error) {
      console.error('[AUTH] Error signing up:', error);
      return { success: false, error: 'Failed to create account' };
    }
  },

  async getStoredSession(): Promise<{ user: User; token: string } | null> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      
      const session = JSON.parse(stored);
      
      const response = await fetch(`${FUNCTIONS_URL}/customer-validate-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_CONFIG.PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ sessionToken: session.token }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.log('[AUTH] Session validation failed, clearing stored session');
        await AsyncStorage.removeItem(STORAGE_KEY);
        return null;
      }

      const user: User = {
        id: data.user.id,
        name: data.user.name,
        phone: data.user.phone,
        email: data.user.email || undefined,
        referralId: data.user.referral_code,
        referredBy: data.user.referred_by || undefined,
        createdAt: data.user.created_at,
      };

      console.log('[AUTH] Session validated successfully');
      return { user, token: session.token };
    } catch (error) {
      console.error('[AUTH] Error getting stored session:', error);
      await AsyncStorage.removeItem(STORAGE_KEY);
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
