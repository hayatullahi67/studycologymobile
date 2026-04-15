import React, { useEffect } from 'react';
import { RootStackParamList, AppNavigationProp } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { signInUser } from '../services/supabaseDatabase';
import { saveUserLocal } from '../services/localDatabase';

const PRIMARY_BROWN = '#864b03';
const BG_LIGHT = '#FFF8F6';

export function SplashScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const { initialize, isInitialized, userProfile, setUserProfile } = useAppStore();
  const hasChecked = React.useRef(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isInitialized || hasChecked.current) return;

    const checkSessionAndNavigate = async () => {
      hasChecked.current = true;
      // Very short delay to show the clean branding
      const minDisplayTime = new Promise(resolve => setTimeout(resolve, 1200));

      let targetRoute: keyof RootStackParamList = 'Welcome';

      if (userProfile) {
        try {
          const netInfo = await NetInfo.fetch();
          if (netInfo.isConnected && userProfile.email && userProfile.password) {
            console.log('[Splash] Verifying session online...');
            try {
              const freshProfile = await signInUser(userProfile.email, userProfile.password);

              // Only update store if we're still on this screen (though replace will handle it)
              setUserProfile(freshProfile);

              await saveUserLocal({
                id: freshProfile.id,
                email: freshProfile.email,
                password: userProfile.password,
                name: freshProfile.name,
                role: freshProfile.role,
                created_at: freshProfile.created_at
              });
              targetRoute = freshProfile.role === 'admin' ? 'AdminDashboard' : 'MainTabs';
            } catch (authError) {
              console.warn('[Splash] Online re-auth failed:', authError);
              targetRoute = 'Welcome';
            }
          } else {
            console.log('[Splash] Offline or incomplete profile - using cache');
            targetRoute = userProfile.role === 'admin' ? 'AdminDashboard' : 'MainTabs';
          }
        } catch (e) {
          console.error('[Splash] Session check error:', e);
          targetRoute = 'Welcome';
        }
      } else {
        console.log('[Splash] No local profile found');
        targetRoute = 'Welcome';
      }

      await minDisplayTime;
      navigation.replace(targetRoute as any);
    };

    checkSessionAndNavigate();
  }, [isInitialized]);

  return (
    <View style={styles.container}>
      <Image
        // source={require('../assets/doodle_pattern.png')}
        style={styles.doodleBG}
        // resizeMode="repeat"
      />
      <View style={styles.content}>
        <View style={styles.branding}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
            tintColor={PRIMARY_BROWN}
          />
          {/* <Text style={styles.brandTitle}>STUDYCOLOGY</Text> */}
          <Text style={styles.brandTitle}>2026</Text>
        </View>

        <View style={styles.footer}>
          <ActivityIndicator size="small" color={PRIMARY_BROWN} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_LIGHT,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  doodleBG: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.05,
  },
  branding: {
    alignItems: 'center',
    marginTop: -50,
  },
  logoImage: {
    width: 200,
    height: 120,
    marginBottom: 0,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: PRIMARY_BROWN,
    marginTop: -10,
    letterSpacing: 2,
  },
  yearText: {
    fontSize: 24,
    fontWeight: '800',
    color: PRIMARY_BROWN,
    marginTop: 5,
    letterSpacing: 4,
    opacity: 0.8,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    alignItems: 'center',
  }
});
