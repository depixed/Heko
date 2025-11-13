import { useRouter } from 'expo-router';
import type { Banner } from '@/lib/bannerService';
import { handleDeepLink } from './deepLinkRouter';

/**
 * Handles banner deep links and navigation
 * Uses the centralized DeepLinkRouter for consistent handling
 */
export const handleBannerDeepLink = (banner: Banner, router: ReturnType<typeof useRouter>): void => {
  console.log('[DeepLinkHandler] Handling deeplink for banner:', banner.id, banner.deeplink);

  // If deeplink is provided, use it
  if (banner.deeplink) {
    handleDeepLink(banner.deeplink, router);
    return;
  }

  // Fallback to action_type and action_value
  if (banner.action_type && banner.action_value) {
    // Convert action_type/action_value to deeplink format
    const deeplink = `heko://${banner.action_type}/${banner.action_value}`;
    handleDeepLink(deeplink, router);
    return;
  }

  console.warn('[DeepLinkHandler] No valid deeplink or action found for banner:', banner.id);
};

