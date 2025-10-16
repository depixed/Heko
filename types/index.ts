export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  referralId: string;
  referredBy?: string;
  createdAt: string;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  type: 'home' | 'work' | 'other';
  otherLabel?: string;
  flat: string;
  area?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  images: string[];
  price: number;
  mrp: number;
  discount: number;
  unit: string;
  category: string;
  subcategory: string;
  inStock: boolean;
  tags: string[];
  nutrition?: string;
  ingredients?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  items: {
    product: Product;
    quantity: number;
    price: number;
  }[];
  status: keyof typeof import('@/constants/config').ORDER_STATUS;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  walletUsed: number;
  address: Address;
  deliveryNotes?: string;
  deliveryOtp?: string;
  deliveryPartner?: string;
  deliveryWindow?: string;
  createdAt: string;
  updatedAt: string;
  timeline: {
    status: string;
    timestamp: string;
  }[];
}

export interface WalletTransaction {
  id: string;
  type: keyof typeof import('@/constants/config').WALLET_TRANSACTION_TYPES;
  amount: number;
  walletType: 'virtual' | 'actual';
  direction: 'CREDIT' | 'DEBIT';
  kind: 'CASHBACK' | 'REFERRAL_CONVERSION' | 'REFUND' | 'REDEEM' | 'ADJUST';
  orderId?: string;
  refereeUserId?: string;
  conversionId?: string;
  description: string;
  timestamp: string;
  balanceAfter: number;
}

export interface Wallet {
  virtualBalance: number;
  actualBalance: number;
  transactions: WalletTransaction[];
}

export interface ReferralStats {
  totalReferred: number;
  activeReferrers: number;
  lifetimeEarnings: number;
  thisMonthEarnings: number;
  convertedThisMonth: number;
  lifetimeConverted: number;
  referrals: {
    userId: string;
    userName: string;
    joinedAt: string;
    totalOrders: number;
    totalEarnings: number;
    orders: {
      orderId: string;
      orderDate: string;
      orderAmount: number;
      earning: number;
    }[];
  }[];
}

export type NotificationType = 'ORDERS' | 'WALLET' | 'REFERRALS' | 'PROMOS' | 'SYSTEM';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  unread: boolean;
  deeplink: string;
  payload: Record<string, any>;
}

export interface NotificationFilters {
  types: NotificationType[];
  unreadOnly: boolean;
  range: 'today' | '7d' | '30d' | 'custom';
  customFrom?: string;
  customTo?: string;
}

export interface Category {
  id: string;
  name: string;
  image: string;
  subcategories: string[];
}

export interface Banner {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  action?: string;
}
