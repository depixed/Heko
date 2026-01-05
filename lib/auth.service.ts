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
      
      // Use MSG91 service for sending OTP
      const { msg91Service } = await import('@/lib/msg91.service');
      await msg91Service.sendOtp(phone);
      
      console.log('[AUTH] OTP sent successfully via MSG91');
      return { success: true };
    } catch (error) {
      console.error('[AUTH] Error sending OTP:', error);
      if (error instanceof Error) {
        console.error('[AUTH] Error details:', error.message, error.stack);
      }
      return { 
        success: false, 
        error: error instanceof Error ? `Network error: ${error.message}` : 'Failed to send OTP' 
      };
    }
  },

  // Deprecated: Use msg91Service.verifyOtp() + verifyMsg91Token() instead
  // These methods are kept for backward compatibility but should not be used
  // The new flow: msg91Service.verifyOtp() -> verifyMsg91Token()

  async loginWithPassword(phone: string, password: string): Promise<{ success: boolean; user?: User; token?: string; phoneNotRegistered?: boolean; needsPassword?: boolean; error?: string }> {
    try {
      console.log('[AUTH] Logging in with password:', phone);
      
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

      const response = await fetch(`${FUNCTIONS_URL}/customer-login-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_CONFIG.PUBLISHABLE_KEY}`,
          'apikey': SUPABASE_CONFIG.PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ phone: formattedPhone, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('[AUTH] Error logging in with password:', data);
        return { 
          success: false, 
          error: data.error || 'Failed to login',
          phoneNotRegistered: data.phoneNotRegistered,
          needsPassword: data.needsPassword,
        };
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

      console.log('[AUTH] Login with password successful for user:', user.id);
      return { success: true, user, token: data.sessionToken };
    } catch (error) {
      console.error('[AUTH] Error logging in with password:', error);
      return { success: false, error: 'Failed to login' };
    }
  },

  async checkPhoneExists(phone: string): Promise<{ success: boolean; exists?: boolean; error?: string }> {
    try {
      console.log('[AUTH] Checking if phone exists:', phone);
      
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', formattedPhone)
        .maybeSingle();

      if (error) {
        console.error('[AUTH] Error checking phone:', error);
        return { success: false, error: 'Failed to check phone number' };
      }

      return { success: true, exists: !!data };
    } catch (error) {
      console.error('[AUTH] Error checking phone:', error);
      return { success: false, error: 'Failed to check phone number' };
    }
  },

  async resetPassword(phone: string, otp: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[AUTH] Resetting password for:', phone);
      
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

      const response = await fetch(`${FUNCTIONS_URL}/customer-reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_CONFIG.PUBLISHABLE_KEY}`,
          'apikey': SUPABASE_CONFIG.PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ phone: formattedPhone, otp, newPassword }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('[AUTH] Error resetting password:', data);
        return { success: false, error: data.error || 'Failed to reset password' };
      }

      console.log('[AUTH] Password reset successful');
      return { success: true };
    } catch (error) {
      console.error('[AUTH] Error resetting password:', error);
      return { success: false, error: 'Failed to reset password' };
    }
  },

  async setPasswordForExistingUser(userId: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[AUTH] Setting password for existing user:', userId);

      const response = await fetch(`${FUNCTIONS_URL}/customer-set-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_CONFIG.PUBLISHABLE_KEY}`,
          'apikey': SUPABASE_CONFIG.PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ userId, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('[AUTH] Error setting password:', data);
        return { success: false, error: data.error || 'Failed to set password' };
      }

      console.log('[AUTH] Password set successfully');
      return { success: true };
    } catch (error) {
      console.error('[AUTH] Error setting password:', error);
      return { success: false, error: 'Failed to set password' };
    }
  },

  async verifyMsg91Token(accessToken: string, phone: string): Promise<{ 
    success: boolean; 
    isNewUser?: boolean; 
    user?: User; 
    token?: string; 
    phone?: string;
    error?: string 
  }> {
    try {
      console.log('[AUTH] Verifying MSG91 token for:', phone);
      
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

      const response = await fetch(`${FUNCTIONS_URL}/customer-verify-msg91-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_CONFIG.PUBLISHABLE_KEY}`,
          'apikey': SUPABASE_CONFIG.PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ 
          accessToken, 
          phone: formattedPhone 
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('[AUTH] Error verifying MSG91 token:', data);
        return { success: false, error: data.error || 'Failed to verify token' };
      }

      if (data.isNewUser) {
        console.log('[AUTH] New user detected');
        return { success: true, isNewUser: true, phone: data.phone };
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
      console.error('[AUTH] Error verifying MSG91 token:', error);
      return { success: false, error: 'Failed to verify token' };
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
          'Authorization': `Bearer ${SUPABASE_CONFIG.PUBLISHABLE_KEY}`,
          'apikey': SUPABASE_CONFIG.PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          phone: formattedPhone,
          name: data.name,
          email: data.email || undefined, // Optional
          referredBy: data.referredBy || undefined,
          // NO PASSWORD - removed
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
          'Authorization': `Bearer ${SUPABASE_CONFIG.PUBLISHABLE_KEY}`,
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

  async lookupReferrerByCode(referralCode: string): Promise<{ success: boolean; referrer?: { id: string; name: string }; error?: string }> {
    try {
      console.log('[AUTH] Looking up referrer by code:', referralCode);

      // Validate referral code format (4 alphanumeric characters)
      const codeRegex = /^[A-Z0-9]{4}$/;
      if (!codeRegex.test(referralCode.toUpperCase())) {
        return { success: false, error: 'Invalid referral code format. Must be 4 alphanumeric characters.' };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('referral_code', referralCode.toUpperCase())
        .maybeSingle();

      if (error) {
        console.error('[AUTH] Error looking up referrer:', error);
        return { success: false, error: 'Failed to lookup referrer' };
      }

      if (!data) {
        return { success: false, error: 'Referral code not found' };
      }

      // Type guard to ensure data has required fields
      const referrerData = data as { id: string; name: string } | null;
      if (!referrerData || !referrerData.id || !referrerData.name) {
        return { success: false, error: 'Referral code not found' };
      }

      return { success: true, referrer: { id: referrerData.id, name: referrerData.name } };
    } catch (error) {
      console.error('[AUTH] Error looking up referrer:', error);
      return { success: false, error: 'Failed to lookup referrer' };
    }
  },

  async addReferrer(userId: string, referralCode: string): Promise<{ success: boolean; referrer?: { id: string; name: string }; error?: string }> {
    try {
      console.log('[AUTH] Adding referrer for user:', userId, 'code:', referralCode);

      const response = await fetch(`${FUNCTIONS_URL}/customer-add-referrer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_CONFIG.PUBLISHABLE_KEY}`,
          'apikey': SUPABASE_CONFIG.PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          userId,
          referralCode,
        }),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        console.error('[AUTH] Error adding referrer:', responseData);
        return { success: false, error: responseData.error || 'Failed to add referrer' };
      }

      console.log('[AUTH] Successfully added referrer:', responseData.referrer);
      return { 
        success: true, 
        referrer: responseData.referrer 
      };
    } catch (error) {
      console.error('[AUTH] Error adding referrer:', error);
      return { success: false, error: 'Failed to add referrer' };
    }
  },
};
