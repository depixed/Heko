import { supabase } from '@/lib/supabase';

/**
 * Get user's preferred locale
 */
export async function getUserLocale(userId: string): Promise<'en' | 'gu'> {
  try {
    // Try to get from user preferences
    const { data: preferences } = await supabase
      .from('user_notification_preferences')
      .select('locale')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (preferences?.locale) {
      return preferences.locale as 'en' | 'gu';
    }

    // Default to English
    return 'en';
  } catch (error) {
    console.error('[LOCALIZATION] Error getting user locale:', error);
    return 'en';
  }
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, locale: 'en' | 'gu' = 'en'): string {
  const formatted = new Intl.NumberFormat(locale === 'gu' ? 'gu-IN' : 'en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return formatted;
}

/**
 * Format date
 */
export function formatDate(date: Date | string, locale: 'en' | 'gu' = 'en'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === 'gu' ? 'gu-IN' : 'en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj);
}

/**
 * Format time
 */
export function formatTime(date: Date | string, locale: 'en' | 'gu' = 'en'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === 'gu' ? 'gu-IN' : 'en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(dateObj);
}

/**
 * Simple translation helper (can be extended with i18n library)
 */
const translations: Record<string, Record<'en' | 'gu', string>> = {
  'notification.order_confirmed': {
    en: 'Order Confirmed',
    gu: 'ઓર્ડર પુષ્ટિ',
  },
  'notification.order_delivered': {
    en: 'Order Delivered',
    gu: 'ઓર્ડર ડિલિવર કર્યું',
  },
  // Add more translations as needed
};

export function translate(key: string, locale: 'en' | 'gu' = 'en'): string {
  return translations[key]?.[locale] || translations[key]?.['en'] || key;
}

