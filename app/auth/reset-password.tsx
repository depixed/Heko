import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { APP_CONFIG } from '@/constants/config';
import { authService } from '@/lib/auth.service';
import PasswordInput from '@/components/PasswordInput';
import { validatePassword, passwordsMatch } from '@/lib/password.utils';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countdown, setCountdown] = useState<number>(APP_CONFIG.OTP.RESEND_COOLDOWN_SECONDS);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOTPChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '').slice(0, APP_CONFIG.OTP.LENGTH);
    setOtp(numericValue);
  };

  const handleResetPassword = async () => {
    if (otp.length !== APP_CONFIG.OTP.LENGTH) {
      Alert.alert('Invalid OTP', 'Please enter the complete OTP');
      return;
    }

    const validation = validatePassword(password);
    if (!validation.isValid) {
      Alert.alert('Invalid Password', validation.errors.join('\n'));
      return;
    }

    if (!passwordsMatch(password, confirmPassword)) {
      Alert.alert('Passwords Do Not Match', 'Please make sure both passwords are the same');
      return;
    }

    setIsResetting(true);
    try {
      const result = await authService.resetPassword(phone, otp, password);
      
      if (result.success) {
        Alert.alert(
          'Password Reset Successful',
          'Your password has been reset successfully. Please login with your new password.',
          [
            { 
              text: 'Go to Login', 
              onPress: () => router.replace('/auth/login' as any) 
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('[ResetPassword] Error resetting password:', error);
      Alert.alert('Error', 'Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };

  const handleResend = async () => {
    if (!phone) return;
    
    try {
      const result = await authService.sendOTP(phone, 'login');
      if (result.success) {
        setCountdown(APP_CONFIG.OTP.RESEND_COOLDOWN_SECONDS);
        Alert.alert('OTP Sent', 'A new OTP has been sent to your mobile number');
      } else {
        Alert.alert('Error', result.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('[ResetPassword] Error resending OTP:', error);
      Alert.alert('Error', 'Failed to send OTP');
    }
  };

  const validation = validatePassword(password);
  const doPasswordsMatch = passwordsMatch(password, confirmPassword);
  const canSubmit = otp.length === APP_CONFIG.OTP.LENGTH && validation.isValid && doPasswordsMatch;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerBar}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={Colors.brand.primary} />
        </TouchableOpacity>
        <Text style={styles.logoText}>HEKO</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: 'height', web: undefined })}
        style={styles.keyboardAvoid}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter the OTP sent to +91 {phone} and create a new password
            </Text>
          </View>

          <View style={styles.form}>
            <View>
              <Text style={styles.label}>OTP Code</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="Enter OTP"
                placeholderTextColor={Colors.text.tertiary}
                keyboardType="number-pad"
                maxLength={APP_CONFIG.OTP.LENGTH}
                value={otp}
                onChangeText={handleOTPChange}
                autoFocus={true}
                testID="otp-input"
              />
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

            <PasswordInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter new password"
              label="New Password"
              showStrengthIndicator={true}
              showRequirements={true}
              testID="password-input"
            />

            <View>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.textInputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Re-enter new password"
                  placeholderTextColor={Colors.text.tertiary}
                  secureTextEntry={true}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  testID="confirm-password-input"
                />
              </View>
              {confirmPassword.length > 0 && !doPasswordsMatch && (
                <Text style={styles.errorText}>Passwords do not match</Text>
              )}
              {confirmPassword.length > 0 && doPasswordsMatch && (
                <Text style={styles.successText}>Passwords match ✓</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, canSubmit && !isResetting && styles.buttonActive]}
              onPress={handleResetPassword}
              disabled={!canSubmit || isResetting}
              testID="reset-password-button"
            >
              {isResetting ? (
                <ActivityIndicator color={Colors.text.inverse} />
              ) : (
                <Text style={styles.buttonText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    backgroundColor: Colors.background.primary,
    minHeight: 56,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.brand.primary,
    letterSpacing: 2,
  },
  headerSpacer: {
    width: 40,
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
  resendContainer: {
    alignItems: 'center',
    marginTop: 12,
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
  textInputContainer: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text.primary,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  successText: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 4,
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
});

