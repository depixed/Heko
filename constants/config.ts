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
    LENGTH: 6,
    RESEND_COOLDOWN_SECONDS: 30,
    VOICE_OTP_ENABLED: true,
    AUTO_READ_ENABLED: true,
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
} as const;

export const ORDER_STATUS = {
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
