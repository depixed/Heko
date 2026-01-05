// lib/msg91.service.ts
// MSG91 OTP Service - Using MSG91 React Native SDK with custom UI
// Uses ExposeOTPVerification component with ref-based methods
// Falls back to REST API on web platform

import { ExposeOTPVerification } from '@msg91comm/react-native-sendotp';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import React from 'react';

type ExposeOTPVerificationRef = React.ComponentRef<typeof ExposeOTPVerification>;

interface Msg91Config {
  widgetId?: string;
  tokenAuth?: string;
  authKey?: string;
}

class Msg91Service {
  private widgetId: string | null = null;
  private authToken: string | null = null;
  private exposeRef: ExposeOTPVerificationRef | null = null;
  private isInitialized: boolean = false;

  constructor() {
    // Get credentials from environment or config
    this.widgetId = Constants.expoConfig?.extra?.msg91WidgetId || 
                     process.env.EXPO_PUBLIC_MSG91_WIDGET_ID || null;
    this.authToken = Constants.expoConfig?.extra?.msg91AuthToken || 
                     process.env.EXPO_PUBLIC_MSG91_AUTH_TOKEN || null;
  }

  /**
   * Initialize MSG91 service with configuration
   * Note: The ExposeOTPVerification component must be rendered in your app
   * to use these methods. Call this after the component is mounted.
   */
  async initialize(config?: Msg91Config): Promise<void> {
    if (this.isInitialized && !config) {
      return;
    }

    if (config) {
      this.widgetId = config.widgetId || this.widgetId;
      this.authToken = config.tokenAuth || this.authToken;
    }

    if (!this.widgetId || !this.authToken) {
      console.warn('[MSG91] Widget ID or Auth Token not configured. OTP features may not work.');
      // Don't throw error - allow initialization but will fail on actual use
    }

    this.isInitialized = true;
    console.log('[MSG91] Service initialized');
  }

  /**
   * Set the ref to ExposeOTPVerification component
   * This must be called after the component is mounted
   */
  setRef(ref: ExposeOTPVerificationRef | null): void {
    this.exposeRef = ref;
    console.log('[MSG91] Ref set:', ref ? 'available' : 'null');
  }

  /**
   * Format phone number for MSG91 (remove +, ensure country code)
   * @param phone Phone number in any format
   * @returns Formatted phone: 919876543210 (without +)
   */
  private formatPhone(phone: string): string {
    // Remove + if present
    let formatted = phone.replace(/^\+/, '');
    
    // If doesn't start with 91, add it (for Indian numbers)
    if (!formatted.startsWith('91')) {
      formatted = `91${formatted}`;
    }
    
    // Validate Indian mobile number (starts with 6-9, 10 digits)
    const mobileNumber = formatted.slice(-10);
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      throw new Error('Invalid Indian mobile number. Must be 10 digits starting with 6-9.');
    }
    
    return formatted;
  }

  /**
   * Send OTP using MSG91 SDK (with custom UI)
   * On web, falls back to backend API
   * @param phone Phone number in any format (e.g., +919876543210, 9876543210, 919876543210)
   */
  async sendOtp(phone: string): Promise<void> {
    // On web, use backend API since WebView doesn't work
    if (Platform.OS === 'web') {
      return this.sendOtpViaBackend(phone);
    }

    if (!this.exposeRef) {
      throw new Error('ExposeOTPVerification ref not set. Make sure the component is rendered and ref is passed to setRef().');
    }

    if (!this.authToken || !this.widgetId) {
      throw new Error('MSG91 widget ID and auth token not configured. Please set EXPO_PUBLIC_MSG91_WIDGET_ID and EXPO_PUBLIC_MSG91_AUTH_TOKEN or pass them via initialize().');
    }

    try {
      const formattedPhone = this.formatPhone(phone);

      console.log('[MSG91] Sending OTP via SDK to:', formattedPhone);
      console.log('[MSG91] Widget ID:', this.widgetId);
      console.log('[MSG91] Auth Token configured:', !!this.authToken);

      const response = await this.exposeRef.sendOtp(formattedPhone);

      console.log('[MSG91] SDK Response:', JSON.stringify(response));

      if (response.type !== 'success') {
        console.error('[MSG91] SDK returned error:', response);
        throw new Error(response.message || 'Failed to send OTP');
      }

      // Check if the message field contains an error code or request ID
      // MSG91 might return hex strings or error codes in message field
      // If message looks like an error (short hex string), it might indicate an issue
      if (response.message && response.message.length < 30 && /^[0-9a-f]+$/i.test(response.message)) {
        console.warn('[MSG91] Response message appears to be a code/ID:', response.message);
        // This might be a request ID or error code - log it but continue
        // The SDK says type: 'success', so we'll trust it
      }

      console.log('[MSG91] OTP sent successfully via SDK');
      console.log('[MSG91] Response details:', {
        type: response.type,
        message: response.message,
        messageLength: response.message?.length,
        code: response.code,
      });
    } catch (error: any) {
      console.error('[MSG91] Error sending OTP:', error);
      console.error('[MSG91] Error details:', {
        message: error.message,
        stack: error.stack,
        refAvailable: !!this.exposeRef,
        widgetId: this.widgetId,
        authToken: !!this.authToken,
      });
      throw new Error(error.message || 'Failed to send OTP');
    }
  }

  /**
   * Send OTP via backend API (for web platform)
   */
  private async sendOtpViaBackend(phone: string): Promise<void> {
    const { SUPABASE_CONFIG } = await import('@/constants/supabase');
    const FUNCTIONS_URL = `${SUPABASE_CONFIG.URL}/functions/v1`;

    const formattedPhone = this.formatPhone(phone);
    const url = `${FUNCTIONS_URL}/customer-send-otp`;

    try {
      console.log('[MSG91] Sending OTP via backend (web) to:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_CONFIG.PUBLISHABLE_KEY}`,
          'apikey': SUPABASE_CONFIG.PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ phone: `+${formattedPhone}` }),
      });

      // Check if response is ok before parsing
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[MSG91] Backend error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        
        // Try to parse as JSON, but handle if it's not
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` };
        }
        
        throw new Error(errorData.error || errorData.message || `Failed to send OTP (HTTP ${response.status})`);
      }

      // Parse response
      let data;
      try {
        const responseText = await response.text();
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[MSG91] Failed to parse response:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      console.log('[MSG91] OTP sent successfully via backend (web)');
    } catch (error: any) {
      // Handle network errors specifically
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('[MSG91] Network error - function may not be deployed:', url);
        throw new Error('Unable to connect to server. Please ensure the edge function is deployed and check your internet connection.');
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Verify OTP using MSG91 SDK (with custom UI)
   * On web, falls back to backend API
   * @param otp 4-digit OTP code (as configured in MSG91 widget)
   * @param phone Phone number (required for web fallback)
   * @returns Access token from MSG91 (to be verified with backend)
   */
  async verifyOtp(otp: string | number, phone?: string): Promise<string> {
    // On web, use backend API since WebView doesn't work
    if (Platform.OS === 'web') {
      if (!phone) {
        throw new Error('Phone number is required for web OTP verification');
      }
      return this.verifyOtpViaBackend(otp, phone);
    }

    if (!this.exposeRef) {
      throw new Error('ExposeOTPVerification ref not set. Make sure the component is rendered and ref is passed to setRef().');
    }

    if (!this.authToken || !this.widgetId) {
      throw new Error('MSG91 widget ID and auth token not configured');
    }

    try {
      const otpNumber = typeof otp === 'string' ? parseInt(otp, 10) : otp;

      if (isNaN(otpNumber)) {
        throw new Error('Invalid OTP format');
      }

      console.log('[MSG91] Verifying OTP:', otpNumber);

      const response = await this.exposeRef.verifyOtp(otpNumber);

      if (response.type !== 'success') {
        throw new Error(response.message || 'Invalid or expired OTP');
      }

      // MSG91 SDK response format: { type: 'success', message: string, code?: string }
      // The message might contain accessToken, request ID, or session ID
      // Try to parse message as JSON first
      let accessToken: string | null = null;
      
      try {
        const parsedMessage = JSON.parse(response.message);
        accessToken = parsedMessage.accessToken || parsedMessage.token || parsedMessage.data?.accessToken || parsedMessage.sessionId;
      } catch {
        // If message is not JSON, it might be:
        // 1. A hex string (request ID or session ID) - use it as accessToken
        // 2. The accessToken itself
        // 3. An error code (but type is 'success', so unlikely)
        if (response.message) {
          // Use the message as accessToken/sessionId
          // MSG91 widget might return request ID or session ID in message field
          accessToken = response.message;
          console.log('[MSG91] Using message field as accessToken/sessionId:', response.message);
        }
      }
      
      // Also check code field
      if (!accessToken && response.code) {
        accessToken = response.code;
      }
      
      // Check for accessToken in response object directly
      if (!accessToken && (response as any).accessToken) {
        accessToken = (response as any).accessToken;
      }
      
      if (!accessToken) {
        // If no accessToken, log the response for debugging
        console.warn('[MSG91] No accessToken in response:', JSON.stringify(response));
        // MSG91 widget might not return accessToken in verifyOtp response
        // In this case, we'll use a placeholder and let backend verify using phone + OTP
        // OR we can use the message field as session identifier
        throw new Error('MSG91 verification succeeded but no access token received. The widget may need to be configured to return access tokens.');
      }

      console.log('[MSG91] OTP verified, access token/session ID received:', accessToken.substring(0, 20) + '...');
      return accessToken;
    } catch (error: any) {
      console.error('[MSG91] Error verifying OTP:', error);
      throw new Error(error.message || 'Invalid or expired OTP');
    }
  }

  /**
   * Verify OTP via backend API (for web platform)
   */
  private async verifyOtpViaBackend(otp: string | number, phone: string): Promise<string> {
    const { SUPABASE_CONFIG } = await import('@/constants/supabase');
    const FUNCTIONS_URL = `${SUPABASE_CONFIG.URL}/functions/v1`;

    const formattedPhone = this.formatPhone(phone);
    const url = `${FUNCTIONS_URL}/customer-verify-otp`;

    try {
      console.log('[MSG91] Verifying OTP via backend (web) to:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_CONFIG.PUBLISHABLE_KEY}`,
          'apikey': SUPABASE_CONFIG.PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ 
          phone: `+${formattedPhone}`,
          otp: otp.toString()
        }),
      });

      // Check if response is ok before parsing
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[MSG91] Backend verification error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` };
        }
        
        throw new Error(errorData.error || errorData.message || `Invalid OTP (HTTP ${response.status})`);
      }

      // Parse response
      let data;
      try {
        const responseText = await response.text();
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[MSG91] Failed to parse verification response:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!data.success) {
        throw new Error(data.error || 'Invalid or expired OTP');
      }

      // For web, we don't get accessToken from backend, so return a placeholder
      // The backend will handle verification and return user status
      console.log('[MSG91] OTP verified via backend (web)');
      return 'verified'; // Placeholder - backend handles verification
    } catch (error: any) {
      // Handle network errors specifically
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('[MSG91] Network error - function may not be deployed:', url);
        throw new Error('Unable to connect to server. Please ensure the edge function is deployed and check your internet connection.');
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Resend OTP
   * @param phone Phone number (not used, but kept for API compatibility)
   * @param channel Optional: 'SMS' | 'VOICE' | 'WHATSAPP' | 'EMAIL'
   */
  async retryOtp(phone: string, channel: 'SMS' | 'VOICE' | 'WHATSAPP' | 'EMAIL' | null = null): Promise<void> {
    if (!this.exposeRef) {
      throw new Error('ExposeOTPVerification ref not set');
    }

    try {
      const response = await this.exposeRef.retryOtp(channel || undefined);

      if (response.type !== 'success') {
        throw new Error(response.message || 'Failed to resend OTP');
      }

      console.log('[MSG91] OTP resent successfully');
    } catch (error: any) {
      console.error('[MSG91] Error resending OTP:', error);
      throw new Error(error.message || 'Failed to resend OTP');
    }
  }

  /**
   * Get widget configuration data
   * This is optional and provides widget settings like OTP length, retry time, etc.
   */
  getWidgetData(): Promise<any> {
    if (!this.exposeRef) {
      throw new Error('ExposeOTPVerification ref not set');
    }

    // This would need to be implemented if the ref exposes this method
    // For now, return a promise that resolves to null
    return Promise.resolve(null);
  }
}

export const msg91Service = new Msg91Service();
