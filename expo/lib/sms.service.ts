import { SUPABASE_CONFIG } from '@/constants/supabase';

const FUNCTIONS_URL = `${SUPABASE_CONFIG.URL}/functions/v1`;

export const smsService = {
  /**
   * Send SMS via edge function
   */
  async sendSMS(
    phone: string,
    message: string,
    notificationId?: string
  ): Promise<{ success: boolean; providerId?: string; error?: string }> {
    try {
      // TODO: Implement SMS edge function
      // For now, this is a placeholder
      // The actual implementation will call an edge function that uses Twilio/AWS SNS/etc.
      
      const response = await fetch(`${FUNCTIONS_URL}/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_CONFIG.PUBLISHABLE_KEY}`,
          'apikey': SUPABASE_CONFIG.PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          phone,
          message,
          notification_id: notificationId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('[SMS] Error sending SMS:', result.error);
        return { success: false, error: result.error || 'Failed to send SMS' };
      }

      return { success: true, providerId: result.provider_id };
    } catch (error) {
      console.error('[SMS] Error sending SMS:', error);
      return { success: false, error: 'Failed to send SMS' };
    }
  },

  /**
   * Send OTP via SMS
   */
  async sendOTP(
    phone: string,
    otp: string,
    orderId: string,
    locale: 'en' | 'gu' = 'en'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const message = this.formatOTPMessage(otp, orderId, locale);
      return await this.sendSMS(phone, message);
    } catch (error) {
      console.error('[SMS] Error sending OTP:', error);
      return { success: false, error: 'Failed to send OTP' };
    }
  },

  /**
   * Format OTP message
   */
  formatOTPMessage(otp: string, orderId: string, locale: 'en' | 'gu' = 'en'): string {
    if (locale === 'gu') {
      return `તમારો HEKO ડિલિવરી OTP ${otp} છે. ઓર્ડર #${orderId.slice(-6)}`;
    }
    return `Your HEKO delivery OTP is ${otp}. Order #${orderId.slice(-6)}`;
  },
};

