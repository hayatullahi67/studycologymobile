import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Header, Card } from '../components/Layout';
import * as localDB from '../services/localDatabase';
import * as syncService from '../services/syncService';
import { useAppStore } from '../store/useAppStore';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../navigation/types';
import { supabase } from '../services/supabaseDatabase';

export function SettingsScreen() {
    const navigation = useNavigation<AppNavigationProp>();
    const { initialize, theme, userProfile, logout } = useAppStore();
    const [resetting, setResetting] = useState(false);
    const isDark = theme === 'dark';

    const handleLogout = () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Log Out",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Call store logout (which clears local DB)
                            await logout();

                            // Optional: Also sign out from Supabase if online
                            await supabase.auth.signOut();
                        } catch (error) {
                            console.error("Logout error:", error);
                        } finally {
                            // Reset navigation to Login screen
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Login' }],
                            });
                        }
                    }
                }
            ]
        );
    };

    const handleReset = () => {
        Alert.alert(
            "Reset App Data",
            "This will clear all locally synced exams, subjects, and questions. You will need to sync again to use the app offline.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Reset Everything", style: "destructive", onPress: performReset }
            ]
        );
    };

    const performReset = async () => {
        setResetting(true);
        try {
            await localDB.clearDatabase();
            await syncService.resetSyncTracker();
            await initialize();
            Alert.alert("Success", "App data has been reset successfully.");
            navigation.navigate('MainTabs');
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to reset app data.");
        } finally {
            setResetting(false);
        }
    };

    const SettingItem = ({ icon, color, title, subtitle, onPress, showArrow = true }: any) => (
        <Card style={styles.item} onPress={onPress}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name={icon} size={22} color="#FFF" />
            </View>
            <View style={styles.itemContent}>
                <Text style={[styles.itemTitle, { color: '#FFF' }]}>{title}</Text>
                {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
            </View>
            {showArrow && <Ionicons name="chevron-forward" size={18} color="#FFF" />}
        </Card>
    );

    return (
        <Screen scrollable={false} style={{ backgroundColor: '#FFF8F6' }}>
            <Header
                title="App Settings"
                onBack={() => navigation.goBack()}
                style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
                titleStyle={{ color: '#000000' }}
                iconColor="#000000"
            />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>ACCOUNT</Text>
                    <SettingItem
                        icon="person-outline"
                        color="#864b03" // Brown
                        title={userProfile ? (userProfile.name || "User Profile") : "Guest User"}
                        subtitle={userProfile ? userProfile.email : "Sign in to sync progress"}
                        onPress={() => navigation.navigate('Profile')}
                    />
                </View>

                {/* Appearance Section Removed as per request (Single Theme Enforced) */}

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>DATA MANAGEMENT</Text>
                    <Card style={styles.dangerCard} onPress={handleReset}>
                        <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                            {resetting ? (
                                <ActivityIndicator size="small" color="#EF4444" />
                            ) : (
                                <Ionicons name="trash-outline" size={22} color="#EF4444" />
                            )}
                        </View>
                        <View style={styles.itemContent}>
                            <Text style={styles.dangerTitle}>Reset Local Data</Text>
                            <Text style={[styles.itemSubtitle, { color: '#7F1D1D' }]}>Wipe local exams and synced content</Text>
                        </View>
                    </Card>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>SUPPORT</Text>
                    <SettingItem
                        icon="information-circle-outline"
                        color="#864b03" // Brown
                        title="About STUDYCOLOGY"
                        subtitle="Version 0.0.10"
                        onPress={() => navigation.navigate('About')}
                    />
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: '#A1887F' }]}>STUDYCOLOGY v0.0.10 • Built for Success</Text>
                </View>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16, paddingBottom: 60 },
    section: { marginBottom: 20 },
    sectionLabel: { fontSize: 10, fontWeight: '900', color: '#5D4037', letterSpacing: 1, marginLeft: 8, marginBottom: 10 },
    item: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 8, backgroundColor: '#864b03' },
    dangerCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 8, borderWidth: 1, backgroundColor: '#FFF0F0', borderColor: '#FECACA' },
    iconContainer: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    itemContent: { flex: 1 },
    itemTitle: { fontSize: 14, fontWeight: '900' },
    dangerTitle: { fontSize: 14, fontWeight: '900', color: '#EF4444' },
    itemSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginTop: 1 },
    logoutBtn: { height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 10, backgroundColor: '#FFF', borderColor: '#FECACA' },
    logoutText: { fontSize: 15, fontWeight: '900', color: '#EF4444' },
    footer: { marginTop: 30, alignItems: 'center' },
    footerText: { fontSize: 11, fontWeight: '700' }
});
