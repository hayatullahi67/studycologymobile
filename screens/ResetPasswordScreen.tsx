import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppNavigationProp, RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Layout';
import { Button } from '../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { verifyRecoveryOtp, updateUserPassword } from '../services/supabaseDatabase';
import { updateLocalUserPassword } from '../services/localDatabase';

const PRIMARY_BROWN = '#864b03';

type ResetPasswordRouteProp = RouteProp<RootStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen() {
    const navigation = useNavigation<AppNavigationProp>();
    const route = useRoute<ResetPasswordRouteProp>();
    const { email } = route.params;

    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleReset = async () => {
        if (!code || !password || !confirmPassword) {
            Alert.alert('Incomplete', 'Please fill in all fields.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Mismatch', 'Passwords do not match.');
            return;
        }

        try {
            setLoading(true);

            // 1. Verify OTP
            await verifyRecoveryOtp(email, code);

            // 2. Update Supabase Password
            await updateUserPassword(password);

            // 3. Update Local DB Password (for offline login)
            await updateLocalUserPassword(email, password);

            Alert.alert('Success', 'Your password has been updated successfully!', [
                { text: 'Login', onPress: () => navigation.navigate('Login') }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to verify code or update password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Screen style={styles.bg}>
            <View style={styles.header}>
                <Ionicons name="arrow-back" size={24} color="#0F172A" onPress={() => navigation.goBack()} />
                <Text style={styles.headerTitle}>Reset Password</Text>
            </View>

            <View style={styles.container}>
                <Text style={styles.title}>Enter verification code</Text>
                <Text style={styles.subtitle}>We've sent a 6-digit code to {email}. Enter it below along with your new password.</Text>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Verification Code</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter code"
                            placeholderTextColor="#94A3B8"
                            value={code}
                            onChangeText={setCode}
                            keyboardType="number-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>New Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Min. 6 characters"
                                placeholderTextColor="#94A3B8"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                <Ionicons name={showPassword ? "eye" : "eye-off"} size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Re-enter password"
                                placeholderTextColor="#94A3B8"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showPassword}
                            />
                        </View>
                    </View>

                    <Button
                        fullWidth
                        onPress={handleReset}
                        style={styles.btn}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#FFFFFF" /> : 'Update Password'}
                    </Button>
                </View>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    bg: { backgroundColor: '#FFFFFF', flex: 1 },
    header: { padding: 24, paddingBottom: 0, flexDirection: 'row', alignItems: 'center', gap: 16 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
    container: { padding: 24 },
    title: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 12, marginTop: 10 },
    subtitle: { fontSize: 15, color: '#64748B', marginBottom: 32, lineHeight: 22 },
    form: { width: '100%' },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
    input: { height: 56, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, fontSize: 18, color: '#0F172A', backgroundColor: '#F8FAFC', letterSpacing: 2, fontWeight: '600' },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, backgroundColor: '#F8FAFC', height: 56, paddingHorizontal: 16 },
    passwordInput: { flex: 1, height: '100%', fontSize: 16, color: '#0F172A' },
    eyeIcon: { padding: 4 },
    btn: { marginTop: 12, backgroundColor: PRIMARY_BROWN }
});
