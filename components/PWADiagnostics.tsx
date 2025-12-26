import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
import Colors from '@/constants/colors';

interface DiagnosticResult {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

export default function PWADiagnostics() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Show diagnostics if ?pwaDebug=1 in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('pwaDebug') === '1') {
      setIsVisible(true);
      runDiagnostics();
    }

    // Also expose global function
    (window as any).checkPWAInstallability = runDiagnostics;
  }, []);

  const runDiagnostics = async () => {
    const diagnostics: DiagnosticResult[] = [];

    // Check 1: HTTPS
    const isHTTPS = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    diagnostics.push({
      check: 'HTTPS',
      status: isHTTPS ? 'pass' : 'fail',
      message: isHTTPS ? 'Site is served over HTTPS' : 'Site must be served over HTTPS for PWA'
    });

    // Check 2: Manifest exists
    let manifest: any = null;
    try {
      const response = await fetch('/manifest.json');
      if (response.ok) {
        manifest = await response.json();
        diagnostics.push({
          check: 'Manifest accessible',
          status: 'pass',
          message: 'manifest.json is accessible'
        });
      } else {
        diagnostics.push({
          check: 'Manifest accessible',
          status: 'fail',
          message: `manifest.json returned ${response.status}`
        });
      }
    } catch (error) {
      diagnostics.push({
        check: 'Manifest accessible',
        status: 'fail',
        message: `Error fetching manifest: ${error}`
      });
    }

    // Check 3: Manifest has required fields
    if (manifest) {
      const required = ['name', 'icons', 'start_url', 'display'];
      required.forEach(field => {
        if (manifest[field]) {
          diagnostics.push({
            check: `Manifest: ${field}`,
            status: 'pass',
            message: `${field} is present`
          });
        } else {
          diagnostics.push({
            check: `Manifest: ${field}`,
            status: 'fail',
            message: `${field} is missing (required)`
          });
        }
      });
    }

    // Check 4: Icons (192x192 and 512x512)
    if (manifest?.icons) {
      const has192 = manifest.icons.some((icon: any) => icon.sizes === '192x192');
      const has512 = manifest.icons.some((icon: any) => icon.sizes === '512x512');
      
      diagnostics.push({
        check: 'Icon: 192x192',
        status: has192 ? 'pass' : 'fail',
        message: has192 ? '192x192 icon present' : '192x192 icon missing (required)'
      });
      
      diagnostics.push({
        check: 'Icon: 512x512',
        status: has512 ? 'pass' : 'fail',
        message: has512 ? '512x512 icon present' : '512x512 icon missing (required)'
      });
    }

    // Check 5: Service Worker support
    const hasSW = 'serviceWorker' in navigator;
    diagnostics.push({
      check: 'Service Worker support',
      status: hasSW ? 'pass' : 'fail',
      message: hasSW ? 'Browser supports service workers' : 'Browser does not support service workers'
    });

    // Check 6: Service Worker registered
    if (hasSW) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          diagnostics.push({
            check: 'Service Worker registered',
            status: 'pass',
            message: `Service worker is registered (scope: ${registration.scope})`
          });
          
          if (registration.active) {
            diagnostics.push({
              check: 'Service Worker active',
              status: 'pass',
              message: 'Service worker is active and running'
            });
          } else if (registration.installing) {
            diagnostics.push({
              check: 'Service Worker active',
              status: 'warning',
              message: 'Service worker is installing (not yet active)'
            });
          } else {
            diagnostics.push({
              check: 'Service Worker active',
              status: 'fail',
              message: 'Service worker is registered but not active'
            });
          }
        } else {
          diagnostics.push({
            check: 'Service Worker registered',
            status: 'fail',
            message: 'No service worker registration found'
          });
        }
      } catch (error) {
        diagnostics.push({
          check: 'Service Worker registered',
          status: 'fail',
          message: `Error checking service worker: ${error}`
        });
      }
    }

    // Check 7: Manifest link in HTML
    const manifestLink = document.querySelector('link[rel="manifest"]');
    diagnostics.push({
      check: 'Manifest link in HTML',
      status: manifestLink ? 'pass' : 'fail',
      message: manifestLink 
        ? `Manifest link found: ${manifestLink.getAttribute('href')}`
        : 'No manifest link found in HTML'
    });

    // Check 8: Display mode
    if (manifest) {
      const display = manifest.display || 'browser';
      const validDisplays = ['standalone', 'fullscreen', 'minimal-ui'];
      diagnostics.push({
        check: 'Display mode',
        status: validDisplays.includes(display) ? 'pass' : 'warning',
        message: `Display mode: ${display} ${validDisplays.includes(display) ? '(good for PWA)' : '(browser mode - not ideal)'}`
      });
    }

    setResults(diagnostics);
    console.log('[PWA Diagnostics] Results:', diagnostics);
  };

  if (!isVisible) return null;

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.title}>PWA Installability Diagnostics</Text>
        <Text style={styles.summary}>
          Pass: {passCount} | Fail: {failCount} | Warnings: {warningCount}
        </Text>
        <ScrollView style={styles.scrollView}>
          {results.map((result, index) => (
            <View key={index} style={styles.result}>
              <View style={[styles.statusDot, styles[result.status]]} />
              <View style={styles.resultContent}>
                <Text style={styles.checkName}>{result.check}</Text>
                <Text style={styles.checkMessage}>{result.message}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        <Text style={styles.help}>
          Add ?pwaDebug=1 to URL to see this panel{'\n'}
          Or run: window.checkPWAInstallability()
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10000,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  panel: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 20,
    maxWidth: 600,
    width: '100%',
    maxHeight: '80%',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      },
    }),
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  summary: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  scrollView: {
    maxHeight: 400,
  },
  result: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    marginTop: 4,
  },
  pass: {
    backgroundColor: Colors.status.success,
  },
  fail: {
    backgroundColor: Colors.status.error,
  },
  warning: {
    backgroundColor: '#FFA500',
  },
  resultContent: {
    flex: 1,
  },
  checkName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  checkMessage: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  help: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginTop: 16,
    textAlign: 'center' as const,
  },
});

