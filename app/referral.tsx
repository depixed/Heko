import React, { useState, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Stack, router, useNavigation } from 'expo-router';
import {
  ChevronLeft,
  HelpCircle,
  Copy,
  Share2,
  Download,
  ChevronRight,
  UserPlus,
  X,
  Check,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/lib/auth.service';
import Colors from '@/constants/colors';

export default function ReferralScreen() {
  const { user, referralStats, updateUser } = useAuth();
  const navigation = useNavigation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddReferrerModal, setShowAddReferrerModal] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [referrerDetails, setReferrerDetails] = useState<{ id: string; name: string } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qrRef = useRef<any>(null);

  const referralCode = user?.referralId || '';
  const referralLink = `https://heko.co.in/r/${referralCode}`;

  // Update header dynamically when user state changes
  useLayoutEffect(() => {
    const hasNoReferrer = user && (!user.referredBy || user.referredBy === null || user.referredBy === undefined || user.referredBy === '');
    console.log('[Referral] useLayoutEffect - User:', user?.id, 'referredBy:', user?.referredBy, 'hasNoReferrer:', hasNoReferrer);
    
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRightContainer}>
          {hasNoReferrer && (
            <TouchableOpacity onPress={handleOpenAddReferrerModal} style={styles.headerButton}>
              <UserPlus size={24} color={Colors.brand.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={openTerms} style={styles.headerButton}>
            <HelpCircle size={24} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [user, navigation]);

  const generateReferralCode = async () => {
    // Check if user is logged in
    if (!user) {
      router.push('/auth/login' as any);
      return;
    }

    // If user already has a referral code, they're already on the referral page
    if (referralCode) {
      return;
    }

    setIsGenerating(true);
    try {
      // Generate 4-digit alphanumeric code
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let newCode = '';
      for (let i = 0; i < 4; i++) {
        newCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      await updateUser({ referralId: newCode });
      Alert.alert('Success', 'Your referral code has been generated!');
    } catch (error) {
      console.error('Error generating referral code:', error);
      Alert.alert('Error', 'Failed to generate referral code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', `${label} copied to clipboard`);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy. Please try again.');
    }
  };

  const shareReferral = async () => {
    try {
      const message = `Shop groceries on HEKO and save! Use my code ${referralCode} or tap: ${referralLink}`;
      await Share.share({
        message,
        title: 'Join HEKO',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const saveQRCode = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web-friendly download using canvas and anchor
        qrRef.current?.toDataURL((dataURL: string) => {
          try {
            const link = document.createElement('a');
            link.download = 'heko-referral-qr.png';
            link.href = dataURL;
            link.click();
            Alert.alert('Success', 'QR code downloaded');
          } catch (error) {
            console.error('Error downloading QR code:', error);
            Alert.alert('Error', 'Failed to download QR code. Please try again.');
          }
        });
        return;
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save images.');
        return;
      }

      qrRef.current?.toDataURL(async (dataURL: string) => {
        try {
          const fileUri = `${FileSystem.cacheDirectory}heko-referral-qr.png`;
          await FileSystem.writeAsStringAsync(fileUri, dataURL, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          const asset = await MediaLibrary.createAssetAsync(fileUri);
          await MediaLibrary.createAlbumAsync('HEKO', asset, false);
          
          Alert.alert('Success', 'QR code saved to gallery');
        } catch (error) {
          console.error('Error saving QR code:', error);
          Alert.alert('Error', 'Failed to save QR code. Please try again.');
        }
      });
    } catch (error) {
      console.error('Error saving QR code:', error);
      Alert.alert('Error', 'Failed to save QR code. Please try again.');
    }
  };

  const shareQRCode = async () => {
    try {
      if (Platform.OS === 'web') {
        await shareReferral();
        return;
      }

      qrRef.current?.toDataURL(async (dataURL: string) => {
        try {
          const fileUri = `${FileSystem.cacheDirectory}heko-referral-qr.png`;
          await FileSystem.writeAsStringAsync(fileUri, dataURL, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          await Share.share({
            url: fileUri,
            message: `Shop groceries on HEKO and save! Use my code ${referralCode} or scan this QR code.`,
          });
        } catch (error) {
          console.error('Error sharing QR code:', error);
          await shareReferral();
        }
      });
    } catch (error) {
      console.error('Error sharing QR code:', error);
      await shareReferral();
    }
  };

  const openTerms = () => {
    Alert.alert(
      'Referral Terms & Conditions',
      '• Earn 100% cashback to Virtual on your own orders\n• Share your code with friends\n• When friend orders, 10% of their bill converts from your Virtual → Actual\n• Only Actual Wallet is spendable at checkout\n• No limit on referrals\n• Terms subject to change'
    );
  };

  const viewAllActivity = () => {
    Alert.alert('Coming Soon', 'Detailed activity view will be available soon.');
  };

  const handleOpenAddReferrerModal = () => {
    setShowAddReferrerModal(true);
    setReferralCodeInput('');
    setReferrerDetails(null);
    setError(null);
  };

  const handleCloseAddReferrerModal = () => {
    setShowAddReferrerModal(false);
    setReferralCodeInput('');
    setReferrerDetails(null);
    setError(null);
  };

  const handleCheckReferrer = async () => {
    if (!referralCodeInput || referralCodeInput.length !== 4) {
      setError('Please enter a valid 4-character referral code');
      return;
    }

    setIsChecking(true);
    setError(null);
    setReferrerDetails(null);

    try {
      const result = await authService.lookupReferrerByCode(referralCodeInput);
      if (result.success && result.referrer) {
        setReferrerDetails(result.referrer);
      } else {
        setError(result.error || 'Referral code not found');
      }
    } catch (error) {
      console.error('Error checking referrer:', error);
      setError('Failed to check referral code. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleConfirmReferrer = async () => {
    if (!user || !referrerDetails) return;

    setIsConfirming(true);
    setError(null);

    try {
      console.log('[Referral] Attempting to add referrer:', {
        userId: user.id,
        referralCode: referralCodeInput,
        referrerId: referrerDetails.id,
        referrerName: referrerDetails.name,
      });
      
      const result = await authService.addReferrer(user.id, referralCodeInput);
      
      console.log('[Referral] Add referrer result:', result);
      
      if (result.success && result.referrer) {
        // Update user state with new referredBy from the response
        await updateUser({ referredBy: result.referrer.id });
        Alert.alert('Success', `You have successfully added ${result.referrer.name} as your referrer!`);
        handleCloseAddReferrerModal();
      } else {
        const errorMessage = result.error || 'Failed to add referrer';
        console.error('[Referral] Failed to add referrer:', errorMessage);
        setError(errorMessage);
      }
    } catch (error: any) {
      console.error('[Referral] Exception adding referrer:', error);
      console.error('[Referral] Error details:', JSON.stringify(error, null, 2));
      setError(error?.message || 'Failed to add referrer. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  if (!referralCode) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Refer & Earn',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                <ChevronLeft size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            ),
            headerRight: () => (
              <View style={styles.headerRightContainer}>
                {user && (!user.referredBy || user.referredBy === null || user.referredBy === undefined || user.referredBy === '') && (
                  <TouchableOpacity onPress={handleOpenAddReferrerModal} style={styles.headerButton}>
                    <UserPlus size={24} color={Colors.brand.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={openTerms} style={styles.headerButton}>
                  <HelpCircle size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>
            ),
          }}
        />
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>🎁</Text>
            </View>
            <Text style={styles.emptyTitle}>Get Your Referral Code</Text>
            <Text style={styles.emptySubtitle}>
              Generate your unique referral code to start earning rewards when your friends shop on HEKO
            </Text>
            <TouchableOpacity
              style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
              onPress={generateReferralCode}
              disabled={isGenerating}
            >
              <Text style={styles.generateButtonText}>
                {isGenerating ? 'Generating...' : 'Generate My Code'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Add Referrer Modal */}
        <Modal
          visible={showAddReferrerModal}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseAddReferrerModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Referrer</Text>
                <TouchableOpacity onPress={handleCloseAddReferrerModal} style={styles.modalCloseButton}>
                  <X size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>Enter Referral Code</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter 4-character code"
                  placeholderTextColor={Colors.text.tertiary}
                  value={referralCodeInput}
                  onChangeText={(text) => {
                    setReferralCodeInput(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4));
                    setError(null);
                    setReferrerDetails(null);
                  }}
                  autoCapitalize="characters"
                  maxLength={4}
                  editable={!isChecking && !isConfirming}
                />

                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {referrerDetails && (
                  <View style={styles.referrerDetailsContainer}>
                    <View style={styles.referrerInfo}>
                      <View style={styles.referrerAvatar}>
                        <Text style={styles.referrerAvatarText}>
                          {referrerDetails.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.referrerName}>{referrerDetails.name}</Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.checkButton,
                    (referralCodeInput.length !== 4 || isChecking || isConfirming) && styles.checkButtonDisabled,
                  ]}
                  onPress={handleCheckReferrer}
                  disabled={referralCodeInput.length !== 4 || isChecking || isConfirming}
                >
                  {isChecking ? (
                    <ActivityIndicator color={Colors.text.inverse} />
                  ) : (
                    <Text style={styles.checkButtonText}>Check Referrer</Text>
                  )}
                </TouchableOpacity>

                {referrerDetails && (
                  <View style={styles.confirmActions}>
                    <TouchableOpacity
                      style={[styles.cancelButton, isConfirming && styles.cancelButtonDisabled]}
                      onPress={handleCloseAddReferrerModal}
                      disabled={isConfirming}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.confirmButton, isConfirming && styles.confirmButtonDisabled]}
                      onPress={handleConfirmReferrer}
                      disabled={isConfirming}
                    >
                      {isConfirming ? (
                        <ActivityIndicator color={Colors.text.inverse} />
                      ) : (
                        <>
                          <Check size={20} color={Colors.text.inverse} />
                          <Text style={styles.confirmButtonText}>Confirm</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Refer & Earn',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ChevronLeft size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          ),
            headerRight: () => (
              <View style={styles.headerRightContainer}>
                {user && (!user.referredBy || user.referredBy === null || user.referredBy === undefined || user.referredBy === '') && (
                  <TouchableOpacity onPress={handleOpenAddReferrerModal} style={styles.headerButton}>
                    <UserPlus size={24} color={Colors.brand.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={openTerms} style={styles.headerButton}>
                  <HelpCircle size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>
            ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroIconText}>🎁</Text>
          </View>
          <Text style={styles.heroTitle}>Invite friends to convert your cashback into spendable balance</Text>
          <Text style={styles.heroSubtitle}>
            Share your code and earn 10% of your friend's orders, converted from Virtual to Actual Wallet.
          </Text>
        </View>

        <View style={styles.keyPointsCard}>
          <Text style={styles.keyPointsTitle}>Key Points</Text>
          <View style={styles.keyPointsList}>
            <View style={styles.keyPointItem}>
              <View style={styles.keyPointNumber}>
                <Text style={styles.keyPointNumberText}>1</Text>
              </View>
              <Text style={styles.keyPointText}>
                Earn 100% cashback to Virtual on your own orders.
              </Text>
            </View>
            <View style={styles.keyPointItem}>
              <View style={styles.keyPointNumber}>
                <Text style={styles.keyPointNumberText}>2</Text>
              </View>
              <Text style={styles.keyPointText}>
                Share your code/link/QR; when your friend orders, you get 10% of their bill converted from your Virtual → to your Actual.
              </Text>
            </View>
            <View style={styles.keyPointItem}>
              <View style={styles.keyPointNumber}>
                <Text style={styles.keyPointNumberText}>3</Text>
              </View>
              <Text style={styles.keyPointText}>
                Spend from Actual Wallet on your next orders.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.sectionTitle}>Your Code & QR</Text>

          <View style={styles.codeSection}>
            <View style={styles.codeRow}>
              <View style={styles.codeLeft}>
                <Text style={styles.codeLabel}>Your Code</Text>
                <Text style={styles.codeValue}>{referralCode}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => copyToClipboard(referralCode, 'Referral code')}
              >
                <Copy size={20} color={Colors.brand.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.linkRow}>
              <View style={styles.linkLeft}>
                <Text style={styles.linkLabel}>Referral Link</Text>
                <Text style={styles.linkValue} numberOfLines={1} ellipsizeMode="middle">
                  {referralLink}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => copyToClipboard(referralLink, 'Referral link')}
              >
                <Copy size={20} color={Colors.brand.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.qrSection}>
            <View style={styles.qrContainer}>
              <QRCode
                value={referralLink}
                size={240}
                backgroundColor="white"
                color={Colors.text.primary}
                getRef={(ref) => (qrRef.current = ref)}
              />
            </View>
            <View style={styles.qrActions}>
              <TouchableOpacity style={styles.qrActionButton} onPress={saveQRCode}>
                <Download size={20} color={Colors.brand.primary} />
                <Text style={styles.qrActionText}>{Platform.OS === 'web' ? 'Download QR' : 'Save QR'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.qrActionButton} onPress={shareQRCode}>
                <Share2 size={20} color={Colors.brand.primary} />
                <Text style={styles.qrActionText}>Share QR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{referralStats.totalReferred}</Text>
              <Text style={styles.statLabel}>Friends Joined</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{referralStats.activeReferrers}</Text>
              <Text style={styles.statLabel}>Active Shoppers</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>₹{referralStats.thisMonthEarnings}</Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>₹{referralStats.lifetimeEarnings}</Text>
              <Text style={styles.statLabel}>Lifetime Earnings</Text>
            </View>
          </View>
          <Text style={styles.statsNote}>
            Conversions happen automatically when your friend's order is delivered.
          </Text>
        </View>

        {referralStats.referrals.length > 0 && (
          <View style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={viewAllActivity}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.activityList}>
              {referralStats.referrals.slice(0, 5).map((referral, index) => (
                <View key={referral.userId} style={styles.activityItem}>
                  <View style={styles.activityLeft}>
                    <Text style={styles.activityName}>{referral.userName}</Text>
                    <Text style={styles.activityStatus}>
                      {referral.totalOrders > 0
                        ? `${referral.totalOrders} order${referral.totalOrders > 1 ? 's' : ''} • Earned ₹${referral.totalEarnings}`
                        : 'Joined'}
                    </Text>
                    <Text style={styles.activityTime}>
                      {new Date(referral.joinedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={Colors.text.tertiary} />
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.legalFooter}>
          <Text style={styles.legalText}>
            By inviting, you agree to{' '}
            <Text style={styles.legalLink} onPress={openTerms}>
              Referral T&Cs
            </Text>
            .
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.inviteButton} onPress={shareReferral}>
          <Text style={styles.inviteButtonText}>Invite Friends</Text>
        </TouchableOpacity>
      </View>

      {/* Add Referrer Modal */}
      <Modal
        visible={showAddReferrerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseAddReferrerModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Referrer</Text>
              <TouchableOpacity onPress={handleCloseAddReferrerModal} style={styles.modalCloseButton}>
                <X size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Enter Referral Code</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter 4-character code"
                placeholderTextColor={Colors.text.tertiary}
                value={referralCodeInput}
                onChangeText={(text) => {
                  setReferralCodeInput(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4));
                  setError(null);
                  setReferrerDetails(null);
                }}
                autoCapitalize="characters"
                maxLength={4}
                editable={!isChecking && !isConfirming}
              />

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {referrerDetails && (
                <View style={styles.referrerDetailsContainer}>
                  <View style={styles.referrerInfo}>
                    <View style={styles.referrerAvatar}>
                      <Text style={styles.referrerAvatarText}>
                        {referrerDetails.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.referrerName}>{referrerDetails.name}</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.checkButton,
                  (referralCodeInput.length !== 4 || isChecking || isConfirming) && styles.checkButtonDisabled,
                ]}
                onPress={handleCheckReferrer}
                disabled={referralCodeInput.length !== 4 || isChecking || isConfirming}
              >
                {isChecking ? (
                  <ActivityIndicator color={Colors.text.inverse} />
                ) : (
                  <Text style={styles.checkButtonText}>Check Referrer</Text>
                )}
              </TouchableOpacity>

              {referrerDetails && (
                <View style={styles.confirmActions}>
                  <TouchableOpacity
                    style={[styles.cancelButton, isConfirming && styles.cancelButtonDisabled]}
                    onPress={handleCloseAddReferrerModal}
                    disabled={isConfirming}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmButton, isConfirming && styles.confirmButtonDisabled]}
                    onPress={handleConfirmReferrer}
                    disabled={isConfirming}
                  >
                    {isConfirming ? (
                      <ActivityIndicator color={Colors.text.inverse} />
                    ) : (
                      <>
                        <Check size={20} color={Colors.text.inverse} />
                        <Text style={styles.confirmButtonText}>Confirm</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  headerButton: {
    padding: 8,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    maxWidth: 400,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIconText: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  generateButton: {
    backgroundColor: Colors.brand.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    minWidth: 200,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  heroCard: {
    backgroundColor: Colors.background.primary,
    margin: 16,
    marginBottom: 12,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIconText: {
    fontSize: 40,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  keyPointsCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
  },
  keyPointsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.brand.primary,
    marginBottom: 16,
  },
  keyPointsList: {
    gap: 16,
  },
  keyPointItem: {
    flexDirection: 'row',
    gap: 12,
  },
  keyPointNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  keyPointNumberText: {
    color: Colors.text.inverse,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  keyPointText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  codeCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.brand.primary,
    marginBottom: 16,
  },
  codeSection: {
    marginBottom: 24,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  codeLeft: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', web: 'monospace' }),
    letterSpacing: 2,
  },
  copyButton: {
    padding: 8,
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 8,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkLeft: {
    flex: 1,
    marginRight: 12,
  },
  linkLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  linkValue: {
    fontSize: 13,
    color: Colors.brand.primary,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', web: 'monospace' }),
  },
  qrSection: {
    alignItems: 'center',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: Colors.background.primary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginBottom: 16,
  },
  qrActions: {
    flexDirection: 'row',
    gap: 16,
  },
  qrActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.brand.primary,
  },
  qrActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.brand.primary,
  },
  statsCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statTile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.brand.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  statsNote: {
    fontSize: 12,
    color: Colors.text.tertiary,
    textAlign: 'center',
    fontStyle: 'italic' as const,
  },
  activityCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.brand.primary,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  activityLeft: {
    flex: 1,
  },
  activityName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  activityStatus: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  legalFooter: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  legalText: {
    fontSize: 12,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    color: Colors.brand.primary,
    textDecorationLine: 'underline' as const,
  },
  bottomBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.select({ ios: 32, android: 12, web: 20 }),
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  inviteButton: {
    backgroundColor: Colors.brand.primary,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  inviteButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: Platform.select({ ios: 40, android: 24, web: 24 }),
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    backgroundColor: Colors.background.secondary,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', web: 'monospace' }),
    letterSpacing: 4,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
  },
  referrerDetailsContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.brand.primary,
  },
  referrerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  referrerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  referrerAvatarText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.inverse,
  },
  referrerName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    flex: 1,
  },
  checkButton: {
    backgroundColor: Colors.brand.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  checkButtonDisabled: {
    opacity: 0.5,
  },
  checkButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.brand.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
