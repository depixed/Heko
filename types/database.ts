export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          phone: string;
          name: string;
          email: string | null;
          referral_code: string;
          referred_by: string | null;
          virtual_wallet: number;
          actual_wallet: number;
          password_hash: string | null;
          password_set_at: string | null;
          last_password_change: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          phone: string;
          name: string;
          email?: string | null;
          referral_code: string;
          referred_by?: string | null;
          virtual_wallet?: number;
          actual_wallet?: number;
          password_hash?: string | null;
          password_set_at?: string | null;
          last_password_change?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone?: string;
          name?: string;
          email?: string | null;
          referral_code?: string;
          referred_by?: string | null;
          virtual_wallet?: number;
          actual_wallet?: number;
          password_hash?: string | null;
          password_set_at?: string | null;
          last_password_change?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_addresses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string;
          type: 'home' | 'work' | 'other';
          other_label: string | null;
          address_line1: string;
          address_line2: string | null;
          landmark: string | null;
          city: string;
          state: string;
          pincode: string;
          lat: number | null;
          lng: number | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone: string;
          type: 'home' | 'work' | 'other';
          other_label?: string | null;
          address_line1: string;
          address_line2?: string | null;
          landmark?: string | null;
          city: string;
          state: string;
          pincode: string;
          lat?: number | null;
          lng?: number | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone?: string;
          type?: 'home' | 'work' | 'other';
          other_label?: string | null;
          address_line1?: string;
          address_line2?: string | null;
          landmark?: string | null;
          city?: string;
          state?: string;
          pincode?: string;
          lat?: number | null;
          lng?: number | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          image: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          image: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          image?: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      subcategories: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          image: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          image?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          image?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          category_id: string;
          subcategory_id: string;
          name: string;
          description: string;
          image: string;
          images: string[];
          price: number;
          mrp: number;
          discount: number;
          unit: string;
          in_stock: boolean;
          tags: string[];
          nutrition: string | null;
          ingredients: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          subcategory_id: string;
          name: string;
          description: string;
          image: string;
          images?: string[];
          price: number;
          mrp: number;
          discount?: number;
          unit: string;
          in_stock?: boolean;
          tags?: string[];
          nutrition?: string | null;
          ingredients?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          subcategory_id?: string;
          name?: string;
          description?: string;
          image?: string;
          images?: string[];
          price?: number;
          mrp?: number;
          discount?: number;
          unit?: string;
          in_stock?: boolean;
          tags?: string[];
          nutrition?: string | null;
          ingredients?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      vendors: {
        Row: {
          id: string;
          name: string;
          business_name: string;
          phone: string;
          email: string | null;
          address: string;
          pincode: string;
          is_active: boolean;
          latitude: number | null;
          longitude: number | null;
          service_radius: number | null;
          status: string | null;
          user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          business_name: string;
          phone: string;
          email?: string | null;
          address: string;
          pincode: string;
          is_active?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          service_radius?: number | null;
          status?: string | null;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          business_name?: string;
          phone?: string;
          email?: string | null;
          address?: string;
          pincode?: string;
          is_active?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          service_radius?: number | null;
          status?: string | null;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      vendor_products: {
        Row: {
          id: string;
          vendor_id: string;
          product_id: string;
          stock_quantity: number;
          is_available: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          product_id: string;
          stock_quantity?: number;
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          product_id?: string;
          stock_quantity?: number;
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string;
          address_id: string;
          status: 'placed' | 'processing' | 'preparing' | 'out_for_delivery' | 'delivered' | 'partially_delivered' | 'unfulfillable' | 'canceled' | 'return_in_progress' | 'returned';
          subtotal: number;
          discount: number;
          delivery_fee: number;
          total: number;
          wallet_used: number;
          delivery_notes: string | null;
          delivery_otp: string | null;
          delivery_partner_id: string | null;
          delivery_window: string | null;
          delivery_slot_id: string | null;
          delivery_date: string | null;
          delivery_window_start: string | null;
          delivery_window_end: string | null;
          contactless_delivery: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number?: string;
          user_id: string;
          address_id: string;
          status?: 'placed' | 'processing' | 'preparing' | 'out_for_delivery' | 'delivered' | 'partially_delivered' | 'unfulfillable' | 'canceled' | 'return_in_progress' | 'returned';
          subtotal: number;
          discount: number;
          delivery_fee: number;
          total: number;
          wallet_used?: number;
          delivery_notes?: string | null;
          delivery_otp?: string | null;
          delivery_partner_id?: string | null;
          delivery_window?: string | null;
          delivery_slot_id?: string | null;
          delivery_date?: string | null;
          delivery_window_start?: string | null;
          delivery_window_end?: string | null;
          contactless_delivery?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          user_id?: string;
          address_id?: string;
          status?: 'placed' | 'processing' | 'preparing' | 'out_for_delivery' | 'delivered' | 'partially_delivered' | 'unfulfillable' | 'canceled' | 'return_in_progress' | 'returned';
          subtotal?: number;
          discount?: number;
          delivery_fee?: number;
          total?: number;
          wallet_used?: number;
          delivery_notes?: string | null;
          delivery_otp?: string | null;
          delivery_partner_id?: string | null;
          delivery_window?: string | null;
          delivery_slot_id?: string | null;
          delivery_date?: string | null;
          delivery_window_start?: string | null;
          delivery_window_end?: string | null;
          contactless_delivery?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          product_image: string;
          vendor_id: string | null;
          quantity: number;
          unit_price: number;
          status: string;
          total_price: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          product_name: string;
          product_image: string;
          vendor_id?: string | null;
          quantity: number;
          unit_price: number;
          status?: string;
          total_price: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          product_name?: string;
          product_image?: string;
          vendor_id?: string | null;
          quantity?: number;
          unit_price?: number;
          status?: string;
          total_price?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      delivery_partners: {
        Row: {
          id: string;
          name: string;
          phone: string;
          vehicle_number: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone: string;
          vehicle_number?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string;
          vehicle_number?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      deliveries: {
        Row: {
          id: string;
          order_id: string;
          delivery_partner_id: string;
          vendor_id: string | null;
          pickup_address: string | null;
          delivery_address: string | null;
          otp: string | null;
          status: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'assigned';
          picked_at: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          delivery_partner_id: string;
          vendor_id?: string | null;
          pickup_address?: string | null;
          delivery_address?: string | null;
          otp?: string | null;
          status?: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'assigned';
          picked_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          delivery_partner_id?: string;
          vendor_id?: string | null;
          pickup_address?: string | null;
          delivery_address?: string | null;
          otp?: string | null;
          status?: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'assigned';
          picked_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      delivery_items: {
        Row: {
          id: string;
          delivery_id: string;
          order_item_id: string;
          status: 'pending' | 'delivered' | 'returned' | 'damaged';
          created_at: string;
        };
        Insert: {
          id?: string;
          delivery_id: string;
          order_item_id: string;
          status?: 'pending' | 'delivered' | 'returned' | 'damaged';
          created_at?: string;
        };
        Update: {
          id?: string;
          delivery_id?: string;
          order_item_id?: string;
          status?: 'pending' | 'delivered' | 'returned' | 'damaged';
          created_at?: string;
        };
      };
      wallet_transactions: {
        Row: {
          id: string;
          user_id: string;
          type: 'cashback' | 'referral' | 'refund' | 'adjustment' | 'redemption';
          amount: number;
          wallet_type: 'virtual' | 'actual';
          direction: 'credit' | 'debit';
          kind: 'cashback' | 'referral_reward' | 'refund' | 'order_payment' | 'adjustment';
          order_id: string | null;
          referee_user_id: string | null;
          conversion_id: string | null;
          description: string;
          balance_after: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'cashback' | 'referral' | 'refund' | 'adjustment' | 'redemption';
          amount: number;
          wallet_type: 'virtual' | 'actual';
          direction: 'credit' | 'debit';
          kind: 'cashback' | 'referral_reward' | 'refund' | 'order_payment' | 'adjustment';
          order_id?: string | null;
          referee_user_id?: string | null;
          conversion_id?: string | null;
          description: string;
          balance_after: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'cashback' | 'referral' | 'refund' | 'adjustment' | 'redemption';
          amount?: number;
          wallet_type?: 'virtual' | 'actual';
          direction?: 'credit' | 'debit';
          kind?: 'cashback' | 'referral_conversion' | 'refund' | 'redeem' | 'adjust';
          order_id?: string | null;
          referee_user_id?: string | null;
          conversion_id?: string | null;
          description?: string;
          balance_after?: number;
          created_at?: string;
        };
      };
      referral_conversions: {
        Row: {
          id: string;
          referrer_id: string;
          referee_id: string;
          order_id: string;
          conversion_amount: number;
          virtual_debit_txn_id: string;
          actual_credit_txn_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referee_id: string;
          order_id: string;
          conversion_amount: number;
          virtual_debit_txn_id: string;
          actual_credit_txn_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          referrer_id?: string;
          referee_id?: string;
          order_id?: string;
          conversion_amount?: number;
          virtual_debit_txn_id?: string;
          actual_credit_txn_id?: string;
          created_at?: string;
        };
      };
      returns: {
        Row: {
          id: string;
          order_id: string;
          user_id: string;
          status: 'pending' | 'approved' | 'rejected' | 'picked_up' | 'completed';
          reason: string;
          refund_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          user_id: string;
          status?: 'pending' | 'approved' | 'rejected' | 'picked_up' | 'completed';
          reason: string;
          refund_amount: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          user_id?: string;
          status?: 'pending' | 'approved' | 'rejected' | 'picked_up' | 'completed';
          reason?: string;
          refund_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      return_items: {
        Row: {
          id: string;
          return_id: string;
          order_item_id: string;
          quantity: number;
          refund_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          return_id: string;
          order_item_id: string;
          quantity: number;
          refund_amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          return_id?: string;
          order_item_id?: string;
          quantity?: number;
          refund_amount?: number;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          role: string | null;
          type: string;
          title: string;
          message: string;
          priority: 'high' | 'medium' | 'low';
          entity_id: string | null;
          data: Json;
          read: boolean;
          channel: 'push' | 'sms' | 'in_app';
          locale: 'en' | 'gu';
          sent_at: string | null;
          delivered_at: string | null;
          opened_at: string | null;
          clicked_at: string | null;
          sms_provider_id: string | null;
          push_token: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role?: string | null;
          type: string;
          title: string;
          message: string;
          priority?: 'high' | 'medium' | 'low';
          entity_id?: string | null;
          data?: Json;
          read?: boolean;
          channel?: 'push' | 'sms' | 'in_app';
          locale?: 'en' | 'gu';
          sent_at?: string | null;
          delivered_at?: string | null;
          opened_at?: string | null;
          clicked_at?: string | null;
          sms_provider_id?: string | null;
          push_token?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: string | null;
          type?: string;
          title?: string;
          message?: string;
          priority?: 'high' | 'medium' | 'low';
          entity_id?: string | null;
          data?: Json;
          read?: boolean;
          channel?: 'push' | 'sms' | 'in_app';
          locale?: 'en' | 'gu';
          sent_at?: string | null;
          delivered_at?: string | null;
          opened_at?: string | null;
          clicked_at?: string | null;
          sms_provider_id?: string | null;
          push_token?: string | null;
          created_at?: string;
        };
      };
      notification_templates: {
        Row: {
          id: string;
          type: string;
          locale: 'en' | 'gu';
          title_template: string;
          message_template: string;
          priority: 'high' | 'medium' | 'low';
          channels: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          locale?: 'en' | 'gu';
          title_template: string;
          message_template: string;
          priority?: 'high' | 'medium' | 'low';
          channels?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          locale?: 'en' | 'gu';
          title_template?: string;
          message_template?: string;
          priority?: 'high' | 'medium' | 'low';
          channels?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          push_enabled: boolean;
          sms_enabled: boolean;
          in_app_enabled: boolean;
          locale: 'en' | 'gu';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          push_enabled?: boolean;
          sms_enabled?: boolean;
          in_app_enabled?: boolean;
          locale?: 'en' | 'gu';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          push_enabled?: boolean;
          sms_enabled?: boolean;
          in_app_enabled?: boolean;
          locale?: 'en' | 'gu';
          created_at?: string;
          updated_at?: string;
        };
      };
      notification_analytics: {
        Row: {
          id: string;
          notification_id: string;
          event_type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
          channel: 'push' | 'sms' | 'in_app';
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          notification_id: string;
          event_type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
          channel: 'push' | 'sms' | 'in_app';
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          notification_id?: string;
          event_type?: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
          channel?: 'push' | 'sms' | 'in_app';
          metadata?: Json;
          created_at?: string;
        };
      };
      user_push_tokens: {
        Row: {
          id: string;
          user_id: string;
          expo_push_token: string;
          device_id: string | null;
          platform: 'ios' | 'android' | 'web';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          expo_push_token: string;
          device_id?: string | null;
          platform: 'ios' | 'android' | 'web';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          expo_push_token?: string;
          device_id?: string | null;
          platform?: 'ios' | 'android' | 'web';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      banners: {
        Row: {
          id: string;
          title: string;
          subtitle: string | null;
          image: string;
          action_type: string | null;
          action_value: string | null;
          display_order: number;
          active: boolean;
          start_date: string | null;
          end_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          subtitle?: string | null;
          image: string;
          action_type?: string | null;
          action_value?: string | null;
          display_order?: number;
          active?: boolean;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          subtitle?: string | null;
          image?: string;
          action_type?: string | null;
          action_value?: string | null;
          display_order?: number;
          active?: boolean;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      system_settings: {
        Row: {
          id: string;
          key: string;
          value: Json;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: Json;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: 'admin' | 'vendor' | 'delivery_partner' | 'customer';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: 'admin' | 'vendor' | 'delivery_partner' | 'customer';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: 'admin' | 'vendor' | 'delivery_partner' | 'customer';
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
