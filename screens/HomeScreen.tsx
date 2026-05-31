import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, Linking, Modal, ActivityIndicator, AppState } from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase, signInUser } from '../services/supabaseDatabase';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { Screen } from '../components/Layout';
import { Ionicons } from '@expo/vector-icons';
import { ExamMode } from '../types';
import { COLORS, ThemeColors } from '../theme/colors';
import { AdCarousel } from '../components/AdCarousel';
import * as localDB from '../services/localDatabase';
import { getDeviceIdentity } from '../services/deviceIdentity';
import { isPremiumActiveOnCurrentDevice } from '../services/premiumAccess';

export function HomeScreen() {
  const { results, isDataDownloaded, syncStatus, startSync, theme, fontSize, userProfile, setUserProfile } = useAppStore();
  const navigation = useNavigation<AppNavigationProp>();
  const isPaid = isPremiumActiveOnCurrentDevice(userProfile);

  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [referralBalance, setReferralBalance] = useState<number>(Number(userProfile?.referral_balance || 0));
  // State for pending verification
  const [pendingRef, setPendingRef] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [isAbandoned, setIsAbandoned] = useState(false);

  // Load any pending payment on mount
  useEffect(() => {
    checkPendingPayment();
    fetchReferralBalance();
  }, []);

  useEffect(() => {
    fetchReferralBalance();
  }, [userProfile?.id]);

  useEffect(() => {
    setReferralBalance(Number(userProfile?.referral_balance || 0));
  }, [userProfile?.referral_balance]);

  // Listen for App State changes (Background -> Foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkPendingPayment();
        fetchReferralBalance();
        refreshProfileAccess();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const fetchReferralBalance = async () => {
    try {
      const currentProfile = useAppStore.getState().userProfile;
      if (!currentProfile?.id) return;

      const { data, error } = await supabase
        .from('users')
        .select('referral_balance')
        .eq('id', currentProfile.id)
        .single();

      if (error) throw error;

      const latestBalance = Number(data?.referral_balance || 0);
      setReferralBalance(latestBalance);

      if (Number(currentProfile?.referral_balance || 0) !== latestBalance) {
        setUserProfile({ ...currentProfile, referral_balance: latestBalance });
      }
    } catch (e) {
      console.error('[Referral] Failed to fetch referral balance:', e);
    }
  };

  const persistProfile = async (profile: any) => {
    if (!profile?.email) return;
    const cachedUser = await localDB.getCurrentUser() as { password?: string } | null;

    await localDB.saveUserLocal({
      ...profile,
      password: userProfile?.password || cachedUser?.password || '',
      is_paid: profile.is_paid ? 1 : 0,
      current_device_has_premium: profile.current_device_has_premium ? 1 : 0,
      premium_revoked_permanently: profile.premium_revoked_permanently ? 1 : 0,
    });
  };

  const refreshProfileAccess = async () => {
    try {
      const currentProfile = useAppStore.getState().userProfile;
      if (!currentProfile?.email || !currentProfile?.password) return;

      const refreshedProfile = await signInUser(currentProfile.email, currentProfile.password);
      setUserProfile({ ...refreshedProfile, password: currentProfile.password });
      await localDB.saveUserLocal({
        ...refreshedProfile,
        password: currentProfile.password,
        is_paid: refreshedProfile.is_paid ? 1 : 0,
        current_device_has_premium: refreshedProfile.current_device_has_premium ? 1 : 0,
        premium_revoked_permanently: refreshedProfile.premium_revoked_permanently ? 1 : 0,
      });
    } catch (error) {
      console.warn('[Access] Failed to refresh device access:', error);
    }
  };

  const checkPendingPayment = async () => {
    try {
      if (isPaid) return;

      const settings = await localDB.getSettings();
      const savedRef = settings['pending_paystack_ref'];
      
      if (savedRef && savedRef.length > 0) {
        setPendingRef(savedRef);
        setIsAbandoned(false); // Reset this so the banner shows for the valid ref
        // Silently verify on mount - only show alert if it actually succeeds
        verifyPayment(savedRef, true);
      }
    } catch (e) {
      console.error('[Payment] Failed to check pending:', e);
    }
  };

  const handleFeaturePress = (routeName: string, params?: any) => {
    if (!isPaid) {
      Alert.alert(
        'Activation Required',
        'You need to activate your account to access this feature. Activation costs 1,500/year.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Activate Now', onPress: () => handleActivate() }
        ]
      );
      return;
    }
    navigation.navigate(routeName as any, params);
  };

  const handleActivate = async () => {
    if (!userProfile?.email) {
      Alert.alert('Error', 'Please log in to activate your account.');
      return;
    }

    // If there's already a pending payment, ask to verify or restart
    if (pendingRef && !isPaid) {
      Alert.alert(
        'Payment Pending',
        'You have an unfinished payment attempt. Would you like to check its status or start a new one?',
        [
          { text: 'Verify Existing', onPress: () => verifyPayment(pendingRef) },
          { text: 'Start Fresh', onPress: () => startNewPaymentFlow() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    await startNewPaymentFlow();
  };

  const startNewPaymentFlow = async () => {
    try {
      setLoading(true);
      setIsAbandoned(false); // Reset abandoned state for a fresh attempt
      const device = await getDeviceIdentity();

      const { data, error } = await supabase.functions.invoke('paystack-init', {
        body: {
          email: userProfile.email,
          amount: 1500,
          metadata: {
            user_id: userProfile.id,
            device_id: device.deviceId,
            device_name: device.deviceName,
          }
        }
      });

      if (error) {
        console.error('[Payment] Raw Full Error:', JSON.stringify(error, null, 2));
        let errorMessage = error.message || 'Unknown Error';

        try {
          const responseText = await error.context?.text();
          if (responseText) {
            const errorObj = JSON.parse(responseText);
            if (errorObj.error) errorMessage = errorObj.error;
            else if (errorObj.message) errorMessage = errorObj.message;
          }
        } catch (e) { }

        Alert.alert('Payment Error Detail', `Status: ${error.status}\nMessage: ${errorMessage}`);
        setLoading(false);
        return;
      }
      if (data.status && data.data.authorization_url) {
        const ref = data.data.reference;
        setReference(ref);
        setPaymentUrl(data.data.authorization_url);

        await localDB.saveSetting('pending_paystack_ref', ref);
        setPendingRef(ref);

      } else {
        throw new Error('Failed to initialize payment');
      }
    } catch (error: any) {
      Alert.alert('Payment Error', error.message || 'Could not start payment flow.');
    } finally {
      setLoading(false);
    }
  };

  const handleWebViewStateChange = async (navState: any) => {
    // Detect redirect back or closure
    if (navState.url.includes('standard.paystack.co/close') || navState.url.includes('success')) {
      setPaymentUrl(null);
      if (reference) {
        verifyPayment(reference);
      }
    }
  };

  const verifyPayment = async (ref: string, silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      
      const { data, error } = await supabase.functions.invoke(`paystack-verify?reference=${ref}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('[Payment] Verify Response Data:', JSON.stringify(data, null, 2));
      if (error) console.error('[Payment] Verify Response Error:', JSON.stringify(error, null, 2));

      if (error) throw error;

      // Definitive Success
      if (data.success) {
        const freshProfile = {
          ...userProfile,
          is_paid: true,
          expiry_date: data.expiry_date,
          active_premium_device_id: data.active_premium_device_id || userProfile?.active_premium_device_id,
          active_premium_device_name: data.active_premium_device_name || userProfile?.current_device_name,
          current_device_id: data.current_device_id || userProfile?.current_device_id,
          current_device_name: data.current_device_name || userProfile?.current_device_name,
          current_device_has_premium: true,
          premium_revoked_permanently: false,
          device_access_state: 'active',
          premium_checked_at: new Date().toISOString(),
          premium_offline_valid_until: data.premium_offline_valid_until || userProfile?.premium_offline_valid_until,
        };
        setUserProfile(freshProfile);

        try {
          await persistProfile(freshProfile);
          await localDB.saveSetting('pending_paystack_ref', '');
          setPendingRef(null);
          setReference(null);
        } catch (dbError) {
          console.error('[Payment] Local DB Sync Failed:', dbError);
        }

        Alert.alert('Activation Successful', 'Your account has been activated! All features are now unlocked.');
        return;
      }

      // Catch the status correctly - Target data.data.status precisely as it contains the string
      let status = 'unknown';
      if (typeof data.status === 'string') {
        status = data.status;
      } else if (data.data && typeof data.data.status === 'string') {
        status = data.data.status;
      } else if (data.data?.data && typeof data.data.data.status === 'string') {
        status = data.data.data.status;
      }

      const msg = data.message || data.data?.message || 'Verification failed.';
      console.log('[Payment] Final targeted status:', status);

      // Definitive Failures - We should clear the ref and hide the banner
      if (status === 'failed' || status === 'reversed' || status === 'abandoned' || status === 'not_found' || status === 'abandon') {
        if (status === 'abandoned' || status === 'abandon') {
          setIsAbandoned(true);
        }
        
        await localDB.saveSetting('pending_paystack_ref', '');
        setPendingRef(null);
        setReference(null);

        if (!silent) {
          const title = status === 'abandoned' || status === 'abandon' ? 'Payment Abandoned' : 
                       status === 'not_found' ? 'Session Expired' : 'Payment Failed';
          
          let body = `The transaction was ${status}. Message: ${msg}`;
          if (status === 'abandoned' || status === 'abandon') body = 'This payment attempt was not completed. If you were debited, please contact support.';
          if (status === 'not_found') body = 'This payment session has expired or is invalid. Please start a new activation.';

          Alert.alert(title, body, [
            { text: 'Contact Support', onPress: () => handleJoinWhatsApp() },
            { text: 'OK', style: 'cancel' }
          ]);
        }
      } 
      // Handling Ongoing/Pending or other statuses
      else {
        if (!silent) {
          Alert.alert(
            'Action Required',
            'We haven’t received your payment yet. If you have already paid, please wait a few moments as banks sometimes take time to process. \n\nIf you haven’t paid yet, please tap "Activate" to try again or finish your transaction.',
            [
              { text: 'Try Again', onPress: () => handleActivate() },
              { text: 'OK', style: 'cancel' }
            ]
          );
        }
        // If silent, we do nothing and keep the banner, as it might still be processing
      }

    } catch (error: any) {
      console.error('[Payment] Verification Error:', error);
      // Only show error alert if it's NOT a silent check
      if (!silent) {
        Alert.alert('Verification Error', 'An error occurred while verifying your payment. Please check your internet connection.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const isDark = theme === 'dark';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;
  const greetingSize = fontSize === 'small' ? 12 : fontSize === 'medium' ? 14 : fontSize === 'large' ? 16 : 18;
  const nameSize = fontSize === 'small' ? 22 : fontSize === 'medium' ? 26 : fontSize === 'large' ? 30 : 34;

  const handleJoinWhatsApp = () => {
    Linking.openURL('https://wa.me/2348129271673').catch(() => {
      Alert.alert('Error', 'Could not open WhatsApp. Please make sure it is installed.');
    });
  };

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning,';
    if (hours < 18) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  if (!isDataDownloaded && !syncStatus.isSyncing) {
    return (
      <Screen scrollable={false} style={[styles.downloadScreen, { backgroundColor: colors.background }]}>
        <View style={styles.contentContainer}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[styles.brandTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>STUDYCOLOGY</Text>
          <Text style={styles.brandSubtitle}>
            Preparation is the key to success.{'\n'}
            <Text style={{ fontWeight: '700', color: isDark ? '#94A3B8' : '#64748B' }}>Connect once. Practice forever.</Text>
          </Text>

          <TouchableOpacity
            style={[styles.syncBtn, { shadowColor: '#864b03', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 }]}
            onPress={() => startSync()}
          >
            <Text style={styles.syncBtnText}>Prepare Exams</Text>
            <Ionicons name="cloud-download-outline" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.homeScreen}>
      {syncStatus.isSyncing && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncBannerText}>
            Preparing exams for offline use... {Math.round(syncStatus.progress * 100)}%
          </Text>
        </View>
      )}

      <View style={styles.topHeader}>
        <View style={styles.headerMain}>
          <View>
            <Text style={[styles.greetingLabel, { fontSize: greetingSize }]}>{getGreeting()}</Text>
            <Text style={[styles.userName, { fontSize: nameSize, color: '#864b03' }]}>
              {userProfile?.name || 'Study Student'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.referralBadge}
              onPress={() => navigation.navigate('Referral')}
              activeOpacity={0.85}
            >
              <Ionicons name="gift-outline" size={15} color="#864b03" />
              <Text style={styles.referralBadgeText}>₦{referralBalance.toLocaleString()}</Text>
            </TouchableOpacity>

            {!isPaid && (
              <TouchableOpacity
                style={styles.activateBtn}
                onPress={handleActivate}
                activeOpacity={0.8}
              >
                <Ionicons name="key-outline" size={16} color="#FFFFFF" />
                <Text style={styles.activateText}>Activate</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Ready to Learn Text */}
      <View style={styles.readySection}>
        <Text style={styles.readyText}>Ready to learn and study today?</Text>
      </View>

      {/* Ad Carousel */}
      <AdCarousel placement="home" />

      {/* Pending Payment Banner */}
      {pendingRef && !isPaid && !isAbandoned && (
        <TouchableOpacity
          style={styles.pendingPaymentBanner}
          onPress={() => verifyPayment(pendingRef)}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-circle" size={32} color="#FFFFFF" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.pendingTitle}>Verification Pending</Text>
            <Text style={styles.pendingSubtitle}>Tap here to check payment status</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* WhatsApp Community Banner */}
      <TouchableOpacity
        style={styles.whatsappBanner}
        onPress={handleJoinWhatsApp}
      >
        <View style={styles.whatsappIconCircle}>
          <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.whatsappTitle}>Join Free WhatsApp Class</Text>
          <Text style={styles.whatsappSubtitle}>Get updates, tips and support directly!</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      <View style={styles.grid}>
        {/* Row 1 */}
        <View style={styles.gridRow}>
          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#864b03' }]}
            onPress={() => handleFeaturePress('ExamConfig', { mode: ExamMode.EXAM })}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Ionicons name="laptop-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>CBT Mode</Text>
            <Text style={[styles.cardSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>SIMULATION</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#864b03' }]}
            onPress={() => handleFeaturePress('PractiseSelection')}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Ionicons name="book-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Exam Mode</Text>
            <Text style={[styles.cardSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>PRACTICE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#864b03' }]}
            onPress={() => handleFeaturePress('PastQuestions')}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Ionicons name="library-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Past Qs</Text>
            <Text style={[styles.cardSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>BY YEAR</Text>
          </TouchableOpacity>
        </View>

        {/* Row 2 */}
        <View style={styles.gridRow}>
          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#864b03' }]}
            onPress={() => Linking.openURL('https://studycology.com/assignment.php').catch(err => console.error("Couldn't load page", err))}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Ionicons name="clipboard-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Assignment</Text>
            <Text style={[styles.cardSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>TASKS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#864b03' }]}
            onPress={() => handleFeaturePress('MainTabs', { screen: 'NotesTab' } as any)}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Study Notes</Text>
            <Text style={[styles.cardSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>REVISION</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#864b03' }]}
            onPress={() => handleFeaturePress('UtmeCompetition')}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Ionicons name="trophy-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Exam Chall.</Text>
            <Text style={[styles.cardSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>CHALLENGE</Text>
          </TouchableOpacity>
        </View>

        {/* Row 3 */}
        <View style={styles.gridRow}>
          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#864b03' }]}
            onPress={() => handleFeaturePress('MainTabs', { screen: 'JambTextsTab' } as any)}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Ionicons name="book-sharp" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Jamb Texts</Text>
            <Text style={[styles.cardSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>LITERATURE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#864b03' }]}
            onPress={() => handleFeaturePress('SubjectSelect', { nextScreen: 'EduGame' })}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Ionicons name="game-controller-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Edu Games</Text>
            <Text style={[styles.cardSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>FUN LEARNING</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#864b03' }]}
            onPress={() => navigation.navigate('CareerGuidance')}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Ionicons name="school-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Career & Inst.</Text>
            <Text style={[styles.cardSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>GUIDANCE</Text>
          </TouchableOpacity>
        </View>

        {/* Row 4 - Analysis & Progress */}
        <View style={styles.gridRow}>
          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#864b03' }]}
            onPress={() => navigation.navigate('Analysis')}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Ionicons name="analytics-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Analysis</Text>
            <Text style={[styles.cardSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>PERFORMANCE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#864b03' }]}
            onPress={() => navigation.navigate('ProgressTracker')}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Ionicons name="trophy-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Progress</Text>
            <Text style={[styles.cardSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>TRACKER</Text>
          </TouchableOpacity>

          {/* Hidden placeholder for grid alignment */}
          <View style={[styles.card, { opacity: 0, backgroundColor: 'transparent' }]} />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>Recent Activity</Text>
      </View>

      <View style={styles.activityList}>
        {results.length > 0 ? results.slice(0, 3).map((res) => (
          <TouchableOpacity
            key={res.id}
            style={[styles.activityCard, { backgroundColor: isDark ? '#162127' : '#ffffff', borderColor: isDark ? '#2a3942' : '#e2e8f0' }]}
            onPress={() => navigation.navigate('HistoryDetail', { resultId: res.id })}
          >
            <View style={styles.activityLeft}>
              <View style={[styles.subjectCircle, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name={res.mode === ExamMode.EXAM ? "ribbon-outline" : "book-outline"} size={20} color="#864b03" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.activitySubject, { color: isDark ? '#F1F5F9' : '#0F172A' }]} numberOfLines={1}>
                  {res.mode === ExamMode.EXAM ? 'JAMB Simulation' : 'Standard Practice'}
                </Text>
                <Text style={styles.activityMeta}>Score: {res.totalScore?.toFixed(0) || 0}% • {new Date(res.date).toLocaleDateString()}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#475569' : '#CBD5E1'} />
          </TouchableOpacity>
        )) : (
          <View style={[styles.emptyState, { backgroundColor: isDark ? '#162127' : '#ffffff', borderColor: isDark ? '#2a3942' : '#e2e8f0' }]}>
            <Text style={styles.emptyText}>No activity yet. Start a session!</Text>
          </View>
        )}
      </View>

      {/* Payment WebView Modal */}
      <Modal visible={!!paymentUrl} animationType="slide">
        <View style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setPaymentUrl(null);
              if (reference) verifyPayment(reference, true);
            }}>
              <Ionicons name="close" size={28} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Secure Payment</Text>
            <View style={{ width: 28 }} />
          </View>
          <WebView
            source={{ uri: paymentUrl || '' }}
            onNavigationStateChange={handleWebViewStateChange}
            startInLoadingState
            renderLoading={() => <ActivityIndicator size="large" color="#864b03" style={styles.loader} />}
          />
        </View>
      </Modal>

      {/* Global Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  homeScreen: { flex: 1 },
  downloadScreen: { flex: 1 },
  contentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  logoImage: { width: 120, height: 120, marginBottom: 24 },
  brandTitle: { fontSize: 32, fontWeight: '900', marginBottom: 16, letterSpacing: -1 },
  brandSubtitle: { fontSize: 16, color: '#94A3B8', textAlign: 'center', lineHeight: 26, marginBottom: 48, fontWeight: '500' },
  syncBtn: {
    backgroundColor: '#864b03', // Brown
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center'
  },
  syncBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  topHeader: { paddingHorizontal: 20, paddingTop: 40, marginBottom: 16 },
  headerMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { alignItems: 'flex-end', gap: 10 },
  referralBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  referralBadgeText: {
    color: '#864b03',
    fontSize: 13,
    fontWeight: '900',
  },
  activateBtn: {
    backgroundColor: '#FF6F00', // Bright Orange as in screenshot
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 6,
    shadowColor: '#FF6F00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  activateText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  greetingLabel: { color: '#864b03', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  userName: { fontWeight: '900', marginTop: 4 },

  // Ready to Learn Section
  readySection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  readyText: {
    color: '#864b03', // Brown as requested
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22
  },

  // WhatsApp Banner
  whatsappBanner: {
    marginHorizontal: 20,
    backgroundColor: '#075E54', // WhatsApp Teal-ish color
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  whatsappIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  whatsappTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  whatsappSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '600',
  },

  // 3-Column Grid
  grid: { paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  gridRow: { flexDirection: 'row', gap: 10 },
  card: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    minHeight: 100,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
    textAlign: 'left'
  },
  cardSubtitle: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'left',
    color: 'rgba(255, 255, 255, 0.8)'
  },

  sectionHeader: { paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  activityList: { paddingHorizontal: 20, paddingBottom: 60 },
  activityCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingRight: 19, borderRadius: 16, marginBottom: 8, borderWidth: 1 },
  activityLeft: { flexDirection: 'row', alignItems: 'center' },
  subjectCircle: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1 },
  activitySubject: { fontSize: 14, fontWeight: '800' },
  activityMeta: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
  emptyState: { padding: 32, borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontWeight: '800', fontSize: 13 },
  syncBanner: { backgroundColor: '#864b03', paddingVertical: 10, paddingHorizontal: 24, alignItems: 'center' },
  syncBannerText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  userSubtitle: { fontSize: 14, fontWeight: '600', marginTop: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
  modalHeader: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingTop: 10 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  loader: { position: 'absolute', top: '50%', left: '50%', marginLeft: -12, marginTop: -12 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  loadingText: { color: '#FFFFFF', marginTop: 12, fontWeight: '800' },

  // Pending Payment Banner
  pendingPaymentBanner: {
    marginHorizontal: 20,
    backgroundColor: '#EAB308', // Dark Yellow/Gold
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#CA8A04',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  pendingTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', marginBottom: 2 },
  pendingSubtitle: { color: '#FEFCE8', fontSize: 13, fontWeight: '700' },
});
