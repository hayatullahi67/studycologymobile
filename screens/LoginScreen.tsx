import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../navigation/types';
import { Screen } from '../components/Layout';
import { Button } from '../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { signInUser } from '../services/supabaseDatabase';
import { saveUserLocal, getLocalUser } from '../services/localDatabase';
import NetInfo from '@react-native-community/netinfo';
import { useAppStore } from '../store/useAppStore';

export function LoginScreen() {
    const navigation = useNavigation<AppNavigationProp>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [loginRole, setLoginRole] = useState<'user' | 'admin'>('user');

    const handleForgotPassword = () => {
        navigation.navigate('ForgotPassword');
    };
    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        try {
            setLoading(true);
            const netInfo = await NetInfo.fetch();

            if (netInfo.isConnected) {
                // ONLINE LOGIN
                const resolvedProfile = await signInUser(email, password);
                const { setUserProfile } = useAppStore.getState();

                // Cache user for future offline login
                await saveUserLocal({
                    id: resolvedProfile.id,
                    email: email,
                    password: password,
                    name: resolvedProfile.name,
                    role: resolvedProfile.role,
                    assigned_view: resolvedProfile.assigned_view || null,
                    is_paid: resolvedProfile.is_paid ? 1 : 0,
                    expiry_date: resolvedProfile.expiry_date,
                    created_at: resolvedProfile.created_at,
                    active_premium_device_id: resolvedProfile.active_premium_device_id,
                    active_premium_device_name: resolvedProfile.active_premium_device_name,
                    current_device_id: resolvedProfile.current_device_id,
                    current_device_name: resolvedProfile.current_device_name,
                    current_device_has_premium: resolvedProfile.current_device_has_premium ? 1 : 0,
                    premium_revoked_permanently: resolvedProfile.premium_revoked_permanently ? 1 : 0,
                    device_access_state: resolvedProfile.device_access_state,
                    premium_checked_at: resolvedProfile.premium_checked_at,
                    premium_offline_valid_until: resolvedProfile.premium_offline_valid_until,
                });

                setUserProfile({ ...resolvedProfile, password });
                navigateByRole(resolvedProfile.role);
            } else {
                // OFFLINE LOGIN
                const localUser = await getLocalUser(email, password);

                if (localUser) {
                    // Restore user into in-memory store so paid status and profile are available offline
                    const { setUserProfile } = useAppStore.getState();
                    setUserProfile(localUser);
                    navigateByRole((localUser as any).role);
                } else {
                    Alert.alert(
                        'Offline Login Failed',
                        'We couldn\'t find your credentials locally. Please connect to the internet to sign in for the first time.'
                    );
                }
            }
        } catch (error: any) {
            Alert.alert('Login Error', error.message || 'Invalid credentials or connection issue.');
        } finally {
            setLoading(false);
        }
    };

    const navigateByRole = (role: 'user' | 'admin') => {
        if (role === 'admin') {
            navigation.navigate('AdminDashboard');
        } else {
            navigation.navigate('MainTabs');
        }
    };

    return (
        <Screen style={styles.bg} scrollable={true} contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconBox}>
                    <Image
                        source={require('../assets/doodle_pattern.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                </View>
                <Text style={styles.title}>Welcome back</Text>
                <Text style={styles.subtitle}>Please enter your details to sign in.</Text>
            </View>

            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="alex@studycology.com"
                        placeholderTextColor="#94A3B8"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={styles.passwordInput}
                            placeholder="••••••••"
                            placeholderTextColor="#94A3B8"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                            <Ionicons name={showPassword ? "eye" : "eye-off"} size={22} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
                    <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>

                <Button
                    fullWidth
                    onPress={handleLogin}
                    style={styles.loginBtn}
                    disabled={loading}
                    textStyle={{ color: '#FFFFFF' }}
                >
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : 'Sign In'}
                </Button>
            </View>

            {/* <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                <View style={styles.line} />
            </View>

            <View style={styles.socialRow}>
                <TouchableOpacity style={styles.socialBtn}>
                    <Text style={styles.socialText}>G Handle</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn}>
                    <Text style={styles.socialText}>🍎 Apple</Text>
                </TouchableOpacity>
            </View> */}

            <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                    <Text style={styles.linkText}>Sign Up</Text>
                </TouchableOpacity>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    bg: { backgroundColor: '#FFFFFF' },
    container: { padding: 24, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: 40 },
    iconBox: { width: 160, height: 150, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    logoImage: { width: '100%', height: '100%' },
    iconEmoji: { fontSize: 32 },
    title: { fontSize: 28, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
    subtitle: { fontSize: 15, color: '#64748B', textAlign: 'center' },
    form: { marginBottom: 32 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
    input: { height: 56, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, fontSize: 15, color: '#0F172A', backgroundColor: '#F8FAFC' },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, backgroundColor: '#F8FAFC', height: 56, paddingHorizontal: 16 },
    passwordInput: { flex: 1, height: '100%', fontSize: 15, color: '#0F172A' },
    eyeIcon: { padding: 4 },
    forgotBtn: { alignSelf: 'flex-end', marginBottom: 32 },
    forgotText: { fontSize: 13, fontWeight: '700', color: '#0284c7' }, // Blue
    loginBtn: { marginBottom: 0, backgroundColor: '#864b03' }, // Brown
    divider: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
    line: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
    dividerText: { fontSize: 11, fontWeight: '900', color: '#94A3B8', letterSpacing: 1 },
    socialRow: { flexDirection: 'row', gap: 16, marginBottom: 40 },
    socialBtn: { flex: 1, height: 56, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
    socialText: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    footerText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
    linkText: { fontSize: 14, color: '#0284c7', fontWeight: '800' } // Blue
});
