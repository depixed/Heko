import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { X, Download } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PROMPT_DISMISSED_KEY = 'heko_install_prompt_dismissed';
const PROMPT_INSTALLED_KEY = 'heko_app_installed';

// Use localStorage directly for web (more reliable than AsyncStorage)
const getStorageItem = (key: string): string | null => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.error('[InstallPrompt] Error reading localStorage:', error);
      return null;
    }
  }
  return null;
};

const setStorageItem = (key: string, value: string): void => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.error('[InstallPrompt] Error writing localStorage:', error);
    }
  }
};

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Only run on web
    if (Platform.OS !== 'web') {
      return;
    }

    const checkIfDismissed = () => {
      const dismissed = getStorageItem(PROMPT_DISMISSED_KEY);
      const installed = getStorageItem(PROMPT_INSTALLED_KEY);
      
      console.log('[InstallPrompt] Storage check:', { 
        dismissed, 
        installed,
        dismissedValue: dismissed === 'true',
        installedValue: installed === 'true'
      });
      
      // Don't show if user dismissed or already installed
      if (dismissed === 'true' || installed === 'true') {
        console.log('[InstallPrompt] Prompt was dismissed or app installed, not showing');
        return false;
      }
      return true;
    };

    const initializePrompt = () => {
      console.log('[InstallPrompt] ===== INITIALIZING PROMPT =====');
      console.log('[InstallPrompt] Platform.OS:', Platform.OS);
      console.log('[InstallPrompt] User Agent:', navigator.userAgent);
      
      // Check for test mode (force show) - add ?testInstall=1 to URL
      const urlParams = new URLSearchParams(window.location.search);
      const testMode = urlParams.get('testInstall') === '1';
      
      if (testMode) {
        console.log('[InstallPrompt] TEST MODE ENABLED - Force showing prompt');
        // Clear storage for testing
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(PROMPT_DISMISSED_KEY);
          window.localStorage.removeItem(PROMPT_INSTALLED_KEY);
        }
      }
      
      const canShow = checkIfDismissed();
      if (!canShow && !testMode) {
        console.log('[InstallPrompt] Cannot show - dismissed or installed (unless test mode)');
        return;
      }

      // Check if running as standalone app (already installed)
      const standaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const standaloneNavigator = (window.navigator as any).standalone;
      const standaloneReferrer = document.referrer.includes('android-app://');
      const standalone = standaloneMedia || standaloneNavigator || standaloneReferrer;
      
      console.log('[InstallPrompt] Standalone detection:', {
        media: standaloneMedia,
        navigator: standaloneNavigator,
        referrer: standaloneReferrer,
        isStandalone: standalone
      });
      
      setIsStandalone(standalone);

      if (standalone) {
        console.log('[InstallPrompt] Running as standalone app, marking as installed');
        setStorageItem(PROMPT_INSTALLED_KEY, 'true');
        return;
      }

      // Detect iOS
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIOS(ios);

      // Detect Android
      const android = /Android/.test(navigator.userAgent);
      setIsAndroid(android);
      
      console.log('[InstallPrompt] Platform detection:', { 
        ios, 
        android, 
        standalone,
        userAgent: navigator.userAgent.substring(0, 100)
      });
      console.log('[InstallPrompt] Service Worker support:', 'serviceWorker' in navigator);
      console.log('[InstallPrompt] Manifest link:', document.querySelector('link[rel="manifest"]')?.getAttribute('href'));
      console.log('[InstallPrompt] Window location:', window.location.href);

      // Show prompt for both iOS and Android after a delay
      // For Android, we'll show it even if beforeinstallprompt doesn't fire
      const delay = testMode ? 500 : 3000; // Faster in test mode
      console.log('[InstallPrompt] Scheduling prompt to show in', delay, 'ms...');
      setTimeout(() => {
        console.log('[InstallPrompt] ===== SHOWING PROMPT NOW =====');
        console.log('[InstallPrompt] Current state:', { showPrompt, isStandalone, isAndroid, isIOS });
        setShowPrompt(true);
        // Double-check it was set
        setTimeout(() => {
          console.log('[InstallPrompt] Prompt should be visible now. Check render logs above.');
        }, 100);
      }, delay);
    };

    // Listen for beforeinstallprompt event (Android, Desktop)
    // This event may or may not fire, so we show the prompt anyway
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[InstallPrompt] beforeinstallprompt event fired');
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      
      // If event fires, we already show the prompt in initializePrompt
      // But we can show it immediately if needed
      if (!showPrompt) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 1000);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('[InstallPrompt] App was installed event fired');
      setShowPrompt(false);
      setStorageItem(PROMPT_INSTALLED_KEY, 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Expose global function to reset prompt (for testing)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      (window as any).resetInstallPrompt = () => {
        console.log('[InstallPrompt] Manual reset triggered');
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(PROMPT_DISMISSED_KEY);
          window.localStorage.removeItem(PROMPT_INSTALLED_KEY);
        }
        setShowPrompt(false);
        setTimeout(() => {
          initializePrompt();
        }, 500);
      };
      (window as any).showInstallPrompt = () => {
        console.log('[InstallPrompt] Manual show triggered');
        setShowPrompt(true);
      };
      console.log('[InstallPrompt] Debug functions available:');
      console.log('  - window.resetInstallPrompt() - Reset and show prompt');
      console.log('  - window.showInstallPrompt() - Force show prompt');
    }

    initializePrompt();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      // For iOS, just keep the prompt open with instructions
      // User needs to manually use Share > Add to Home Screen
      return;
    }

    // If we have the deferred prompt, use it
    if (deferredPrompt) {
      try {
        console.log('[InstallPrompt] Showing native install prompt');
        // Show native install prompt
        await deferredPrompt.prompt();
        
        // Wait for user choice
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[InstallPrompt] User response: ${outcome}`);
        
        if (outcome === 'accepted') {
          setStorageItem(PROMPT_INSTALLED_KEY, 'true');
        }
        
        // Clear deferred prompt
        setDeferredPrompt(null);
        setShowPrompt(false);
      } catch (error) {
        console.error('[InstallPrompt] Error showing install prompt:', error);
        // Fall through to manual instructions
      }
    } else {
      // Fallback: Cannot programmatically open Chrome menu
      // We'll keep showing the instructions in the prompt
      console.log('[InstallPrompt] No deferred prompt available - showing manual instructions');
      // The prompt already shows instructions, so we don't need to do anything
      // Just log for debugging
    }
  };

  const handleDismiss = () => {
    console.log('[InstallPrompt] User dismissed prompt');
    setShowPrompt(false);
    setStorageItem(PROMPT_DISMISSED_KEY, 'true');
  };

  // Debug logging
  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('[InstallPrompt] Render check:', {
        showPrompt,
        isStandalone,
        platformOS: Platform.OS,
        willRender: showPrompt && !isStandalone && Platform.OS === 'web'
      });
    }
  }, [showPrompt, isStandalone]);

  // Don't show if already standalone or not on web
  if (!showPrompt || isStandalone || Platform.OS !== 'web') {
    if (Platform.OS === 'web') {
      console.log('[InstallPrompt] Not rendering because:', {
        showPrompt: !showPrompt,
        isStandalone,
        platformOS: Platform.OS !== 'web'
      });
    }
    return null;
  }

  console.log('[InstallPrompt] ===== RENDERING PROMPT =====');

  return (
    <View style={styles.container}>
      <View style={styles.prompt}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Image 
              source={Platform.OS === 'web' 
                ? { uri: '/pwa-icons/icon-192x192.png' }
                : require('@/assets/images/icon.png')
              } 
              style={styles.icon}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.title}>Install HEKO App</Text>
            <Text style={styles.description}>
              {isIOS 
                ? 'Tap the Share button at the bottom of Safari, then select "Add to Home Screen"'
                : isAndroid
                  ? deferredPrompt
                    ? 'Tap "Add" below to install HEKO on your home screen'
                    : 'Chrome may need a few moments to detect the app. Try:\n\n1. Wait 10-30 seconds and refresh\n2. Tap Chrome menu (⋮) → Look for "Install app"\n3. If missing: Clear Chrome cache and try again\n\nNote: Chrome requires the service worker to be active before showing install option.'
                  : 'Add HEKO to your home screen for quick access and a better experience'
              }
            </Text>
          </View>

          {!isIOS && deferredPrompt && (
            <TouchableOpacity 
              style={styles.installButton}
              onPress={handleInstall}
            >
              <Download size={18} color={Colors.text.inverse} />
              <Text style={styles.installButtonText}>Add</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.dismissButton}
            onPress={handleDismiss}
          >
            <X size={20} color={Colors.text.tertiary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute' as any,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    pointerEvents: 'box-none' as any,
  },
  prompt: {
    backgroundColor: '#F5F5F0', // Light beige background
    borderTopWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: '#F5F5F0',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  icon: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    flex: 1,
    paddingTop: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    color: Colors.text.primary,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  installButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.brand.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 2,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  installButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.inverse,
  },
  dismissButton: {
    padding: 6,
    marginTop: -2,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
});

