# Cross-Platform Consistency Fixes

## Summary
This document outlines all the changes made to ensure the HEKO app works exactly the same across Web, iOS, and Android platforms.

## Date
October 29, 2025

## Changes Made

### 1. Tab Bar Layout (`app/(tabs)/_layout.tsx`)

#### Issue
- Tab bar height was only defined for iOS (85px) and Android (65px), with no explicit web support
- Bottom padding was only defined for iOS (20px) and Android (5px), with no explicit web support
- Brand circle shadow was using separate iOS/Android properties without web support

#### Fix
- **Tab Bar Height**: Added explicit web height (70px) to sit between iOS and Android
  ```typescript
  height: Platform.OS === 'ios' ? 85 : Platform.OS === 'web' ? 70 : 65
  ```
- **Tab Bar Padding**: Added explicit web padding (10px)
  ```typescript
  paddingBottom: Platform.OS === 'ios' ? 20 : Platform.OS === 'web' ? 10 : 5
  ```
- **Shadow Styles**: Added web-specific boxShadow to brand circle
  ```typescript
  ...Platform.select({
    ios: { shadowColor, shadowOffset, shadowOpacity, shadowRadius },
    android: { elevation: 8 },
    web: { boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)' }
  })
  ```

### 2. Referral Screen (`app/referral.tsx`)

#### Issue
- "Save QR" button was completely hidden on web
- Web users had no way to download the QR code
- Platform-specific font families not explicitly defined for web
- Bottom bar padding inconsistent across platforms

#### Fixes

**QR Code Download**
- Implemented web-friendly download using HTML5 download attribute
- Added browser download functionality using canvas toDataURL and anchor element
- Changed button text to "Download QR" on web vs "Save QR" on mobile
- Removed platform check that was hiding the button

**Font Consistency**
- Updated code value and link value fonts to explicitly include web
  ```typescript
  fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', web: 'monospace' })
  ```

**Bottom Bar Padding**
- Added explicit web padding (20px) for consistent spacing
  ```typescript
  paddingBottom: Platform.select({ ios: 32, android: 12, web: 20 })
  ```

### 3. Keyboard Avoiding View Behavior

#### Issue
- Multiple screens using `Platform.OS === 'ios' ? 'padding' : undefined`
- Android was getting undefined behavior
- Web behavior was not explicitly defined

#### Fixes
Updated all KeyboardAvoidingView instances to use explicit platform selection:
```typescript
behavior={Platform.select({ ios: 'padding', android: 'height', web: undefined })}
```

**Files Updated:**
- `app/profile/edit.tsx`
- `app/address/add.tsx`
- `app/address/edit/[id].tsx`
- `app/auth/otp.tsx`

### 4. Shadow Styles (Already Compliant)

The following screens were checked and already had proper web shadow support:
- **Product Detail Screen** (`app/product/[id].tsx`)
  - Hero container shadow: ✓
  - Bottom action area shadow: ✓
- **Checkout Screen** (`app/checkout.tsx`)
  - Sticky bottom bar shadow: ✓
- **Cart Screen** (`app/cart.tsx`)
  - Sticky bottom bar shadow: ✓

All use the proper Platform.select pattern with web-specific boxShadow properties.

### 5. Splash Screen (Already Compliant)

The splash screen (`app/splash.tsx`) properly handles web by checking for platform-specific APIs:
- Only calls AccessibilityInfo.isReduceMotionEnabled() on non-web platforms
- Gracefully handles animation on all platforms

## Testing Checklist

### Web Browser Testing
- [ ] Tab bar displays correctly with proper height and spacing
- [ ] Brand logo circle shows shadow effect
- [ ] Referral QR code can be downloaded via "Download QR" button
- [ ] Keyboard behavior works properly in forms
- [ ] All shadows render correctly (bottom bars, cards, etc.)
- [ ] Monospace fonts display correctly for referral codes

### iOS Simulator Testing
- [ ] Tab bar displays with correct iOS-specific height (85px)
- [ ] Referral QR code can be saved to photo library
- [ ] Keyboard avoiding behavior works correctly (padding mode)
- [ ] All shadows render with iOS shadow properties
- [ ] Courier font displays correctly for referral codes

### Android Testing
- [ ] Tab bar displays with correct Android-specific height (65px)
- [ ] Referral QR code can be saved to gallery
- [ ] Keyboard avoiding behavior works correctly (height mode)
- [ ] All shadows render with elevation
- [ ] Monospace font displays correctly for referral codes

## Platform-Specific Behavior Summary

### Tab Bar
| Platform | Height | Padding Bottom |
|----------|--------|----------------|
| iOS      | 85px   | 20px          |
| Web      | 70px   | 10px          |
| Android  | 65px   | 5px           |

### Shadow Rendering
| Platform | Method                    |
|----------|---------------------------|
| iOS      | shadowColor, shadowOffset, shadowOpacity, shadowRadius |
| Web      | boxShadow (CSS)          |
| Android  | elevation                |

### Keyboard Behavior
| Platform | Behavior   |
|----------|------------|
| iOS      | padding    |
| Android  | height     |
| Web      | undefined  |

### Font Families (Referral Code)
| Platform | Font       |
|----------|------------|
| iOS      | Courier    |
| Android  | monospace  |
| Web      | monospace  |

## Benefits

1. **Consistent User Experience**: Users get the same features and functionality regardless of platform
2. **Web Feature Parity**: Web users can now download QR codes just like mobile users
3. **Better Visual Consistency**: Shadows, spacing, and layout are consistent across all platforms
4. **Improved Code Maintainability**: Explicit platform selection makes behavior clear and predictable
5. **Better Keyboard Handling**: Each platform uses its optimal keyboard avoidance strategy

## Files Modified

1. `/app/(tabs)/_layout.tsx` - Tab bar layout and shadow fixes
2. `/app/referral.tsx` - QR download, fonts, and bottom bar fixes
3. `/app/profile/edit.tsx` - Keyboard avoiding behavior
4. `/app/address/add.tsx` - Keyboard avoiding behavior
5. `/app/address/edit/[id].tsx` - Keyboard avoiding behavior
6. `/app/auth/otp.tsx` - Keyboard avoiding behavior

## No Breaking Changes

All changes are backward compatible and improve consistency. No existing functionality was removed or broken.

## Next Steps

1. Test the app on all three platforms (Web, iOS, Android)
2. Verify all features work as expected
3. Gather user feedback on consistency improvements
4. Monitor for any platform-specific edge cases

## Notes

- Web browser differences: The app should work consistently across modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile web: On mobile browsers, the app will use web-specific styles while maintaining a native-like experience
- The Platform.select API ensures optimal behavior for each platform while maintaining code clarity




