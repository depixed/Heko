export const APP_CONFIG = {
  APP_NAME: 'HEKO',
  APP_VERSION: '1.0.0',
  
  CASHBACK: {
    SELF_PURCHASE_PERCENTAGE: 2,
    ENABLED: true,
  },
  
  REFERRAL: {
    ENABLED: true,
    COMMISSION_PERCENTAGE: 10,
    SINGLE_LEVEL: true,
  },
  
  WALLET: {
    MAX_REDEMPTION_PERCENTAGE: 100,
    WITHDRAWAL_ENABLED: false,
  },
  
  OTP: {
    LENGTH: 4, // MSG91 widget configured for 4-digit OTP
    RESEND_COOLDOWN_SECONDS: 30,
    VOICE_OTP_ENABLED: true,
    AUTO_READ_ENABLED: true,
  },
  
  MSG91: {
    // These are set via environment variables or app.json extra config
    // Default values are provided in app.json for development
    WIDGET_ID: process.env.EXPO_PUBLIC_MSG91_WIDGET_ID || '366165695848363336343436',
    AUTH_TOKEN: process.env.EXPO_PUBLIC_MSG91_AUTH_TOKEN || '461446TaYcwHhy695b8b6bP1',
  },
  
  DELIVERY: {
    OTP_REQUIRED: true,
  },
  
  PAYMENTS: {
    ONLINE_PREPAY_ENABLED: false,
    CASH_ON_DELIVERY: true,
    UPI_ON_DELIVERY: true,
  },
  
  RETURNS: {
    WINDOW_DAYS: 7,
    PER_ITEM_ALLOWED: true,
  },
  
  BANNER: {
    CACHE_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
    AUTO_PLAY_INTERVAL: 5000,       // 5 seconds
    IMPRESSION_THRESHOLD: 0.5,      // 50% visibility required
    IMPRESSION_DURATION: 1000,      // 1 second minimum visibility
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,              // 1 second between retries
    ENABLED: true,
  },
} as const;

export const ORDER_STATUS = {
  PLACED: 'Placed',
  PROCESSING: 'Processing',
  PREPARING: 'Preparing',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  PARTIALLY_DELIVERED: 'Partially Delivered',
  UNFULFILLABLE: 'Unfulfillable',
  CANCELED: 'Canceled',
  RETURN_IN_PROGRESS: 'Return in Progress',
  RETURNED: 'Returned',
} as const;

export const WALLET_TRANSACTION_TYPES = {
  CASHBACK: 'Cashback',
  REFERRAL: 'Referral Earning',
  REFUND: 'Refund',
  ADJUSTMENT: 'Adjustment',
  REDEMPTION: 'Redemption',
} as const;

export const WALLET_TRANSACTION_KINDS = {
  CASHBACK: 'Cashback Reward',
  REFERRAL_REWARD: 'Referral Reward',
  REFUND: 'Order Refund',
  ORDER_PAYMENT: 'Order Payment',
  ADJUSTMENT: 'Wallet Conversion',
} as const;
