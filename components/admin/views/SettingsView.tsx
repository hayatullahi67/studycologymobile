import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as localDB from '../../../services/localDatabase';
import * as syncService from '../../../services/syncService';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';

export function SettingsView() {
    const { initialize, theme } = useAppStore();
    // const isDark = theme === 'dark';
    const colors = ThemeColors.light; // Force light mode for theme consistency
    const [resetting, setResetting] = useState(false);

    const handleReset = () => {
        Alert.alert(
            "Reset App Data",
            "This will clear all locally synced exams, subjects, and questions. You will need to sync again to use the app offline.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset Everything",
                    style: "destructive",
                    onPress: performReset
                }
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
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to reset app data.");
        } finally {
            setResetting(false);
        }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: '#FFF8F6' }]} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: '#000000' }]}>Admin Settings</Text>
                <Text style={[styles.subtitle, { color: '#64748B' }]}>System configuration and maintenance tools.</Text>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: '#64748B' }]}>MAINTENANCE</Text>
            </View>

            <View style={[styles.section, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}>
                <View style={styles.item}>
                    <View style={styles.itemInfo}>
                        <Text style={[styles.itemTitle, { color: '#3E2723' }]}>Reset App Data</Text>
                        <Text style={[styles.itemDesc, { color: '#64748B' }]}>Wipe local SQLite database and sync flags.</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.resetBtn, resetting && styles.disabledBtn]}
                        onPress={handleReset}
                        disabled={resetting}
                    >
                        {resetting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.resetBtnText}>Reset</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.infoBox, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}>
                <Ionicons name="information-circle-outline" size={20} color="#864b03" />
                <Text style={[styles.infoText, { color: '#64748B' }]}>
                    Clearing data is useful for testing the initial sync flow or clearing corrupted local data. This action is irreversible.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF8F6' },
    content: {
        padding: 24,
        paddingBottom: 40,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    header: { marginBottom: 32 },
    title: { fontSize: 24, fontWeight: '900', marginBottom: 8 },
    subtitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
    sectionHeader: { marginBottom: 12, marginTop: 8 },
    sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
    section: { borderRadius: 24, padding: 8, borderWidth: 1, elevation: 1 },
    item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    itemInfo: { flex: 1, marginRight: 16 },
    itemTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
    itemDesc: { fontSize: 12, fontWeight: '500' },
    resetBtn: { backgroundColor: '#EF4444', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, minWidth: 80, alignItems: 'center' },
    resetBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
    disabledBtn: { opacity: 0.6 },
    infoBox: { flexDirection: 'row', gap: 12, marginTop: 24, padding: 16, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
    infoText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 18 }
});
