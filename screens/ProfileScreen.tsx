import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Screen, Header } from '../components/Layout';
import { Button } from '../components/Button';
import { useAppStore } from '../store/useAppStore';
import * as localDB from '../services/localDatabase';

export function ProfileScreen() {
    const navigation = useNavigation();
    const { theme, userProfile, logout } = useAppStore();
    const isDark = theme === 'dark';

    const handleLogout = async () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        await logout();
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Login' as never }],
                        });
                    }
                }
            ]
        );
    };

    const userName = userProfile?.name || 'User';
    const userEmail = userProfile?.email || 'No Email';
    const initial = userName ? userName.charAt(0).toUpperCase() : 'U';

    return (
        <Screen scrollable={true} style={[styles.bg, { backgroundColor: '#FFF8F6' }]}>
            <Header
                title="My Profile"
                onBack={() => navigation.goBack()}
                style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
                titleStyle={{ color: '#000000' }}
                iconColor="#000000"
            />

            <View style={styles.content}>
                <View style={styles.avatarSection}>
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarInitial}>{initial}</Text>
                        </View>
                        <TouchableOpacity style={styles.editAvatarBtn}>
                            <Ionicons name="camera" size={16} color="#3E2723" />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.userName, { color: '#3E2723' }]}>{userName}</Text>
                    <Text style={styles.userEmail}>{userEmail}</Text>
                </View>

                <View style={styles.infoSection}>
                    <Text style={styles.sectionLabel}>PERSONAL INFORMATION</Text>
                    <View style={styles.infoCard}>
                        <InfoRow label="Full Name" value={userName} />
                        <InfoRow label="Email" value={userEmail} />
                        <InfoRow label="Role" value={'STUDENT'} />
                    </View>
                </View>

                <View style={styles.infoSection}>
                    <Text style={styles.sectionLabel}>REFERRAL PROGRAM</Text>
                    <TouchableOpacity
                        style={[styles.infoCard, { backgroundColor: '#FFF', borderColor: '#864b03', borderWidth: 1 }]}
                        onPress={() => (navigation as any).navigate('Referral')}
                    >
                        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                            <Text style={[styles.infoLabel, { color: '#864b03' }]}>Referral Earnings</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={[styles.infoValue, { color: '#864b03' }]}>₦{userProfile?.referral_balance || 0}</Text>
                                <Ionicons name="chevron-forward" size={16} color="#864b03" />
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>
                <View style={styles.infoSection}>
                    <Text style={styles.sectionLabel}>PERFORMANCE ANALYSIS</Text>
                    <TouchableOpacity
                        style={[styles.infoCard, { backgroundColor: '#FFF', borderColor: '#864b03', borderWidth: 1 }]}
                        onPress={() => (navigation as any).navigate('Analysis')}
                    >
                        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="analytics-outline" size={20} color="#864b03" />
                                <Text style={[styles.infoLabel, { color: '#864b03' }]}>View Performance Analysis</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#864b03" />
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.infoSection}>
                    <Text style={styles.sectionLabel}>PROGRESS TRACKER</Text>
                    <TouchableOpacity
                        style={[styles.infoCard, { backgroundColor: '#FFF', borderColor: '#864b03', borderWidth: 1 }]}
                        onPress={() => (navigation as any).navigate('ProgressTracker')}
                    >
                        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="trophy-outline" size={20} color="#864b03" />
                                <Text style={[styles.infoLabel, { color: '#864b03' }]}>View Progress Tracker</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#864b03" />
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Button
                        fullWidth
                        variant="secondary"
                        style={{ borderColor: '#FECACA', borderWidth: 1, height: 48, borderRadius: 14, backgroundColor: '#FFF' }}
                        textStyle={{ color: '#EF4444', fontSize: 14, fontWeight: '800' }}
                        onPress={handleLogout}
                    >
                        Sign Out
                    </Button>
                </View>
            </View>
        </Screen>
    );
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    bg: { flex: 1 },
    content: { padding: 16 },
    avatarSection: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
    avatarWrapper: { position: 'relative', marginBottom: 12 },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 28,
        backgroundColor: '#864b03',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: { fontSize: 32, fontWeight: '900', color: '#FFFFFF' },
    editAvatarBtn: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 28,
        height: 28,
        borderRadius: 10,
        backgroundColor: '#EFEBE9',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFF8F6'
    },
    userName: { fontSize: 18, fontWeight: '900', marginBottom: 2 },
    userEmail: { fontSize: 13, fontWeight: '600', color: '#8D6E63' },
    infoSection: { gap: 12 },
    sectionLabel: { fontSize: 10, fontWeight: '900', color: '#5D4037', letterSpacing: 1, marginLeft: 4, marginBottom: 8 },
    infoCard: {
        backgroundColor: '#864b03',
        borderRadius: 16,
        padding: 12,
        borderWidth: 0,
        borderColor: 'transparent'
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)'
    },
    infoLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
    infoValue: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
    footer: { marginTop: 32, marginBottom: 20 },
    center: { justifyContent: 'center', alignItems: 'center', flex: 1 }
});
