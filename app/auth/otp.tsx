import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { APP_CONFIG } from '@/constants/config';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/lib/auth.service';
import { msg91Service } from '@/lib/msg91.service';

type FlowStage = 'otp' | 'profile';

export default function OTPScreen() {
  const router = useRouter();
  const { phone, mode, referralCode } = useLocalSearchParams<{ phone: string; mode: 'login' | 'signup'; referralCode?: string }>();
  const { login } = useAuth();
  const [stage, setStage] = useState<FlowStage>('otp');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState<number>(APP_CONFIG.OTP.RESEND_COOLDOWN_SECONDS);
  const [isVerifying, setIsVerifying] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // DISABLED: MSG91 SDK initialization - Using Fast2SMS via backend API only
  // No initialization needed for backend API flow
  /*
  useEffect(() => {
    // MSG91 service is initialized in root layout, no need to initialize here
    // Just ensure it's ready
    msg91Service.initialize().catch((error) => {
      console.error('[OTP] Failed to initialize MSG91:', error);
    });
  }, []);
  */

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOTPChange = (value: string) => {
    // Fast2SMS uses 6-digit OTP (configurable in backend)
    const numericValue = value.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(numericValue);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the complete 6-digit OTP');
      return;
    }

    if (!phone) {
      Alert.alert('Error', 'Phone number is required');
      return;
    }

    setIsVerifying(true);
    try {
      // Verify OTP directly with backend (Fast2SMS or MSG91 based on backend config)
      // Backend returns user status directly
      const { SUPABASE_CONFIG } = await import('@/constants/supabase');
      const FUNCTIONS_URL = `${SUPABASE_CONFIG.URL}/functions/v1`;
      
      const response = await fetch(`${FUNCTIONS_URL}/customer-verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_CONFIG.PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ 
          phone: phone.replace(/^\+/, '').replace(/^91/, ''),
          otp: otp
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to verify OTP');
        return;
      }

      if (result.isNewUser) {
        // New user - show profile completion form
        setStage('profile');
      } else if (result.user && result.sessionToken) {
        // Existing user - login successful
        const user = {
          id: result.user.id,
          name: result.user.name,
          phone: result.user.phone,
          email: result.user.email || undefined,
          referralId: result.user.referral_code,
          referredBy: result.user.referred_by || undefined,
          createdAt: result.user.created_at,
        };
        await login(user, result.sessionToken);
        router.replace('/(tabs)/' as any);
      } else {
        Alert.alert('Error', 'Invalid response from server');
      }
    } catch (error: any) {
      console.error('[OTP] Error verifying OTP:', error);
      Alert.alert('Error', error.message || 'Failed to verify OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!name.trim()) {
      Alert.alert('Invalid Name', 'Please enter your name');
      return;
    }

    if (email && !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setIsCreating(true);
    try {
      const result = await authService.signUp({
        name: name.trim(),
        phone,
        email: email.trim() || undefined,
        referredBy: referralCode || undefined,
      });

      if (result.success && result.user && result.token) {
        await login(result.user, result.token);
        router.replace('/(tabs)/' as any);
      } else {
        Alert.alert('Error', result.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('[OTP] Error creating account:', error);
      Alert.alert('Error', 'Failed to create account');
    } finally {
      setIsCreating(false);
    }
  };

  const handleResend = async () => {
    if (!phone) return;
    
    try {
      // Resend OTP via backend
      await msg91Service.sendOtp(phone);
      setCountdown(APP_CONFIG.OTP.RESEND_COOLDOWN_SECONDS);
      Alert.alert('OTP Sent', 'A new OTP has been sent to your mobile number');
    } catch (error: any) {
      console.error('[OTP] Error resending OTP:', error);
      Alert.alert('Error', error.message || 'Failed to send OTP');
    }
  };

  // Stage 2: Profile Details (for new users)
  if (stage === 'profile') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', android: 'height', web: undefined })}
          style={styles.keyboardAvoid}
        >
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.title}>Complete Your Profile</Text>
              <Text style={styles.subtitle}>Tell us a bit about yourself</Text>
            </View>

            <View style={styles.form}>
              <View>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your full name"
                  placeholderTextColor={Colors.text.tertiary}
                  autoCapitalize="words"
                  value={name}
                  onChangeText={setName}
                  testID="name-input"
                />
              </View>

              <View>
                <Text style={styles.label}>Email Address (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your email"
                  placeholderTextColor={Colors.text.tertiary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  testID="email-input"
                />
              </View>

              {referralCode && (
                <View style={styles.referralBadge}>
                  <Text style={styles.referralText}>
                    Referral Code: <Text style={styles.referralCode}>{referralCode}</Text>
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, name.trim() && !isCreating && styles.buttonActive]}
                onPress={handleCreateAccount}
                disabled={!name.trim() || isCreating}
                testID="create-account-button"
              >
                {isCreating ? (
                  <ActivityIndicator color={Colors.text.inverse} />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Stage 1: OTP Verification
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to +91 {phone}
          </Text>
        </View>

        <View style={styles.otpContainer}>
          <TextInput
            style={styles.otpInput}
            placeholder="Enter OTP"
            placeholderTextColor={Colors.text.tertiary}
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={handleOTPChange}
            autoFocus={true}
            testID="otp-input"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, otp.length === 6 && !isVerifying && styles.buttonActive]}
          onPress={handleVerifyOTP}
          disabled={otp.length !== 6 || isVerifying}
          testID="verify-button"
        >
          {isVerifying ? (
            <ActivityIndicator color={Colors.text.inverse} />
          ) : (
            <Text style={styles.buttonText}>Verify & Continue</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          {countdown > 0 ? (
            <Text style={styles.resendText}>Resend OTP in {countdown}s</Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendLink}>Resend OTP</Text>
            </TouchableOpacity>
          )}
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
  keyboardAvoid: {
    flex: 1,
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
    lineHeight: 24,
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
  referralBadge: {
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.brand.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  referralText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  referralCode: {
    fontWeight: '700' as const,
    color: Colors.brand.primary,
  },
  otpContainer: {
    marginBottom: 32,
  },
  otpInput: {
    width: '100%',
    height: 56,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 16,
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
  resendContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  resendText: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
  resendLink: {
    fontSize: 14,
    color: Colors.brand.primary,
    fontWeight: '600' as const,
  },
});
