/**
 * Password Validation Utilities
 * 
 * Provides password policy enforcement, validation, and strength calculation
 * for the hybrid authentication system.
 */

export const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  specialChars: '!@#$%^&*(),.?":{}|<>',
} as const;

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

/**
 * Validates a password against the defined password policy
 * @param password - The password to validate
 * @returns Validation result with errors and requirement checks
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const requirements = {
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  };

  // Check minimum length
  if (password.length >= PASSWORD_POLICY.minLength) {
    requirements.minLength = true;
  } else {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters long`);
  }

  // Check for uppercase letter
  if (PASSWORD_POLICY.requireUppercase) {
    if (/[A-Z]/.test(password)) {
      requirements.hasUppercase = true;
    } else {
      errors.push('Password must contain at least one uppercase letter');
    }
  }

  // Check for lowercase letter
  if (PASSWORD_POLICY.requireLowercase) {
    if (/[a-z]/.test(password)) {
      requirements.hasLowercase = true;
    } else {
      errors.push('Password must contain at least one lowercase letter');
    }
  }

  // Check for number
  if (PASSWORD_POLICY.requireNumber) {
    if (/[0-9]/.test(password)) {
      requirements.hasNumber = true;
    } else {
      errors.push('Password must contain at least one number');
    }
  }

  // Check for special character
  if (PASSWORD_POLICY.requireSpecialChar) {
    const specialCharsRegex = new RegExp(`[${PASSWORD_POLICY.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`);
    if (specialCharsRegex.test(password)) {
      requirements.hasSpecialChar = true;
    } else {
      errors.push(`Password must contain at least one special character (${PASSWORD_POLICY.specialChars})`);
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    requirements,
  };
}

/**
 * Calculates the strength of a password
 * @param password - The password to evaluate
 * @returns Password strength: 'weak', 'medium', or 'strong'
 */
export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  const { requirements } = validatePassword(password);
  
  let score = 0;
  
  // Base requirements (5 points each)
  if (requirements.minLength) score += 1;
  if (requirements.hasUppercase) score += 1;
  if (requirements.hasLowercase) score += 1;
  if (requirements.hasNumber) score += 1;
  if (requirements.hasSpecialChar) score += 1;
  
  // Additional length bonus
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  
  // Character variety bonus
  const uniqueChars = new Set(password.split('')).size;
  if (uniqueChars >= 8) score += 1;
  
  // Determine strength based on score
  if (score <= 4) return 'weak';
  if (score <= 6) return 'medium';
  return 'strong';
}

/**
 * Gets a color code for password strength indicator
 * @param strength - The password strength
 * @returns Hex color code
 */
export function getStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return '#EF4444'; // Red
    case 'medium':
      return '#F59E0B'; // Yellow/Orange
    case 'strong':
      return '#10B981'; // Green
  }
}

/**
 * Gets a percentage value for password strength (for progress bars)
 * @param strength - The password strength
 * @returns Percentage as a number (0-100)
 */
export function getStrengthPercentage(strength: 'weak' | 'medium' | 'strong'): number {
  switch (strength) {
    case 'weak':
      return 33;
    case 'medium':
      return 66;
    case 'strong':
      return 100;
  }
}

/**
 * Checks if two passwords match
 * @param password - The first password
 * @param confirmPassword - The second password to compare
 * @returns True if passwords match
 */
export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword && password.length > 0;
}

