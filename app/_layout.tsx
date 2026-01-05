import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Linking, Platform } from "react-native";
import { ExposeOTPVerification } from '@msg91comm/react-native-sendotp';
import { AuthProvider } from "@/contexts/AuthContext";
import { AddressProvider } from "@/contexts/AddressContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ProductProvider } from "@/contexts/ProductContext";
import { OrderProvider } from "@/contexts/OrderContext";
import { BannerProvider } from "@/contexts/BannerContext";
import { VendorAssignmentProvider } from "@/contexts/VendorAssignmentContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { useBannerPrefetch } from "@/hooks/useBannerPrefetch";
import TopNav from "@/components/TopNav";
import InstallPrompt from "@/components/InstallPrompt";
import PWADiagnostics from "@/components/PWADiagnostics";
import { handleDeepLink } from "@/utils/deepLinkRouter";
import { msg91Service } from "@/lib/msg91.service";
import { APP_CONFIG } from "@/constants/config";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();
  const exposeOTPRef = useRef<React.ComponentRef<typeof ExposeOTPVerification>>(null);
  
  // Prefetch banners on app launch
  useBannerPrefetch();

  // Initialize MSG91 service and set ref when component mounts
  useEffect(() => {
    // Initialize MSG91 service first
    msg91Service.initialize().catch((error) => {
      console.error('[RootLayout] Failed to initialize MSG91:', error);
    });
  }, []);

  // Callback to set ref when component mounts
  const setExposeOTPRef = (ref: React.ComponentRef<typeof ExposeOTPVerification> | null) => {
    exposeOTPRef.current = ref;
    if (ref) {
      msg91Service.setRef(ref);
      console.log('[RootLayout] MSG91 ref set via callback');
    }
  };

  // Handle deep links (initial URL and URL changes)
  useEffect(() => {
    // On web, check for referral links in the current URL
    if (Platform.OS === 'web') {
      // Check if current URL matches referral pattern: /r/{code}
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path.startsWith('/r/')) {
          // The route file will handle the redirect, but we can log it
          console.log('[RootLayout] Web referral link detected:', path);
        }
      }
      return; // Skip native deep link handling on web
    }

    let hasHandledInitialURL = false;
    let isNavigating = false;

    // Handle initial URL when app opens from a link (only once)
    const handleInitialURL = async () => {
      if (hasHandledInitialURL || isNavigating) return;
      
      try {
        const initialURL = await Linking.getInitialURL();
        if (initialURL) {
          hasHandledInitialURL = true;
          isNavigating = true;
          console.log('[RootLayout] Initial URL detected:', initialURL);
          // Use setTimeout to ensure router is ready
          setTimeout(() => {
            handleDeepLink(initialURL, router);
            isNavigating = false;
          }, 500);
        }
      } catch (error) {
        console.error('[RootLayout] Error getting initial URL:', error);
        isNavigating = false;
      }
    };

    // Handle URL changes when app is already open
    const handleURLChange = (event: { url: string }) => {
      if (isNavigating) return;
      
      isNavigating = true;
      console.log('[RootLayout] URL change detected:', event.url);
      // Use setTimeout to debounce and ensure router is ready
      setTimeout(() => {
        handleDeepLink(event.url, router);
        isNavigating = false;
      }, 300);
    };

    // Set up listeners for native platforms
    handleInitialURL();
    const subscription = Linking.addEventListener('url', handleURLChange);
    
    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  return (
    <>
      <Stack
        screenOptions={{
          headerBackTitle: "Back",
          header: ({ options, route }) => {
            // Don't show header for splash and auth screens
            if (route.name === 'splash' || route.name === 'auth' || route.name === '(tabs)') {
              return null;
            }
            return <TopNav title={options.title} headerRight={options.headerRight} />;
          },
        }}
      >
        <Stack.Screen name="splash" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: "Product Details" }} />
        <Stack.Screen name="cart" options={{ title: "Cart" }} />
        <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
        <Stack.Screen name="order/[id]" options={{ title: "Order Details" }} />
        <Stack.Screen name="wallet" options={{ title: "My Wallet" }} />
        <Stack.Screen name="referral" options={{ title: "Refer & Earn" }} />
        <Stack.Screen name="addresses" options={{ title: "Delivery Address" }} />
        <Stack.Screen name="address" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        <Stack.Screen name="category/[id]" options={{ title: "" }} />
        <Stack.Screen name="subcategory/[categoryId]/[subcategory]" options={{ title: "" }} />
      </Stack>
      <InstallPrompt />
      <PWADiagnostics />
      
      {/* MSG91 ExposeOTPVerification component (hidden, used for SDK methods globally) */}
      {/* Only render on native platforms - WebView doesn't work on web */}
      {Platform.OS !== 'web' && (
        <ExposeOTPVerification
          ref={setExposeOTPRef}
          widgetId={APP_CONFIG.MSG91.WIDGET_ID}
          authToken={APP_CONFIG.MSG91.AUTH_TOKEN}
          getWidgetData={(widgetData) => {
            console.log('[RootLayout] MSG91 Widget data received:', widgetData);
          }}
        />
      )}
    </>
  );
}

// React Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Silently recover - don't show error UI to user
      // Just log and continue
      return this.props.children;
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    
    // Only set up unhandled rejection handler on web
    if (Platform.OS === 'web') {
      const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
        console.error('[RootLayout] Unhandled promise rejection:', event.reason);
      };
      
      window.addEventListener('unhandledrejection', unhandledRejectionHandler);
      
      return () => {
        window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
      };
    }
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
              <AddressProvider>
                <LocationProvider>
                  <VendorAssignmentProvider>
                    <ProductProvider>
                      <BannerProvider>
                        <OrderProvider>
                          <NotificationProvider>
                            <RootLayoutNav />
                          </NotificationProvider>
                        </OrderProvider>
                      </BannerProvider>
                    </ProductProvider>
                  </VendorAssignmentProvider>
                </LocationProvider>
              </AddressProvider>
            </AuthProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
