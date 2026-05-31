import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../navigation/types';
import { Screen, Header } from '../components/Layout';
import { Button } from '../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { signUpUser } from '../services/supabaseDatabase';
import { saveUserLocal } from '../services/localDatabase';
import NetInfo from '@react-native-community/netinfo';
import { useAppStore } from '../store/useAppStore';

export function SignUpScreen() {
    const navigation = useNavigation<AppNavigationProp>();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [referralEmail, setReferralEmail] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [agreed, setAgreed] = useState(false);

    const [loading, setLoading] = useState(false);

    const handleSignUp = async () => {
        if (!name || !email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        try {
            setLoading(true);
            const netInfo = await NetInfo.fetch();
            if (!netInfo.isConnected) {
                Alert.alert('Internet Required', 'You must be online to create an account.');
                return;
            }

            // 1. Sign Up Online
            const profile = await signUpUser(email, password, name, referralEmail);

            // 2. Save Credentials Locally for offline login
            await saveUserLocal({
                id: profile.id,
                email: email,
                password: password,
                name: name,
                role: profile.role,
                assigned_view: profile.assigned_view || null,
                is_paid: 0,
                created_at: profile.created_at
            });

            const { setUserProfile } = useAppStore.getState();
            setUserProfile({ ...profile, password });

            Alert.alert('Success', 'Account created successfully!');
            navigation.navigate('MainTabs');
        } catch (error: any) {
            Alert.alert('Signup Error', error.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Screen style={styles.bg} scrollable={true} contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconBox}>
                    <Image
                        source={require('../assets/logo.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    // tintColor="#864b03"
                    />
                </View>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Start your learning journey today.</Text>
            </View>

            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="John Doe"
                        placeholderTextColor="#94A3B8"
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="alex@example.com"
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
                            placeholder="Create a password"
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

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Referral Email (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="referrer@example.com"
                        placeholderTextColor="#94A3B8"
                        value={referralEmail}
                        onChangeText={setReferralEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <Text style={styles.helperText}>Must be the email of an already registered user</Text>
                </View>

                {/* <TouchableOpacity style={styles.checkboxRow} onPress={() => setAgreed(!agreed)}>
                    <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                        {agreed && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                    </View>
                    <Text style={styles.checkboxLabel}>
                        I agree to the <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>.
                    </Text>
                </TouchableOpacity> */}

                <Button
                    fullWidth
                    onPress={handleSignUp}
                    style={styles.signupBtn}
                    disabled={loading}
                    textStyle={{ color: '#FFFFFF' }}
                >
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : 'Create Account'}
                </Button>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.linkText}>Sign In</Text>
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
    title: { fontSize: 28, fontWeight: '900', color: '#000000', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#000000', fontWeight: '500' },
    form: { marginBottom: 32 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
    input: { height: 56, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, fontSize: 15, color: '#0F172A', backgroundColor: '#F8FAFC' },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, backgroundColor: '#F8FAFC', height: 56, paddingHorizontal: 16 },
    passwordInput: { flex: 1, height: '100%', fontSize: 15, color: '#0F172A' },
    eyeIcon: { padding: 4 },
    checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 32, gap: 12 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#94A3B8', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    checkboxChecked: { backgroundColor: '#864b03', borderColor: '#864b03' }, // Brown
    checkmark: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
    checkboxLabel: { flex: 1, fontSize: 14, color: '#64748B', lineHeight: 22 },
    helperText: { fontSize: 12, color: '#64748B', marginTop: 8 },
    signupBtn: { marginBottom: 0, backgroundColor: '#864b03' }, // Brown
    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    footerText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
    linkText: { fontSize: 14, color: '#0284c7', fontWeight: '800' } // Blue
});
