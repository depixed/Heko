export const SUPABASE_CONFIG = {
  URL: 'https://kilpufxhteouojcyzqto.supabase.co',
  PUBLISHABLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbHB1ZnhodGVvdW9qY3l6cXRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0OTk3NzQsImV4cCI6MjA3NjA3NTc3NH0.VqBi37DLiUwJ87KLGhumbCASK376QpqeM6NWms_aDIY',
  PROJECT_ID: 'kilpufxhteouojcyzqto',
} as const;

export const SUPABASE_TABLES = {
  PROFILES: 'profiles',
  USER_ADDRESSES: 'user_addresses',
  CATEGORIES: 'categories',
  SUBCATEGORIES: 'subcategories',
  PRODUCTS: 'products',
  VENDOR_PRODUCTS: 'vendor_products',
  VENDORS: 'vendors',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
  DELIVERIES: 'deliveries',
  DELIVERY_ITEMS: 'delivery_items',
  DELIVERY_PARTNERS: 'delivery_partners',
  WALLET_TRANSACTIONS: 'wallet_transactions',
  REFERRAL_CONVERSIONS: 'referral_conversions',
  RETURNS: 'returns',
  RETURN_ITEMS: 'return_items',
  NOTIFICATIONS: 'notifications',
  BANNERS: 'banners',
  SYSTEM_SETTINGS: 'system_settings',
  USER_ROLES: 'user_roles',
} as const;
