import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { APP_CONFIG } from '@/constants/config';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/lib/auth.service';

export default function OTPScreen() {
  const router = useRouter();
  const { phone, mode, referralCode } = useLocalSearchParams<{ phone: string; mode: 'login' | 'signup'; referralCode?: string }>();
  const { login } = useAuth();
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState<number>(APP_CONFIG.OTP.RESEND_COOLDOWN_SECONDS);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOTPChange = (value: string, index: number) => {
    const newOtp = otp.split('');
    newOtp[index] = value;
    setOtp(newOtp.join(''));

    if (value && index < APP_CONFIG.OTP.LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== APP_CONFIG.OTP.LENGTH) {
      Alert.alert('Invalid OTP', 'Please enter the complete OTP');
      return;
    }

    if (!phone) {
      Alert.alert('Error', 'Phone number is required');
      return;
    }

    setIsVerifying(true);
    try {
      if (mode === 'login') {
        const result = await authService.verifyOTPLogin(phone, otp);
        
        if (result.success && result.isNewUser) {
          // New user detected during login - redirect to signup flow
          setOtpVerified(true);
        } else if (result.success && result.user && result.token) {
          // Existing user - proceed with login
          await login(result.user, result.token);
          router.replace('/(tabs)/' as any);
        } else {
          Alert.alert('Error', result.error || 'Failed to verify OTP');
        }
      } else {
        const result = await authService.verifyOTPSignup(phone, otp);
        
        if (result.success) {
          setOtpVerified(true);
        } else {
          Alert.alert('Error', result.error || 'Failed to verify OTP');
        }
      }
    } catch (error) {
      console.error('[OTP] Error verifying OTP:', error);
      Alert.alert('Error', 'Failed to verify OTP');
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
      const result = await authService.sendOTP(phone, mode);
      if (result.success) {
        setCountdown(APP_CONFIG.OTP.RESEND_COOLDOWN_SECONDS);
        Alert.alert('OTP Sent', 'A new OTP has been sent to your mobile number');
      } else {
        Alert.alert('Error', result.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('[OTP] Error resending OTP:', error);
      Alert.alert('Error', 'Failed to send OTP');
    }
  };

  if (otpVerified && (mode === 'signup' || mode === 'login')) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', android: 'height', web: undefined })}
          style={styles.keyboardAvoid}
        >
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.title}>Complete Your Profile</Text>
              <Text style={styles.subtitle}>
                {mode === 'login' 
                  ? 'This phone number is not registered. Please complete your profile to create an account.'
                  : 'Tell us a bit about yourself'}
              </Text>
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the {APP_CONFIG.OTP.LENGTH}-digit code sent to +91 {phone}
          </Text>
        </View>

        <View style={styles.otpContainer}>
          {Array.from({ length: APP_CONFIG.OTP.LENGTH }).map((_, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={1}
              value={otp[index] || ''}
              onChangeText={(value) => handleOTPChange(value, index)}
              testID={`otp-input-${index}`}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, otp.length === APP_CONFIG.OTP.LENGTH && !isVerifying && styles.buttonActive]}
          onPress={handleVerifyOTP}
          disabled={otp.length !== APP_CONFIG.OTP.LENGTH || isVerifying}
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

        {APP_CONFIG.OTP.VOICE_OTP_ENABLED && countdown === 0 && (
          <TouchableOpacity style={styles.voiceButton}>
            <Text style={styles.voiceButtonText}>Get OTP via call</Text>
          </TouchableOpacity>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    backgroundColor: Colors.background.secondary,
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
  voiceButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  voiceButtonText: {
    fontSize: 14,
    color: Colors.brand.primary,
    fontWeight: '600' as const,
  },
});
