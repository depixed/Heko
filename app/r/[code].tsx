import { useEffect, useRef, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import Colors from '@/constants/colors';

/**
 * Route handler for referral links: /r/{code}
 * Redirects to signup page with prefilled referral code
 */
export default function ReferralRedirectScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const hasRedirected = useRef(false);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted before navigation (fixes router mounting issue)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Wait for component to be mounted and prevent multiple redirects
    if (!isMounted || hasRedirected.current) return;
    
    const performRedirect = () => {
      if (code) {
        hasRedirected.current = true;
        console.log('[ReferralRedirect] Redirecting to signup with code:', code);
        // Redirect to signup with referral code prefilled
        router.replace({
          pathname: '/auth/signup',
          params: { referralCode: code },
        } as any);
      } else {
        hasRedirected.current = true;
        // If no code provided, redirect to home
        router.replace('/(tabs)' as any);
      }
    };

    // On web, add a delay to ensure router is ready
    if (Platform.OS === 'web') {
      const timer = setTimeout(() => {
        performRedirect();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      performRedirect();
    }
  }, [code, router, isMounted]);

  // Show loading indicator while redirecting
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.brand.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
});

