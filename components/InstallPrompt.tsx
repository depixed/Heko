import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { X, Download } from 'lucide-react-native';
import Colors from '@/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PROMPT_DISMISSED_KEY = '@heko_install_prompt_dismissed';
const PROMPT_INSTALLED_KEY = '@heko_app_installed';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Only run on web
    if (Platform.OS !== 'web') {
      return;
    }

    const checkIfDismissed = async () => {
      try {
        const dismissed = await AsyncStorage.getItem(PROMPT_DISMISSED_KEY);
        const installed = await AsyncStorage.getItem(PROMPT_INSTALLED_KEY);
        
        // Don't show if user dismissed or already installed
        if (dismissed === 'true' || installed === 'true') {
          return false;
        }
        return true;
      } catch (error) {
        console.error('[InstallPrompt] Error checking dismissed state:', error);
        return true;
      }
    };

    const initializePrompt = async () => {
      const canShow = await checkIfDismissed();
      if (!canShow) {
        console.log('[InstallPrompt] Prompt dismissed or already installed');
        return;
      }

      // Check if running as standalone app (already installed)
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      
      setIsStandalone(standalone);

      if (standalone) {
        console.log('[InstallPrompt] Running as standalone app, not showing prompt');
        // Mark as installed
        await AsyncStorage.setItem(PROMPT_INSTALLED_KEY, 'true');
        return;
      }

      // Detect iOS
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIOS(ios);

      // Detect Android
      const android = /Android/.test(navigator.userAgent);
      
      console.log('[InstallPrompt] Platform detection:', { ios, android, standalone });

      // Show prompt for both iOS and Android after a delay
      // For Android, we'll show it even if beforeinstallprompt doesn't fire
      setTimeout(() => {
        console.log('[InstallPrompt] Showing prompt after delay');
        setShowPrompt(true);
      }, 3000); // Show after 3 seconds
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
    const handleAppInstalled = async () => {
      console.log('[InstallPrompt] App was installed');
      setShowPrompt(false);
      await AsyncStorage.setItem(PROMPT_INSTALLED_KEY, 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

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
          await AsyncStorage.setItem(PROMPT_INSTALLED_KEY, 'true');
        }
        
        // Clear deferred prompt
        setDeferredPrompt(null);
        setShowPrompt(false);
      } catch (error) {
        console.error('[InstallPrompt] Error showing install prompt:', error);
        // Fall through to manual instructions
      }
    } else {
      // Fallback: Show instructions for manual installation
      console.log('[InstallPrompt] No deferred prompt, showing manual instructions');
      // On Android Chrome, user can manually add via menu
      // We'll keep the prompt visible with instructions
      alert('To install HEKO:\n\n1. Tap the menu (⋮) in Chrome\n2. Select "Install app" or "Add to Home screen"\n3. Tap "Install"');
    }
  };

  const handleDismiss = async () => {
    setShowPrompt(false);
    try {
      await AsyncStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
    } catch (error) {
      console.error('[InstallPrompt] Error saving dismissed state:', error);
    }
  };

  // Don't show if already standalone or not on web
  if (!showPrompt || isStandalone || Platform.OS !== 'web') {
    return null;
  }

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
                ? 'Tap the Share button and select "Add to Home Screen"'
                : deferredPrompt
                  ? 'Add HEKO to your home screen for quick access and a better experience'
                  : 'Tap the menu (⋮) in Chrome and select "Install app" or "Add to Home screen"'
              }
            </Text>
          </View>

          {!isIOS && (
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
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
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

