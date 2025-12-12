import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { authService } from '@/lib/auth.service';

export default function SignupScreen() {
  const router = useRouter();
  const { referralCode: urlReferralCode } = useLocalSearchParams<{ referralCode?: string }>();
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Prefill referral code from URL params
  useEffect(() => {
    if (urlReferralCode) {
      setReferralCode(urlReferralCode);
    }
  }, [urlReferralCode]);

  const handleContinue = async () => {
    if (phone.length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number');
      return;
    }

    setIsSending(true);
    try {
      const result = await authService.sendOTP(phone, 'signup');
      if (result.success) {
        router.push({ pathname: '/auth/otp' as any, params: { phone, mode: 'signup', referralCode } });
      } else {
        Alert.alert('Error', result.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('[Signup] Error sending OTP:', error);
      Alert.alert('Error', 'Failed to send OTP');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to start shopping</Text>
        </View>

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.phoneInput}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 10-digit mobile number"
                placeholderTextColor={Colors.text.tertiary}
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
                testID="phone-input"
              />
            </View>
          </View>

          <View>
            <Text style={styles.label}>Referral Code (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter referral code"
              placeholderTextColor={Colors.text.tertiary}
              autoCapitalize="characters"
              value={referralCode}
              onChangeText={setReferralCode}
              testID="referral-input"
            />
            <Text style={styles.hint}>Get 10% cashback on referred user&apos;s orders</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, phone.length === 10 && !isSending && styles.buttonActive]}
            onPress={handleContinue}
            disabled={phone.length !== 10 || isSending}
            testID="continue-button"
          >
            {isSending ? (
              <ActivityIndicator color={Colors.text.inverse} />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.terms}>
            By continuing, you agree to our Terms & Conditions and Privacy Policy
          </Text>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/auth/login' as any)}
          >
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkTextBold}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingTop: 40,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 8,
  },
  form: {
    gap: 24,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  phoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background.secondary,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text.primary,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text.primary,
    backgroundColor: Colors.background.secondary,
  },
  hint: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 6,
  },
  button: {
    backgroundColor: Colors.border.light,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: Colors.brand.primary,
  },
  buttonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  terms: {
    fontSize: 12,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  linkTextBold: {
    color: Colors.brand.primary,
    fontWeight: '600' as const,
  },
});
