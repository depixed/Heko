# Hybrid Authentication System - Testing Guide

This document provides comprehensive testing procedures for the hybrid authentication system implementation.

## Prerequisites

Before testing, ensure:

1. ✅ Database migration has been applied (`migrations/add_password_to_profiles.sql`)
2. ✅ Edge functions have been deployed to Supabase
3. ✅ Frontend app has been rebuilt with the latest changes
4. ✅ You have access to test phone numbers that can receive OTPs

---

## Test Environment Setup

### Test Data Preparation

1. **New User Phone Numbers**: Have 2-3 phone numbers ready that are NOT registered in the system
2. **Existing User Without Password**: If you have existing users in the database (from the old OTP-only system), identify one for backward compatibility testing
3. **Existing User With Password**: After testing signup, use this account for login testing

---

## Testing Checklist

## 1. Signup Flow (New User)

### Test Case 1.1: Complete Signup Flow
**Expected Flow**: Phone → OTP → Password → Profile → Success

**Steps**:
1. Open the app and tap "Sign Up" on the welcome screen
2. Enter a 10-digit mobile number (not registered)
3. Optionally enter a referral code
4. Tap "Continue"
5. **Verify**: OTP is sent (check console logs or phone)
6. Enter the correct OTP
7. **Verify**: Redirected to password creation screen
8. Enter a password that meets all requirements:
   - At least 8 characters
   - One uppercase letter
   - One lowercase letter
   - One number
   - One special character
9. **Verify**: Strength indicator shows appropriate color (weak/medium/strong)
10. **Verify**: All requirement checkmarks turn green as criteria are met
11. Enter the same password in "Confirm Password"
12. **Verify**: "Passwords match ✓" message appears
13. Tap "Continue"
14. **Verify**: Redirected to profile details screen
15. Enter name (required)
16. Optionally enter email
17. **Verify**: Referral code badge is displayed if provided
18. Tap "Create Account"
19. **Verify**: Account created successfully
20. **Verify**: User is logged in and redirected to home screen

**Expected Results**:
- ✅ User account created in database with password_hash
- ✅ password_set_at timestamp is recorded
- ✅ Session token created
- ✅ User can see home screen

---

### Test Case 1.2: Password Policy Validation

**Steps**:
1. Follow signup flow until password creation screen
2. Try entering weak passwords:
   - "abc123" (too short)
   - "abcdefgh" (no uppercase, number, special char)
   - "ABCDEFGH" (no lowercase, number, special char)
   - "Abcdefgh" (no number, special char)
   - "Abcdefg1" (no special char)
3. **Verify**: Error messages appear for each requirement not met
4. **Verify**: Strength indicator shows "Weak"
5. Enter a valid password: "MyPass123!"
6. **Verify**: All checkmarks turn green
7. **Verify**: Strength indicator shows "Medium" or "Strong"
8. Try entering different confirm password
9. **Verify**: "Passwords do not match" error shown
10. **Verify**: Continue button remains disabled

**Expected Results**:
- ✅ Password validation works correctly
- ✅ Real-time feedback is provided
- ✅ Cannot proceed without valid, matching passwords

---

### Test Case 1.3: Invalid OTP During Signup

**Steps**:
1. Start signup flow and enter phone number
2. Receive OTP
3. Enter incorrect OTP (e.g., 123456 if real OTP is different)
4. **Verify**: Error message "Invalid or expired OTP"
5. Try entering OTP after waiting for expiry time (typically 10 minutes)
6. **Verify**: Error message "Invalid or expired OTP"
7. Tap "Resend OTP"
8. Enter the new OTP correctly
9. **Verify**: Can proceed to password creation

**Expected Results**:
- ✅ Invalid OTPs are rejected
- ✅ Expired OTPs are rejected
- ✅ Resend OTP functionality works

---

## 2. Login Flow (Existing User with Password)

### Test Case 2.1: Successful Login with Password

**Steps**:
1. On welcome screen, tap "Login"
2. Enter registered phone number
3. Enter correct password
4. Tap "Login"
5. **Verify**: User is logged in
6. **Verify**: Redirected to home screen
7. **Verify**: User data is loaded (profile, wallet, etc.)

**Expected Results**:
- ✅ Login successful with correct credentials
- ✅ Session token created and stored
- ✅ User context populated

---

### Test Case 2.2: Wrong Password

**Steps**:
1. Go to login screen
2. Enter registered phone number
3. Enter incorrect password
4. Tap "Login"
5. **Verify**: Error alert "Invalid password. Please try again."
6. **Verify**: User remains on login screen

**Expected Results**:
- ✅ Login denied with wrong password
- ✅ Appropriate error message shown

---

### Test Case 2.3: Unregistered Phone Number

**Steps**:
1. Go to login screen
2. Enter phone number that's NOT registered
3. Enter any password
4. Tap "Login"
5. **Verify**: Alert shown: "Account Not Found - This phone number is not registered. Would you like to sign up?"
6. Tap "Sign Up"
7. **Verify**: Redirected to signup screen
8. **Verify**: Phone number might be pre-filled (optional enhancement)

**Expected Results**:
- ✅ System detects unregistered phone
- ✅ User is prompted to sign up
- ✅ Easy navigation to signup flow

---

## 3. Password Reset Flow

### Test Case 3.1: Complete Password Reset

**Steps**:
1. On login screen, tap "Forgot Password?"
2. **Verify**: Redirected to forgot password screen
3. Enter registered phone number
4. Tap "Send OTP"
5. **Verify**: OTP sent to phone
6. **Verify**: Redirected to reset password screen
7. Enter the OTP received
8. Enter new password (meeting all requirements)
9. Enter same password in confirm field
10. **Verify**: All validation indicators work
11. Tap "Reset Password"
12. **Verify**: Success alert shown
13. **Verify**: Redirected to login screen
14. Login with new password
15. **Verify**: Login successful

**Expected Results**:
- ✅ Password reset flow works end-to-end
- ✅ last_password_change timestamp updated in database
- ✅ Old password no longer works
- ✅ New password works for login

---

### Test Case 3.2: Password Reset with Unregistered Phone

**Steps**:
1. Go to forgot password screen
2. Enter phone number that's NOT registered
3. Tap "Send OTP"
4. **Verify**: Alert shown: "Account Not Found"
5. **Verify**: Option to sign up is provided

**Expected Results**:
- ✅ System prevents password reset for non-existent accounts
- ✅ Helpful message guides user to signup

---

### Test Case 3.3: Invalid OTP During Password Reset

**Steps**:
1. Start password reset flow
2. Enter wrong OTP
3. Enter new password and confirm
4. Tap "Reset Password"
5. **Verify**: Error message about invalid OTP
6. Tap "Resend OTP"
7. Enter correct OTP
8. **Verify**: Password reset succeeds

**Expected Results**:
- ✅ Invalid OTP blocks password reset
- ✅ Resend OTP works in reset flow

---

## 4. Backward Compatibility (Existing Users Without Password)

### Test Case 4.1: Existing User OTP Login

**Prerequisites**: Need an existing user in database with `password_hash = NULL`

**Steps**:
1. Go to login screen
2. Enter the existing user's phone number
3. Enter any password
4. Tap "Login"
5. **Verify**: Alert shown about needing OTP login
6. Tap "Use OTP Login"
7. **Verify**: OTP sent
8. **Verify**: Redirected to OTP verification screen
9. Enter correct OTP
10. **Verify**: Alert shown: "Welcome Back! For better security, we recommend setting up a password..."
11. Choose "Maybe Later"
12. **Verify**: User is logged in
13. **Verify**: Redirected to home screen

**Expected Results**:
- ✅ Existing users without password can still login via OTP
- ✅ Password setup is suggested but optional
- ✅ User is not blocked from accessing the app

---

### Test Case 4.2: Optional Password Setup for Existing User

**Steps**:
1. Follow Test Case 4.1 until the password setup prompt
2. Choose "Set Password"
3. **Verify**: Password creation screen shown
4. Enter and confirm new password
5. **Verify**: Password saved successfully
6. Logout
7. Login with phone number and newly set password
8. **Verify**: Login successful without OTP

**Expected Results**:
- ✅ Existing users can optionally set password
- ✅ After setting password, they can use password login
- ✅ Smooth migration from OTP-only to password-based auth

---

## 5. Edge Cases & Error Handling

### Test Case 5.1: Network Failure During Signup

**Steps**:
1. Start signup flow
2. Turn off internet/put device in airplane mode before submitting
3. Try to send OTP or verify OTP
4. **Verify**: Appropriate error message shown
5. Turn internet back on
6. Retry the action
7. **Verify**: Operation succeeds

**Expected Results**:
- ✅ Network errors are caught and reported
- ✅ User can retry after connectivity is restored

---

### Test Case 5.2: Session Expiry

**Steps**:
1. Login successfully
2. Manually delete session from database or wait 30 days
3. Try to access app
4. **Verify**: User is logged out
5. **Verify**: Redirected to login/welcome screen

**Expected Results**:
- ✅ Expired sessions are detected
- ✅ User is gracefully logged out

---

### Test Case 5.3: Very Long Phone Numbers

**Steps**:
1. Try entering phone number with more than 10 digits
2. **Verify**: Input is limited to 10 digits
3. Try entering non-numeric characters
4. **Verify**: Only numbers are accepted

**Expected Results**:
- ✅ Input validation prevents invalid phone numbers
- ✅ UI enforces correct format

---

### Test Case 5.4: Special Characters in Password

**Steps**:
1. During password creation, enter password with various special characters: !@#$%^&*(),.?":{}|<>
2. **Verify**: All special characters are accepted
3. **Verify**: Password saves correctly
4. Login with the password containing special characters
5. **Verify**: Login successful

**Expected Results**:
- ✅ Special characters in password are properly handled
- ✅ No encoding/escaping issues

---

## 6. UI/UX Validation

### Test Case 6.1: Password Visibility Toggle

**Steps**:
1. On any password input field
2. Enter some characters
3. **Verify**: Password is hidden (dots/asterisks shown)
4. Tap the eye icon
5. **Verify**: Password becomes visible (plain text)
6. Tap eye icon again
7. **Verify**: Password is hidden again

**Expected Results**:
- ✅ Password visibility toggle works correctly
- ✅ Icon changes appropriately (eye/eye-off)

---

### Test Case 6.2: Password Strength Indicator

**Steps**:
1. On password creation screen
2. Type progressively stronger passwords:
   - "abc" → Verify: No indicator or weak
   - "Abc123" → Verify: Weak (red)
   - "Abc123!" → Verify: Medium (yellow/orange)
   - "MySecureP@ss123" → Verify: Strong (green)
3. **Verify**: Bar fills up based on strength
4. **Verify**: Color changes appropriately

**Expected Results**:
- ✅ Strength indicator is accurate
- ✅ Visual feedback is clear and helpful

---

### Test Case 6.3: Real-time Validation Feedback

**Steps**:
1. On password creation screen
2. As you type, watch the requirement checkmarks
3. **Verify**: Checkmarks appear as each requirement is met
4. Remove characters to fail requirements
5. **Verify**: Checkmarks disappear
6. **Verify**: Continue button enables/disables appropriately

**Expected Results**:
- ✅ Real-time feedback works smoothly
- ✅ No lag or performance issues
- ✅ Visual indicators are clear

---

## 7. Security Validation

### Test Case 7.1: Password Hashing

**Steps**:
1. Create a new account with password "TestPass123!"
2. Query the database and check the profiles table
3. **Verify**: `password_hash` column contains a bcrypt hash (starts with $2b$ or $2a$)
4. **Verify**: Hash is NOT the plain text password
5. **Verify**: Hash is 60 characters long (bcrypt standard)

**Expected Results**:
- ✅ Passwords are never stored in plain text
- ✅ Bcrypt hashing is used
- ✅ Appropriate salt rounds (12)

---

### Test Case 7.2: Password Not Logged

**Steps**:
1. During signup or login, monitor console logs
2. **Verify**: Password is never printed in logs
3. Check edge function logs in Supabase
4. **Verify**: Password is not logged there either

**Expected Results**:
- ✅ Passwords never appear in logs
- ✅ Security best practices followed

---

## 8. Database Validation

### Test Case 8.1: New User Record

**Steps**:
1. Create a new account
2. Query profiles table
3. **Verify**: New record exists with:
   - ✅ `password_hash` is populated
   - ✅ `password_set_at` has current timestamp
   - ✅ `last_password_change` is NULL (first-time password)

---

### Test Case 8.2: Password Reset Record

**Steps**:
1. Reset password for an existing user
2. Query profiles table
3. **Verify**: 
   - ✅ `password_hash` has changed
   - ✅ `last_password_change` has new timestamp
   - ✅ `password_set_at` remains unchanged

---

### Test Case 8.3: Session Token Creation

**Steps**:
1. Login successfully
2. Query customer_sessions table
3. **Verify**:
   - ✅ New session record created
   - ✅ `session_token` is a valid UUID
   - ✅ `expires_at` is 30 days in future
   - ✅ `user_id` matches the logged-in user

---

## Testing Completion Checklist

After completing all tests, verify:

- [ ] All signup flows work correctly
- [ ] Password login works for users with passwords
- [ ] Backward compatibility maintained for existing OTP-only users
- [ ] Password reset flow works end-to-end
- [ ] Password policy is enforced on frontend and backend
- [ ] Error handling is appropriate and user-friendly
- [ ] UI/UX components work as designed
- [ ] Security measures are in place (hashing, no logging)
- [ ] Database records are correct
- [ ] No console errors during any flow
- [ ] Performance is acceptable (no lag)

---

## Known Issues / Edge Cases to Document

Use this section to note any issues found during testing:

1. Issue: [Description]
   - Impact: [High/Medium/Low]
   - Steps to reproduce:
   - Expected behavior:
   - Actual behavior:

---

## Deployment Checklist

Before deploying to production:

- [ ] Run database migration on production database
- [ ] Deploy all edge functions to production
- [ ] Test with production credentials
- [ ] Verify OTP delivery works in production
- [ ] Monitor error logs for first 24 hours
- [ ] Have rollback plan ready
- [ ] Notify existing users about new password feature (optional)

---

## Support Preparation

Prepare support team with:

1. **Common Issues**:
   - "I forgot my password" → Use "Forgot Password" on login screen
   - "OTP not received" → Check spam, resend OTP, verify phone number
   - "Can't login" → Verify phone number, try password reset

2. **FAQs**:
   - Q: Do I need to set a password?
   - A: For new users, yes. Existing users can continue with OTP or optionally set a password.
   
   - Q: How do I reset my password?
   - A: Tap "Forgot Password?" on the login screen and follow the instructions.
   
   - Q: What are the password requirements?
   - A: At least 8 characters, with uppercase, lowercase, number, and special character.

---

## Testing Sign-off

| Tester Name | Role | Date | Signature | Status |
|-------------|------|------|-----------|--------|
|             |      |      |           | PASS/FAIL |
|             |      |      |           | PASS/FAIL |

---

## Notes

Add any additional observations or recommendations here.

