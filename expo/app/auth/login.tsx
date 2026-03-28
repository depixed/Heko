import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { authService } from '@/lib/auth.service';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [isSendingOTP, setIsSendingOTP] = useState(false);

  const handleOTPLogin = async () => {
    if (phone.length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number');
      return;
    }

    setIsSendingOTP(true);
    try {
      console.log('[Login] Sending OTP for:', phone);
      const result = await authService.sendOTP(phone, 'login');
      
      if (result.success) {
        console.log('[Login] OTP sent successfully, navigating to OTP screen');
        router.push({ pathname: '/auth/otp' as any, params: { phone, mode: 'login' } });
      } else {
        console.error('[Login] Failed to send OTP:', result.error);
        
        // Provide user-friendly error messages
        let errorMessage = result.error || 'Failed to send OTP';
        if (errorMessage.includes('Authenticate') || errorMessage.includes('Authentication')) {
          errorMessage = 'Unable to connect to authentication service. Please check your internet connection and try again. If the problem persists, the service may be temporarily unavailable.';
        }
        
        Alert.alert(
          'Unable to Send OTP',
          errorMessage,
          [
            { text: 'OK', style: 'default' },
            { 
              text: 'Try Again', 
              onPress: () => {
                // Retry after a short delay
                setTimeout(() => handleOTPLogin(), 1000);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('[Login] Error sending OTP:', error);
      Alert.alert(
        'Connection Error',
        'Failed to connect to the server. Please check your internet connection and try again.',
        [
          { text: 'OK', style: 'default' },
          { 
            text: 'Retry', 
            onPress: () => {
              setTimeout(() => handleOTPLogin(), 1000);
            }
          }
        ]
      );
    } finally {
      setIsSendingOTP(false);
    }
  };


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
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome back!</Text>
          <Text style={styles.subtitle}>Login to continue shopping</Text>
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

          <TouchableOpacity
            style={[styles.button, phone.length === 10 && !isSendingOTP && styles.buttonActive]}
            onPress={handleOTPLogin}
            disabled={phone.length !== 10 || isSendingOTP}
            testID="login-button"
          >
            {isSendingOTP ? (
              <ActivityIndicator color={Colors.text.inverse} />
            ) : (
              <Text style={styles.buttonText}>Send OTP</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/auth/signup' as any)}
          >
            <Text style={styles.linkText}>
              Don&apos;t have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
            </Text>
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
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: -16,
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
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -8,
    gap: 8,
  },
  forgotButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  forgotText: {
    fontSize: 14,
    color: Colors.brand.primary,
    fontWeight: '600' as const,
  },
  otpLoginButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.brand.primary,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpLoginText: {
    fontSize: 14,
    color: Colors.brand.primary,
    fontWeight: '600' as const,
  },
});
