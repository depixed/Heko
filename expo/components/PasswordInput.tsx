import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Eye, EyeOff, Check, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import {
  validatePassword,
  getPasswordStrength,
  getStrengthColor,
  getStrengthPercentage,
  PASSWORD_POLICY,
  type PasswordValidationResult,
} from '@/lib/password.utils';

interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  showStrengthIndicator?: boolean;
  showRequirements?: boolean;
  autoFocus?: boolean;
  testID?: string;
}

export default function PasswordInput({
  value,
  onChangeText,
  placeholder = 'Enter password',
  label = 'Password',
  showStrengthIndicator = true,
  showRequirements = false,
  autoFocus = false,
  testID,
}: PasswordInputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const validation: PasswordValidationResult = validatePassword(value);
  const strength = value.length > 0 ? getPasswordStrength(value) : null;
  const strengthColor = strength ? getStrengthColor(strength) : Colors.border.light;
  const strengthPercentage = strength ? getStrengthPercentage(strength) : 0;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused
      ]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.tertiary}
          secureTextEntry={!isPasswordVisible}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          autoFocus={autoFocus}
          testID={testID}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          testID={`${testID}-toggle`}
        >
          {isPasswordVisible ? (
            <EyeOff size={20} color={Colors.text.tertiary} />
          ) : (
            <Eye size={20} color={Colors.text.tertiary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Strength Indicator */}
      {showStrengthIndicator && value.length > 0 && (
        <View style={styles.strengthContainer}>
          <View style={styles.strengthBar}>
            <View
              style={[
                styles.strengthBarFill,
                {
                  width: `${strengthPercentage}%`,
                  backgroundColor: strengthColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.strengthText, { color: strengthColor }]}>
            {strength === 'weak' && 'Weak'}
            {strength === 'medium' && 'Medium'}
            {strength === 'strong' && 'Strong'}
          </Text>
        </View>
      )}

      {/* Requirements Checklist */}
      {showRequirements && value.length > 0 && (
        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>Password Requirements:</Text>
          
          <RequirementItem
            met={validation.requirements.minLength}
            text={`At least ${PASSWORD_POLICY.minLength} characters`}
          />
          <RequirementItem
            met={validation.requirements.hasUppercase}
            text="One uppercase letter (A-Z)"
          />
          <RequirementItem
            met={validation.requirements.hasLowercase}
            text="One lowercase letter (a-z)"
          />
          <RequirementItem
            met={validation.requirements.hasNumber}
            text="One number (0-9)"
          />
          <RequirementItem
            met={validation.requirements.hasSpecialChar}
            text="One special character (!@#$...)"
          />
        </View>
      )}
    </View>
  );
}

interface RequirementItemProps {
  met: boolean;
  text: string;
}

function RequirementItem({ met, text }: RequirementItemProps) {
  return (
    <View style={styles.requirementItem}>
      {met ? (
        <Check size={16} color={Colors.brand.primary} />
      ) : (
        <X size={16} color={Colors.text.tertiary} />
      )}
      <Text style={[
        styles.requirementText,
        met && styles.requirementTextMet
      ]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background.secondary,
  },
  inputContainerFocused: {
    borderColor: Colors.brand.primary,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text.primary,
  },
  eyeButton: {
    padding: 8,
    marginRight: -8,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border.light,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },
  requirementsContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    gap: 8,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  requirementTextMet: {
    color: Colors.text.secondary,
  },
});

