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
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
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
          status: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';
          picked_at: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          delivery_partner_id: string;
          status?: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';
          picked_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          delivery_partner_id?: string;
          status?: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';
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
          kind: 'cashback' | 'referral_conversion' | 'refund' | 'redeem' | 'adjust';
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
          kind: 'cashback' | 'referral_conversion' | 'refund' | 'redeem' | 'adjust';
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
          referrer_user_id: string;
          referee_user_id: string;
          order_id: string;
          conversion_amount: number;
          virtual_debit_txn_id: string;
          actual_credit_txn_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_user_id: string;
          referee_user_id: string;
          order_id: string;
          conversion_amount: number;
          virtual_debit_txn_id: string;
          actual_credit_txn_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          referrer_user_id?: string;
          referee_user_id?: string;
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
          type: 'orders' | 'wallet' | 'referrals' | 'promos' | 'system';
          title: string;
          body: string;
          deeplink: string;
          payload: Json;
          unread: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'orders' | 'wallet' | 'referrals' | 'promos' | 'system';
          title: string;
          body: string;
          deeplink: string;
          payload?: Json;
          unread?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'orders' | 'wallet' | 'referrals' | 'promos' | 'system';
          title?: string;
          body?: string;
          deeplink?: string;
          payload?: Json;
          unread?: boolean;
          created_at?: string;
        };
      };
      banners: {
        Row: {
          id: string;
          image: string;
          title: string;
          subtitle: string | null;
          action: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          image: string;
          title: string;
          subtitle?: string | null;
          action?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          image?: string;
          title?: string;
          subtitle?: string | null;
          action?: string | null;
          sort_order?: number;
          is_active?: boolean;
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
