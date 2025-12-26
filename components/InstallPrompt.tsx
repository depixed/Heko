import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { X, Download, Share } from 'lucide-react-native';
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
        return;
      }

      // Check if running as standalone app (already installed)
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      
      setIsStandalone(standalone);

      if (standalone) {
        // Mark as installed
        await AsyncStorage.setItem(PROMPT_INSTALLED_KEY, 'true');
        return;
      }

      // Detect iOS
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIOS(ios);

      if (ios) {
        // For iOS, show prompt after a delay (can't detect standalone installation)
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000); // Show after 3 seconds
      }
    };

    // Listen for beforeinstallprompt event (Android, Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      
      // Show prompt after a delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
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

    if (!deferredPrompt) {
      return;
    }

    try {
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
                : 'Add HEKO to your home screen for quick access and a better experience'
              }
            </Text>
          </View>

          <View style={styles.actions}>
            {isIOS ? (
              <View style={styles.iosInstructions}>
                <Share size={20} color={Colors.brand.primary} />
                <Text style={styles.iosText}>Tap Share, then "Add to Home Screen"</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.installButton}
                onPress={handleInstall}
              >
                <Download size={18} color={Colors.text.inverse} />
                <Text style={styles.installButtonText}>Add to Home Screen</Text>
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
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.background.secondary,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  icon: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'column',
    gap: 8,
    alignItems: 'flex-end',
  },
  installButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
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
    padding: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  iosInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  iosText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.brand.primary,
  },
});

