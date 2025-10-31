import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAddresses } from '@/contexts/AddressContext';
import Colors from '@/constants/colors';
import type { Address } from '@/types';

export default function AddAddressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addAddress } = useAddresses();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    flat: '',
    area: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    type: 'home' as Address['type'],
    otherLabel: '',
    isDefault: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!/^\+?91\s?\d{10}$|^\d{10}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Enter a valid 10-digit phone number';
    }

    if (!formData.flat.trim()) {
      newErrors.flat = 'Flat/House No. is required';
    }

    if (!formData.area.trim()) {
      newErrors.area = 'Street/Area is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'Enter a valid 6-digit pincode';
    }

    if (formData.type === 'other' && !formData.otherLabel.trim()) {
      newErrors.otherLabel = 'Label is required for Other type';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      console.log('[AddAddress] Attempting to save address');
      await addAddress({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        flat: formData.flat.trim(),
        area: formData.area.trim(),
        landmark: formData.landmark.trim() || undefined,
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        type: formData.type,
        otherLabel: formData.type === 'other' ? formData.otherLabel.trim() : undefined,
        isDefault: formData.isDefault,
      });

      console.log('[AddAddress] Address saved successfully');
      router.back();
    } catch (error: any) {
      console.error('[AddAddress] Failed to save address:', error);
      Alert.alert(
        'Error', 
        error?.message || 'Failed to save address. Please try again.'
      );
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: 'height', web: undefined })}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.label}>Contact Name</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={formData.name}
            onChangeText={(value) => updateField('name', value)}
            placeholder="Enter your name"
            placeholderTextColor={Colors.text.tertiary}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={[styles.input, errors.phone && styles.inputError]}
            value={formData.phone}
            onChangeText={(value) => updateField('phone', value)}
            placeholder="+91 XXXXX XXXXX"
            placeholderTextColor={Colors.text.tertiary}
            keyboardType="phone-pad"
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Flat/House No., Building</Text>
          <TextInput
            style={[styles.input, errors.flat && styles.inputError]}
            value={formData.flat}
            onChangeText={(value) => updateField('flat', value)}
            placeholder="Enter flat/house number"
            placeholderTextColor={Colors.text.tertiary}
          />
          {errors.flat && <Text style={styles.errorText}>{errors.flat}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Street/Area</Text>
          <TextInput
            style={[styles.input, errors.area && styles.inputError]}
            value={formData.area}
            onChangeText={(value) => updateField('area', value)}
            placeholder="Enter street/area"
            placeholderTextColor={Colors.text.tertiary}
          />
          {errors.area && <Text style={styles.errorText}>{errors.area}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Landmark (optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.landmark}
            onChangeText={(value) => updateField('landmark', value)}
            placeholder="Enter nearby landmark"
            placeholderTextColor={Colors.text.tertiary}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>City</Text>
          <TextInput
            style={[styles.input, errors.city && styles.inputError]}
            value={formData.city}
            onChangeText={(value) => updateField('city', value)}
            placeholder="Enter city"
            placeholderTextColor={Colors.text.tertiary}
          />
          {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>State</Text>
          <TextInput
            style={[styles.input, errors.state && styles.inputError]}
            value={formData.state}
            onChangeText={(value) => updateField('state', value)}
            placeholder="Enter state"
            placeholderTextColor={Colors.text.tertiary}
          />
          {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Pincode</Text>
          <TextInput
            style={[styles.input, errors.pincode && styles.inputError]}
            value={formData.pincode}
            onChangeText={(value) => updateField('pincode', value)}
            placeholder="Enter 6-digit pincode"
            placeholderTextColor={Colors.text.tertiary}
            keyboardType="number-pad"
            maxLength={6}
          />
          {errors.pincode && <Text style={styles.errorText}>{errors.pincode}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Address Type</Text>
          <View style={styles.chipContainer}>
            <TouchableOpacity
              style={[styles.chip, formData.type === 'home' && styles.chipActive]}
              onPress={() => updateField('type', 'home')}
            >
              <Text style={[styles.chipText, formData.type === 'home' && styles.chipTextActive]}>
                Home
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, formData.type === 'work' && styles.chipActive]}
              onPress={() => updateField('type', 'work')}
            >
              <Text style={[styles.chipText, formData.type === 'work' && styles.chipTextActive]}>
                Work
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, formData.type === 'other' && styles.chipActive]}
              onPress={() => updateField('type', 'other')}
            >
              <Text style={[styles.chipText, formData.type === 'other' && styles.chipTextActive]}>
                Other
              </Text>
            </TouchableOpacity>
          </View>
          {formData.type === 'other' && (
            <TextInput
              style={[styles.input, styles.inputSmall, errors.otherLabel && styles.inputError]}
              value={formData.otherLabel}
              onChangeText={(value) => updateField('otherLabel', value)}
              placeholder="Enter label (e.g., Office, Friend's place)"
              placeholderTextColor={Colors.text.tertiary}
            />
          )}
          {errors.otherLabel && <Text style={styles.errorText}>{errors.otherLabel}</Text>}
        </View>

        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setFormData((prev) => ({ ...prev, isDefault: !prev.isDefault }))}
        >
          <View style={styles.toggle}>
            <View style={[styles.toggleTrack, formData.isDefault && styles.toggleTrackActive]}>
              <View
                style={[
                  styles.toggleThumb,
                  formData.isDefault && styles.toggleThumbActive,
                ]}
              />
            </View>
          </View>
          <Text style={styles.toggleLabel}>Make this my default address</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Address</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text.primary,
  },
  inputSmall: {
    marginTop: 12,
  },
  inputError: {
    borderColor: Colors.status.error,
  },
  errorText: {
    fontSize: 12,
    color: Colors.status.error,
    marginTop: 4,
  },
  chipContainer: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    backgroundColor: Colors.background.primary,
  },
  chipActive: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  chipTextActive: {
    color: Colors.text.inverse,
  },
  toggleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.background.primary,
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  toggle: {
    marginRight: 12,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border.medium,
    justifyContent: 'center' as const,
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: Colors.brand.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end' as const,
  },
  toggleLabel: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
  },
  bottomBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  saveButton: {
    backgroundColor: Colors.brand.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  saveButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
