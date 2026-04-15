import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../navigation/types';
import { Screen } from '../components/Layout';
import { Button } from '../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { resetPasswordForEmail } from '../services/supabaseDatabase';

const PRIMARY_BROWN = '#864b03';

export function ForgotPasswordScreen() {
    const navigation = useNavigation<AppNavigationProp>();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendCode = async () => {
        if (!email) {
            Alert.alert('Email Required', 'Please enter your email address.');
            return;
        }

        try {
            setLoading(true);
            await resetPasswordForEmail(email);
            // On success, navigate to the Reset Password screen with the email
            navigation.navigate('ResetPassword', { email });
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send reset code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Screen style={styles.bg}>
            <View style={styles.header}>
                <Ionicons name="arrow-back" size={24} color="#0F172A" onPress={() => navigation.goBack()} />
                <Text style={styles.headerTitle}>Forgot Password</Text>
            </View>

            <View style={styles.container}>
                <View style={styles.iconBox}>
                    <Ionicons name="mail-open-outline" size={48} color={PRIMARY_BROWN} />
                </View>

                <Text style={styles.title}>Reset your password</Text>
                <Text style={styles.subtitle}>Enter your email address and we'll send you a verification code to reset your password.</Text>

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

                    <Button
                        fullWidth
                        onPress={handleSendCode}
                        style={styles.btn}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#FFFFFF" /> : 'Send Code'}
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
    container: { padding: 24, alignItems: 'center' },
    iconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(134, 75, 3, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24, marginTop: 40 },
    title: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 12, textAlign: 'center' },
    subtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
    form: { width: '100%' },
    inputGroup: { marginBottom: 24 },
    label: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
    input: { height: 56, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, fontSize: 16, color: '#0F172A', backgroundColor: '#F8FAFC' },
    btn: { marginTop: 8, backgroundColor: PRIMARY_BROWN }
});
