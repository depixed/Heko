import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { APP_CONFIG } from '@/constants/config';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>{APP_CONFIG.APP_NAME}</Text>
          <Text style={styles.tagline}>Fresh groceries at your doorstep</Text>
        </View>

        <View style={styles.illustration}>
          <Text style={styles.illustrationEmoji}>🛒</Text>
          <Text style={styles.illustrationText}>Order daily essentials</Text>
          <Text style={styles.illustrationSubtext}>Get cashback & earn from referrals</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/auth/login' as any)}
            testID="login-button"
          >
            <Text style={styles.primaryButtonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/auth/signup' as any)}
            testID="signup-button"
          >
            <Text style={styles.secondaryButtonText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  logo: {
    fontSize: 48,
    fontWeight: '900' as const,
    color: Colors.brand.primary,
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 8,
  },
  illustration: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  illustrationEmoji: {
    fontSize: 120,
  },
  illustrationText: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginTop: 24,
  },
  illustrationSubtext: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  actions: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: Colors.brand.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  secondaryButton: {
    backgroundColor: Colors.background.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  secondaryButtonText: {
    color: Colors.brand.primary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
