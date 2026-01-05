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

  useEffect(() => {
    // MSG91 service is initialized in root layout, no need to initialize here
    // Just ensure it's ready
    msg91Service.initialize().catch((error) => {
      console.error('[OTP] Failed to initialize MSG91:', error);
    });
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOTPChange = (value: string) => {
    // MSG91 widget configured for 4-digit OTP
    const numericValue = value.replace(/[^0-9]/g, '').slice(0, 4);
    setOtp(numericValue);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter the complete 4-digit OTP');
      return;
    }

    if (!phone) {
      Alert.alert('Error', 'Phone number is required');
      return;
    }

    setIsVerifying(true);
    try {
      // Step 1: Verify OTP with MSG91 SDK (returns accessToken)
      const accessToken = await msg91Service.verifyOtp(otp, phone);
      
      // Step 2: Verify token with backend and check user status
      const result = await authService.verifyMsg91Token(accessToken, phone);
      
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to verify token');
        return;
      }

      if (result.isNewUser) {
        // New user - show profile completion form
        setStage('profile');
      } else if (result.user && result.token) {
        // Existing user - login successful
        await login(result.user, result.token);
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
      await msg91Service.retryOtp(phone, null); // null = default channel (SMS)
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
            Enter the 4-digit code sent to +91 {phone}
          </Text>
        </View>

        <View style={styles.otpContainer}>
          <TextInput
            style={styles.otpInput}
            placeholder="Enter OTP"
            placeholderTextColor={Colors.text.tertiary}
            keyboardType="number-pad"
            maxLength={4}
            value={otp}
            onChangeText={handleOTPChange}
            autoFocus={true}
            testID="otp-input"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, otp.length === 4 && !isVerifying && styles.buttonActive]}
          onPress={handleVerifyOTP}
          disabled={otp.length !== 4 || isVerifying}
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
