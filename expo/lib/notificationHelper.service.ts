import { supabase } from './supabase';
import { SUPABASE_CONFIG } from '@/constants/supabase';

const FUNCTIONS_URL = `${SUPABASE_CONFIG.URL}/functions/v1`;

export interface NotificationEventData {
  order_number?: string;
  order_id?: string;
  otp?: string;
  cashback?: number;
  amount?: number;
  message?: string;
  deep_link?: string;
  [key: string]: any;
}

export const notificationHelper = {
  /**
   * Notify customer about order status change
   */
  async notifyOrderStatusChange(
    orderId: string,
    newStatus: string,
    oldStatus: string,
    additionalData?: NotificationEventData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('user_id, order_number, total, delivery_otp')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        console.error('[NOTIFICATION_HELPER] Order not found:', orderId);
        return { success: false, error: 'Order not found' };
      }

      let eventType = '';
      const data: NotificationEventData = {
        order_id: orderId,
        order_number: order.order_number,
        ...additionalData,
      };

      // Map order status to event type
      switch (newStatus) {
        case 'placed':
          eventType = 'order_confirmed';
          break;
        case 'processing':
          eventType = 'order_accepted';
          break;
        case 'preparing':
          eventType = 'order_preparing';
          break;
        case 'out_for_delivery':
          eventType = 'order_out_for_delivery';
          data.otp = order.delivery_otp || additionalData?.otp;
          break;
        case 'delivered':
          eventType = 'order_delivered';
          data.cashback = additionalData?.cashback || 0;
          break;
        case 'partially_delivered':
          eventType = 'order_partially_delivered';
          break;
        case 'canceled':
          eventType = 'order_cancelled';
          break;
        default:
          // Don't send notification for other statuses
          return { success: true };
      }

      return await this.invokeNotificationEvent(order.user_id, eventType, orderId, data);
    } catch (error) {
      console.error('[NOTIFICATION_HELPER] Error notifying order status change:', error);
      return { success: false, error: 'Failed to send notification' };
    }
  },

  /**
   * Notify customer about OTP generation
   */
  async notifyOTPGenerated(
    orderId: string,
    otp: string,
    type: 'delivery' | 'return_pickup'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('user_id, order_number')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        return { success: false, error: 'Order not found' };
      }

      const eventType = type === 'delivery' ? 'order_out_for_delivery' : 'return_pickup_scheduled';
      const data: NotificationEventData = {
        order_id: orderId,
        order_number: order.order_number,
        otp,
      };

      return await this.invokeNotificationEvent(order.user_id, eventType, orderId, data);
    } catch (error) {
      console.error('[NOTIFICATION_HELPER] Error notifying OTP:', error);
      return { success: false, error: 'Failed to send notification' };
    }
  },

  /**
   * Notify customer about wallet update
   */
  async notifyWalletUpdate(
    userId: string,
    transaction: {
      type: string;
      amount: number;
      kind: string;
      order_id?: string | null;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let eventType = '';
      const data: NotificationEventData = {
        amount: transaction.amount,
      };

      switch (transaction.kind) {
        case 'cashback':
          eventType = 'cashback_credited';
          break;
        case 'referral_reward':
          eventType = 'referral_reward';
          break;
        case 'refund':
          eventType = 'refund_processed';
          break;
        case 'wallet_conversion':
          eventType = 'wallet_conversion';
          break;
        default:
          // Don't send notification for other transaction types
          return { success: true };
      }

      if (transaction.order_id) {
        data.order_id = transaction.order_id;
      }

      return await this.invokeNotificationEvent(userId, eventType, transaction.order_id || undefined, data);
    } catch (error) {
      console.error('[NOTIFICATION_HELPER] Error notifying wallet update:', error);
      return { success: false, error: 'Failed to send notification' };
    }
  },

  /**
   * Notify referrer about referral reward
   */
  async notifyReferralEarned(
    referrerId: string,
    refereeId: string,
    orderId: string,
    amount: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('order_number')
        .eq('id', orderId)
        .single();

      const data: NotificationEventData = {
        order_id: orderId,
        order_number: order?.order_number,
        amount,
      };

      return await this.invokeNotificationEvent(referrerId, 'referral_reward', orderId, data);
    } catch (error) {
      console.error('[NOTIFICATION_HELPER] Error notifying referral:', error);
      return { success: false, error: 'Failed to send notification' };
    }
  },

  /**
   * Notify customer about return status
   */
  async notifyReturnStatus(
    returnId: string,
    status: string,
    additionalData?: NotificationEventData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: returnData, error: returnError } = await supabase
        .from('returns')
        .select('user_id, order_id, refund_amount')
        .eq('id', returnId)
        .single();

      if (returnError || !returnData) {
        return { success: false, error: 'Return not found' };
      }

      let eventType = '';
      const data: NotificationEventData = {
        return_id: returnId,
        order_id: returnData.order_id,
        ...additionalData,
      };

      switch (status) {
        case 'approved':
          eventType = 'return_approved';
          break;
        case 'picked_up':
          eventType = 'return_pickup_scheduled';
          if (additionalData?.otp) {
            data.otp = additionalData.otp;
          }
          break;
        case 'completed':
          eventType = 'refund_processed';
          data.amount = returnData.refund_amount;
          break;
        default:
          return { success: true };
      }

      const notifyResult = await this.invokeNotificationEvent(returnData.user_id, eventType, returnData.order_id, data);

      // If return pickup is scheduled with OTP, send explicit OTP notification
      if (status === 'picked_up' && additionalData?.otp) {
        try {
          console.log('[NOTIFICATION_HELPER] Sending return pickup OTP notification:', returnId, additionalData.otp);
          await this.notifyOTPGenerated(returnData.order_id, additionalData.otp, 'return_pickup');
        } catch (otpNotifError) {
          console.error('[NOTIFICATION_HELPER] Error sending return pickup OTP notification:', otpNotifError);
          // Don't fail the return notification if OTP notification fails
        }
      }

      return notifyResult;
    } catch (error) {
      console.error('[NOTIFICATION_HELPER] Error notifying return status:', error);
      return { success: false, error: 'Failed to send notification' };
    }
  },

  /**
   * Notify customer about system alerts
   */
  async notifySystemAlert(
    userId: string,
    message: string,
    priority: 'high' | 'medium' | 'low' = 'medium',
    deepLink?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const data: NotificationEventData = {
        message,
        deep_link: deepLink,
      };

      return await this.invokeNotificationEvent(userId, 'promotional_offer', undefined, data);
    } catch (error) {
      console.error('[NOTIFICATION_HELPER] Error notifying system alert:', error);
      return { success: false, error: 'Failed to send notification' };
    }
  },

  /**
   * Invoke the notify-customer-events edge function
   */
  async invokeNotificationEvent(
    userId: string,
    eventType: string,
    orderId?: string,
    additionalData?: NotificationEventData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const requestBody = {
        event_type: eventType,
        user_id: userId,
        order_id: orderId,
        additional_data: additionalData,
      };

      console.log('[NOTIFICATION_HELPER] Invoking edge function:', {
        event_type: eventType,
        user_id: userId,
        order_id: orderId,
      });

      const response = await fetch(`${FUNCTIONS_URL}/notify-customer-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_CONFIG.PUBLISHABLE_KEY}`,
          'apikey': SUPABASE_CONFIG.PUBLISHABLE_KEY,
        },
        body: JSON.stringify(requestBody),
      });

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        const text = await response.text();
        console.error('[NOTIFICATION_HELPER] Failed to parse response:', text);
        return { 
          success: false, 
          error: `Edge function returned invalid JSON. Status: ${response.status}` 
        };
      }

      if (!response.ok) {
        const errorMsg = result.error || result.message || `HTTP ${response.status}`;
        const errorDetails = result.details || result.stack || '';
        console.error('[NOTIFICATION_HELPER] Edge function error:', {
          status: response.status,
          error: errorMsg,
          details: errorDetails,
          fullResponse: result,
        });
        return { 
          success: false, 
          error: errorDetails ? `${errorMsg}: ${errorDetails}` : errorMsg 
        };
      }

      if (!result.success) {
        const errorMsg = result.error || 'Unknown error from edge function';
        console.error('[NOTIFICATION_HELPER] Edge function returned failure:', result);
        return { success: false, error: errorMsg };
      }

      console.log('[NOTIFICATION_HELPER] Notification sent successfully:', eventType);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[NOTIFICATION_HELPER] Error invoking edge function:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        eventType,
        userId,
      });
      return { 
        success: false, 
        error: `Network error: ${errorMessage}` 
      };
    }
  },
};

