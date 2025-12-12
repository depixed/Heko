import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/contexts/AuthContext";
import { AddressProvider } from "@/contexts/AddressContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ProductProvider } from "@/contexts/ProductContext";
import { OrderProvider } from "@/contexts/OrderContext";
import { BannerProvider } from "@/contexts/BannerContext";
import { VendorAssignmentProvider } from "@/contexts/VendorAssignmentContext";
import { useBannerPrefetch } from "@/hooks/useBannerPrefetch";
import TopNav from "@/components/TopNav";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  // Prefetch banners on app launch
  useBannerPrefetch();

  return (
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
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <AddressProvider>
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
            </AddressProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
