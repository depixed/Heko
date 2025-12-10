import { Linking, Platform } from 'react-native';
import type { Router } from 'expo-router';

export interface DeepLinkAction {
  type: string;
  value: string;
  params?: Record<string, string>;
}

export class DeepLinkRouter {
  private router: Router;

  constructor(router: Router) {
    this.router = router;
  }

  /**
   * Parses a deep link string into a DeepLinkAction
   * 
   * Supported formats:
   * - "heko://category?groceries" -> { type: 'category', value: 'groceries' }
   * - "heko://product?product_id=123" -> { type: 'product', value: '123', params: { product_id: '123' } }
   * - "heko://offer?offer_id=456" -> { type: 'offer', value: '456', params: { offer_id: '456' } }
   * - "heko://search?q=apples" -> { type: 'search', value: 'apples', params: { q: 'apples' } }
   * - "heko://category/123" -> { type: 'category', value: '123' }
   * - "heko://product/123" -> { type: 'product', value: '123' }
   * - "https://example.com" -> { type: 'url', value: 'https://example.com' }
   */
  parseDeepLink(deeplink: string): DeepLinkAction | null {
    if (!deeplink || typeof deeplink !== 'string') {
      console.warn('[DeepLinkRouter] Invalid deeplink:', deeplink);
      return null;
    }

    console.log('[DeepLinkRouter] Parsing deeplink:', deeplink);

    // Handle external URLs - but check if it's an internal route first
    if (deeplink.startsWith('http://') || deeplink.startsWith('https://')) {
      try {
        const url = new URL(deeplink);
        const path = url.pathname;
        
        // List of internal routes that should be handled as app navigation
        const internalRoutes = [
          '/referral',
          '/category',
          '/product',
          '/order',
          '/wallet',
          '/cart',
          '/checkout',
          '/addresses',
          '/notifications',
          '/home',
          '/',
        ];
        
        // Check if the path matches an internal route
        const isInternalRoute = internalRoutes.some(route => 
          path === route || path.startsWith(`${route}/`)
        );
        
        if (isInternalRoute) {
          // Extract the path and handle as internal navigation
          console.log('[DeepLinkRouter] Detected internal route in HTTP URL:', path);
          // Remove leading slash and parse as internal route
          const internalPath = path.startsWith('/') ? path.substring(1) : path;
          
          // Handle referral route specifically
          if (internalPath === 'referral') {
            return {
              type: 'referral',
              value: '',
            };
          }
          
          // Handle other routes by extracting type and value
          const pathParts = internalPath.split('/');
          if (pathParts.length >= 2) {
            return {
              type: pathParts[0].toLowerCase(),
              value: pathParts[1],
              params: this.parseQueryString(url.search.substring(1)),
            };
          }
          
          // Handle simple routes like /referral, /wallet, etc.
          if (pathParts.length === 1 && pathParts[0]) {
            return {
              type: pathParts[0].toLowerCase(),
              value: '',
              params: this.parseQueryString(url.search.substring(1)),
            };
          }
        }
      } catch (error) {
        // If URL parsing fails, treat as external URL
        console.warn('[DeepLinkRouter] Failed to parse URL, treating as external:', error);
      }
      
      // If not an internal route, treat as external URL
      return {
        type: 'url',
        value: deeplink,
      };
    }

    // Remove protocol if present
    let path = deeplink.replace(/^heko:\/\//, '').replace(/^myapp:\/\//, '');
    
    // Remove leading slash if present
    if (path.startsWith('/')) {
      path = path.substring(1);
    }

    // Handle query parameters
    const [routePath, queryString] = path.split('?');
    const params = this.parseQueryString(queryString);

    // Handle path-based format: "category/123" or "product/123"
    const pathParts = routePath.split('/');
    
    if (pathParts.length >= 2) {
      const type = pathParts[0];
      const value = pathParts[1];
      
      return {
        type: type.toLowerCase(),
        value,
        params,
      };
    }

    // Handle query-based format: "category?groceries" or "product?product_id=123"
    if (routePath.includes('?')) {
      // Already handled above
    }

    // Handle simple format: "category?groceries" (value in query)
    const [actionType, actionValue] = routePath.split('?');
    
    if (actionValue) {
      // Value is in the query string
      const firstParam = Object.keys(params)[0];
      return {
        type: actionType.toLowerCase(),
        value: params[firstParam] || actionValue,
        params,
      };
    }

    // Handle query-only format: "?category=groceries" or "?product_id=123"
    if (routePath === '' && queryString) {
      // Try to infer type from query params
      if (params.category) {
        return { type: 'category', value: params.category, params };
      }
      if (params.product_id) {
        return { type: 'product', value: params.product_id, params };
      }
      if (params.offer_id) {
        return { type: 'offer', value: params.offer_id, params };
      }
      if (params.q || params.query) {
        return { type: 'search', value: params.q || params.query, params };
      }
    }

    // Handle simple action: "category" with value in params
    if (routePath && Object.keys(params).length > 0) {
      const firstParamValue = Object.values(params)[0];
      return {
        type: routePath.toLowerCase(),
        value: firstParamValue as string,
        params,
      };
    }

    // Handle simple route: "wallet", "home", etc.
    if (routePath && !queryString) {
      return {
        type: routePath.toLowerCase(),
        value: '',
      };
    }

    console.warn('[DeepLinkRouter] Could not parse deeplink:', deeplink);
    return null;
  }

  /**
   * Parses query string into key-value pairs
   */
  private parseQueryString(queryString?: string): Record<string, string> {
    const params: Record<string, string> = {};
    
    if (!queryString) {
      return params;
    }

    const pairs = queryString.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
      }
    }

    return params;
  }

  /**
   * Handles a deep link by parsing and navigating
   */
  handleDeepLink(deeplink: string): void {
    const action = this.parseDeepLink(deeplink);

    if (!action) {
      console.warn('[DeepLinkRouter] No action parsed from deeplink:', deeplink);
      return;
    }

    console.log('[DeepLinkRouter] Handling action:', action);

    switch (action.type) {
      case 'category':
        this.navigateToCategory(action.value, action.params);
        break;

      case 'product':
        this.navigateToProduct(action.value, action.params);
        break;

      case 'offer':
        this.navigateToOffer(action.value, action.params);
        break;

      case 'search':
        this.navigateToSearch(action.value, action.params);
        break;

      case 'order':
      case 'orders':
        this.navigateToOrder(action.value, action.params);
        break;

      case 'delivery':
        // Navigate to order tracking/delivery screen
        this.navigateToOrder(action.value, action.params);
        break;

      case 'wallet':
        this.navigateToWallet();
        break;

      case 'referral':
        this.navigateToReferral();
        break;

      case 'returns':
        // Navigate to return details
        this.navigateToOrder(action.params?.order_id || action.value, action.params);
        break;

      case 'cart':
        this.navigateToCart();
        break;

      case 'checkout':
        this.navigateToCheckout();
        break;

      case 'addresses':
      case 'address':
        this.navigateToAddresses(action.params);
        break;

      case 'notifications':
        this.navigateToNotifications();
        break;

      case 'home':
      case '':
        this.navigateToHome();
        break;

      case 'url':
        this.openExternalUrl(action.value);
        break;

      default:
        console.warn('[DeepLinkRouter] Unknown deep link type:', action.type);
        // Try to navigate directly as a fallback
        this.navigateToRoute(deeplink);
    }
  }

  /**
   * Navigate to category page
   */
  private navigateToCategory(categoryId: string, params?: Record<string, string>): void {
    const queryString = params ? this.buildQueryString(params) : '';
    this.router.push(`/category/${categoryId}${queryString ? `?${queryString}` : ''}` as any);
  }

  /**
   * Navigate to product detail page
   */
  private navigateToProduct(productId: string, params?: Record<string, string>): void {
    const queryString = params ? this.buildQueryString(params) : '';
    this.router.push(`/product/${productId}${queryString ? `?${queryString}` : ''}` as any);
  }

  /**
   * Navigate to offers page (or home with offers filter)
   */
  private navigateToOffer(offerId: string, params?: Record<string, string>): void {
    // For now, navigate to home with offer filter
    // Can be enhanced to have a dedicated offers page
    const queryString = this.buildQueryString({ offer_id: offerId, ...params });
    this.router.push(`/(tabs)?${queryString}` as any);
    console.log('[DeepLinkRouter] Offer navigation - offerId:', offerId);
  }

  /**
   * Navigate to search with query
   */
  private navigateToSearch(query: string, params?: Record<string, string>): void {
    // Navigate to home and trigger search
    const searchParams = { q: query, ...params };
    const queryString = this.buildQueryString(searchParams);
    this.router.push(`/(tabs)?${queryString}` as any);
    console.log('[DeepLinkRouter] Search navigation - query:', query);
  }

  /**
   * Navigate to order detail page
   */
  private navigateToOrder(orderId: string, params?: Record<string, string>): void {
    const queryString = params ? this.buildQueryString(params) : '';
    this.router.push(`/order/${orderId}${queryString ? `?${queryString}` : ''}` as any);
  }

  /**
   * Navigate to wallet page
   */
  private navigateToWallet(): void {
    this.router.push('/wallet' as any);
  }

  /**
   * Navigate to referral page
   */
  private navigateToReferral(): void {
    this.router.push('/referral' as any);
  }

  /**
   * Navigate to cart page
   */
  private navigateToCart(): void {
    this.router.push('/cart' as any);
  }

  /**
   * Navigate to checkout page
   */
  private navigateToCheckout(): void {
    this.router.push('/checkout' as any);
  }

  /**
   * Navigate to addresses page
   */
  private navigateToAddresses(params?: Record<string, string>): void {
    const queryString = params ? this.buildQueryString(params) : '';
    this.router.push(`/addresses${queryString ? `?${queryString}` : ''}` as any);
  }

  /**
   * Navigate to notifications page
   */
  private navigateToNotifications(): void {
    this.router.push('/notifications' as any);
  }

  /**
   * Navigate to home page
   */
  private navigateToHome(): void {
    this.router.push('/(tabs)' as any);
  }

  /**
   * Open external URL
   */
  private async openExternalUrl(url: string): Promise<void> {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        console.log('[DeepLinkRouter] Opened external URL:', url);
      } else {
        console.warn('[DeepLinkRouter] Cannot open URL:', url);
      }
    } catch (error) {
      console.error('[DeepLinkRouter] Error opening URL:', error);
    }
  }

  /**
   * Navigate to a route directly (fallback)
   */
  private navigateToRoute(path: string): void {
    // Remove protocol
    let route = path.replace(/^heko:\/\//, '').replace(/^myapp:\/\//, '');
    
    // Ensure leading slash
    if (!route.startsWith('/')) {
      route = `/${route}`;
    }

    try {
      this.router.push(route as any);
    } catch (error) {
      console.error('[DeepLinkRouter] Error navigating to route:', error);
    }
  }

  /**
   * Builds query string from params object
   */
  private buildQueryString(params: Record<string, string>): string {
    const pairs = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    
    return pairs.join('&');
  }
}

/**
 * Hook to get DeepLinkRouter instance
 */
export const useDeepLinkRouter = (router: Router): DeepLinkRouter => {
  return new DeepLinkRouter(router);
};

/**
 * Standalone function to handle deep links (for use outside components)
 */
export const handleDeepLink = (deeplink: string, router: Router): void => {
  const deepLinkRouter = new DeepLinkRouter(router);
  deepLinkRouter.handleDeepLink(deeplink);
};

