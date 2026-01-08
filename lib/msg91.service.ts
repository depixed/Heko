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
   * Send OTP using backend API (Fast2SMS or MSG91 based on backend configuration)
   * TEMPORARY: Always uses backend API while MSG91 DLT approval is pending
   * @param phone Phone number in any format (e.g., +919876543210, 9876543210, 919876543210)
   */
  async sendOtp(phone: string): Promise<void> {
    console.log('[OTP Service] Using backend API (Fast2SMS) - MSG91 SDK bypassed');
    // TEMPORARY: Always use backend API (Fast2SMS) until MSG91 DLT is approved
    // Backend will handle provider selection via OTP_PROVIDER environment variable
    return this.sendOtpViaBackend(phone);

    // MSG91 SDK CODE (KEPT FOR FUTURE USE WHEN DLT IS APPROVED)
    // Uncomment this block and remove the above return statement when MSG91 DLT is ready
    /*
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

      console.log('[MSG91] OTP sent successfully via SDK');
    } catch (error: any) {
      console.error('[MSG91] Error sending OTP:', error);
      throw new Error(error.message || 'Failed to send OTP');
    }
    */
  }

  /**
   * Send OTP via backend API (Fast2SMS or MSG91 based on backend OTP_PROVIDER)
   * Backend handles provider selection and OTP generation
   */
  private async sendOtpViaBackend(phone: string): Promise<void> {
    const { SUPABASE_CONFIG } = await import('@/constants/supabase');
    const FUNCTIONS_URL = `${SUPABASE_CONFIG.URL}/functions/v1`;

    // Format phone: remove + and ensure 91 prefix
    let formattedPhone = phone.replace(/^\+/, '');
    if (!formattedPhone.startsWith('91')) {
      formattedPhone = `91${formattedPhone}`;
    }
    // Extract 10-digit number for validation
    const mobileNumber = formattedPhone.slice(-10);
    
    const url = `${FUNCTIONS_URL}/customer-send-otp`;

    try {
      console.log('[OTP] Sending OTP via backend to:', mobileNumber);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_CONFIG.PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ phone: mobileNumber }),
      });

      // Check if response is ok before parsing
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OTP] Backend error response:', {
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
        console.error('[OTP] Failed to parse response:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      const provider = data.provider || 'Unknown';
      console.log(`[OTP] OTP sent successfully via ${provider}`);
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
   * Verify OTP using backend API (Fast2SMS or MSG91 based on backend configuration)
   * TEMPORARY: Always uses backend API while MSG91 DLT approval is pending
   * @param otp 6-digit OTP code (Fast2SMS default) or 4-digit (MSG91)
   * @param phone Phone number (required)
   * @returns Verification result indicator
   */
  async verifyOtp(otp: string | number, phone?: string): Promise<string> {
    console.log('[OTP Service] Verifying OTP via backend API (Fast2SMS) - MSG91 SDK bypassed');
    // TEMPORARY: Always use backend API (Fast2SMS) until MSG91 DLT is approved
    if (!phone) {
      throw new Error('Phone number is required for OTP verification');
    }
    return this.verifyOtpViaBackend(otp, phone);

    // MSG91 SDK CODE (KEPT FOR FUTURE USE WHEN DLT IS APPROVED)
    // Uncomment this block and remove the above return statement when MSG91 DLT is ready
    /*
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

      console.log('[MSG91] Verifying OTP via SDK');

      const response = await this.exposeRef.verifyOtp(otpNumber);

      if (response.type !== 'success') {
        throw new Error(response.message || 'Invalid or expired OTP');
      }

      console.log('[MSG91] OTP verified via SDK');
      return response.message || 'verified';
    } catch (error: any) {
      console.error('[MSG91] Error verifying OTP:', error);
      throw new Error(error.message || 'Invalid or expired OTP');
    }
    */
  }

  /**
   * Verify OTP via backend API (Fast2SMS or MSG91 based on backend OTP_PROVIDER)
   * Backend handles verification against stored OTP or MSG91 API
   */
  private async verifyOtpViaBackend(otp: string | number, phone: string): Promise<string> {
    const { SUPABASE_CONFIG } = await import('@/constants/supabase');
    const FUNCTIONS_URL = `${SUPABASE_CONFIG.URL}/functions/v1`;

    // Format phone: remove + and ensure it's just 10 digits
    let formattedPhone = phone.replace(/^\+/, '').replace(/^91/, '');
    
    const url = `${FUNCTIONS_URL}/customer-verify-otp`;

    try {
      console.log('[OTP] Verifying OTP via backend');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_CONFIG.PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ 
          phone: formattedPhone,
          otp: otp.toString()
        }),
      });

      // Check if response is ok before parsing
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OTP] Backend verification error:', {
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
        console.error('[OTP] Failed to parse verification response:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!data.success) {
        throw new Error(data.error || 'Invalid or expired OTP');
      }

      const provider = data.provider || 'Unknown';
      console.log(`[OTP] OTP verified successfully via ${provider}`);
      return 'verified'; // Return indicator - actual user data is in the response
    } catch (error: any) {
      // Handle network errors specifically
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('[OTP] Network error - function may not be deployed:', url);
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
