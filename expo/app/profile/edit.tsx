import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronDown } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect } from 'react';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();

  const [fullName, setFullName] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('+91');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [errors, setErrors] = useState<{
    fullName?: string;
    phoneNumber?: string;
    email?: string;
  }>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [showCountryPicker, setShowCountryPicker] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      const phone = user.phone || '';
      if (phone.startsWith('+91')) {
        setPhoneNumber(phone.substring(3).trim());
      } else {
        setPhoneNumber(phone);
      }
      setEmail(user.email || '');
    }
  }, [user]);

  const formatPhoneNumber = (text: string): string => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 5) {
      return cleaned;
    }
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5, 10)}`;
  };

  const validateFullName = (name: string): string | undefined => {
    if (!name.trim()) {
      return 'Full name is required';
    }
    if (name.trim().length < 2 || name.trim().length > 60) {
      return 'Name must be between 2 and 60 characters';
    }
    if (!/^[a-zA-Z\s.''-]+$/.test(name)) {
      return 'Name can only contain letters, spaces, and .\'-';
    }
    return undefined;
  };

  const validatePhoneNumber = (phone: string): string | undefined => {
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned) {
      return 'Phone number is required';
    }
    if (cleaned.length !== 10) {
      return 'Enter a valid 10-digit number';
    }
    return undefined;
  };

  const validateEmail = (emailValue: string): string | undefined => {
    if (!emailValue.trim()) {
      return undefined;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      return 'Enter a valid email address';
    }
    return undefined;
  };

  const handleFullNameChange = (text: string) => {
    setFullName(text);
    setHasChanges(true);
    const error = validateFullName(text);
    setErrors((prev) => ({ ...prev, fullName: error }));
  };

  const handlePhoneNumberChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      const formatted = formatPhoneNumber(cleaned);
      setPhoneNumber(formatted);
      setHasChanges(true);
      const error = validatePhoneNumber(cleaned);
      setErrors((prev) => ({ ...prev, phoneNumber: error }));
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setHasChanges(true);
    const error = validateEmail(text);
    setErrors((prev) => ({ ...prev, email: error }));
  };

  const isFormValid = (): boolean => {
    const nameError = validateFullName(fullName);
    const phoneError = validatePhoneNumber(phoneNumber);
    const emailError = validateEmail(email);
    return !nameError && !phoneError && !emailError;
  };

  const handleSave = async () => {
    if (!isFormValid()) {
      return;
    }

    const originalPhone = user?.phone || '';
    const newPhone = `${countryCode} ${phoneNumber.replace(/\s/g, '')}`;
    const phoneChanged = originalPhone !== newPhone;

    if (phoneChanged) {
      Alert.alert(
        'Verify your new number',
        `We'll send an OTP to ${newPhone}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send OTP',
            onPress: () => handleOTPVerification(newPhone),
          },
        ]
      );
    } else {
      await saveProfile(newPhone);
    }
  };

  const handleOTPVerification = (newPhone: string) => {
    Alert.alert(
      'OTP Verification',
      'In a real app, you would verify the OTP here. For now, we\'ll save your profile.',
      [
        {
          text: 'OK',
          onPress: () => saveProfile(newPhone),
        },
      ]
    );
  };

  const saveProfile = async (phone: string) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await updateUser({
        name: fullName.trim(),
        phone: phone,
        email: email.trim() || undefined,
      });

      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch {
      Alert.alert('Error', 'Couldn\'t save your profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: 'height', web: undefined })}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          testID="back-button"
        >
          <ChevronLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Full Name<Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.fullName && styles.inputError]}
              value={fullName}
              onChangeText={handleFullNameChange}
              placeholder="John Doe"
              placeholderTextColor={Colors.text.tertiary}
              autoCapitalize="words"
              testID="full-name-input"
            />
            {errors.fullName && (
              <Text style={styles.errorText}>{errors.fullName}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Phone Number<Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.phoneContainer}>
              <TouchableOpacity
                style={styles.countryCodeButton}
                onPress={() => setShowCountryPicker(!showCountryPicker)}
                testID="country-code-button"
              >
                <Text style={styles.countryCodeText}>{countryCode}</Text>
                <ChevronDown size={16} color={Colors.text.secondary} />
              </TouchableOpacity>
              <View style={styles.phoneDivider} />
              <TextInput
                style={[
                  styles.phoneInput,
                  errors.phoneNumber && styles.inputError,
                ]}
                value={phoneNumber}
                onChangeText={handlePhoneNumberChange}
                placeholder="98765 43210"
                placeholderTextColor={Colors.text.tertiary}
                keyboardType="numeric"
                maxLength={11}
                testID="phone-number-input"
              />
            </View>
            {errors.phoneNumber && (
              <Text style={styles.errorText}>{errors.phoneNumber}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={email}
              onChangeText={handleEmailChange}
              placeholder="johndoe@gmail.com"
              placeholderTextColor={Colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              testID="email-input"
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!isFormValid() || !hasChanges || isLoading) &&
              styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!isFormValid() || !hasChanges || isLoading}
          testID="save-button"
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.text.inverse} />
          ) : (
            <Text style={styles.saveButtonText}>Edit Profile</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  form: {
    gap: 24,
  },
  fieldContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text.primary,
  },
  required: {
    color: Colors.status.error,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text.primary,
    backgroundColor: Colors.background.primary,
  },
  inputError: {
    borderColor: Colors.status.error,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 12,
    backgroundColor: Colors.background.primary,
    overflow: 'hidden',
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 4,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text.primary,
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border.medium,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    fontSize: 16,
    color: Colors.text.primary,
    borderWidth: 0,
  },
  errorText: {
    fontSize: 12,
    color: Colors.status.error,
    marginTop: 4,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    backgroundColor: Colors.background.primary,
  },
  saveButton: {
    height: 52,
    backgroundColor: Colors.brand.primary,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: Colors.text.tertiary,
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.inverse,
  },
});
