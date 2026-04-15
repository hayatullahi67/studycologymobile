import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Screen, Header } from '../components/Layout';
import { useAppStore } from '../store/useAppStore';

export function AboutScreen() {
    const navigation = useNavigation();
    const { theme } = useAppStore();

    return (
        <Screen style={[styles.bg, { backgroundColor: '#FFF8F6' }]}>
            <Header
                title="About STUDYCOLOGY"
                onBack={() => navigation.goBack()}
                style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
                titleStyle={{ color: '#000000' }}
                iconColor="#000000"
            />

            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.hero}>
                    <View style={styles.logoBox}>
                        <Image
                            source={require('../assets/logo.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={styles.appName}>STUDYCOLOGY</Text>
                    <Text style={styles.version}>Version 1.0.0 (Stable)</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.missionTitle}>Our Mission</Text>
                    <Text style={styles.missionText}>
                        We believe every student deserves access to high-quality preparation tools, regardless of internet connectivity. STUDYCOLOGY is built to bridge the gap and help you achieve your academic dreams.
                    </Text>
                </View>

                <View style={styles.statsRow}>
                    <StatBox label="SYNCED QUESTIONS" value="25,000+" />
                    <StatBox label="OFFLINE PAPERS" value="400+" />
                </View>

                <View style={styles.credits}>
                    <Text style={styles.creditsText}>© 2026 STUDYCOLOGY. All rights reserved.</Text>
                    <Text style={styles.creditsSub}>Made with ❤️ for the next generation</Text>
                </View>
            </ScrollView>
        </Screen>
    );
}

const StatBox = ({ label, value }: any) => (
    <View style={styles.statBox}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    bg: { flex: 1 },
    container: { padding: 16, alignItems: 'center' },
    hero: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
    logoBox: {
        width: 100,
        height: 100,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8
    },
    logoImage: { width: '100%', height: '100%' },
    appName: { fontSize: 24, fontWeight: '900', color: '#3E2723', marginBottom: 2 },
    version: { fontSize: 13, fontWeight: '700', color: '#8D6E63' },
    section: { marginBottom: 24, width: '100%', backgroundColor: '#864b03', padding: 16, borderRadius: 16, borderWidth: 0 },
    missionTitle: { fontSize: 16, fontWeight: '900', marginBottom: 8, color: '#FFFFFF' },
    missionText: { fontSize: 13, lineHeight: 20, fontWeight: '500', color: 'rgba(255,255,255,0.9)' },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 32, width: '100%' },
    statBox: { flex: 1, backgroundColor: '#EFEBE9', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#D7CCC8' },
    statLabel: { fontSize: 8, fontWeight: '900', color: '#5D4037', letterSpacing: 0.5, marginBottom: 6 },
    statValue: { fontSize: 16, fontWeight: '900', color: '#3E2723' },
    credits: { alignItems: 'center', marginBottom: 30 },
    creditsText: { fontSize: 11, fontWeight: '700', color: '#8D6E63', marginBottom: 2 },
    creditsSub: { fontSize: 10, fontWeight: '600', color: '#A1887F' }
});
