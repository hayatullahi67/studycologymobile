import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Screen, Header } from '../components/Layout';
import { useAppStore } from '../store/useAppStore';

export function AppearanceScreen() {
    const navigation = useNavigation();
    const { theme, fontSize, updateSetting } = useAppStore();

    const ThemeOption = ({ id, label, icon, color }: any) => (
        <TouchableOpacity
            style={[
                styles.option,
                theme === id && styles.optionSelected,
            ]}
            onPress={() => updateSetting('theme', id)}
        >
            <View style={[styles.optionIcon, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={[
                styles.optionLabel,
                theme === id && styles.optionLabelSelected,
                { color: '#CBD5E1' }
            ]}>{label}</Text>
            {theme === id && <Ionicons name="checkmark-circle" size={20} color="#ff8c00" />}
        </TouchableOpacity>
    );

    return (
        <Screen style={[styles.bg, { backgroundColor: '#101920' }]}>
            <Header title="Appearance" onBack={() => navigation.goBack()} />

            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>THEME PREFERENCE</Text>
                <View style={styles.grid}>
                    <ThemeOption id="light" label="Light Mode" icon="sunny" color="#F59E0B" />
                    <ThemeOption id="dark" label="Dark Mode" icon="moon" color="#4F46E5" />
                    <ThemeOption id="system" label="System Default" icon="settings" color="#64748B" />
                </View>

                <Text style={styles.sectionTitle}>TEXT SIZE</Text>
                <View style={styles.fontSizeCard}>
                    {['Small', 'Medium', 'Large', 'Extra Large'].map((size, idx, arr) => (
                        <TouchableOpacity
                            key={size}
                            style={[styles.fontRow, idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' }]}
                            onPress={() => updateSetting('fontSize', size.toLowerCase())}
                        >
                            <Text style={[
                                styles.fontLabel,
                                fontSize === size.toLowerCase() && styles.fontLabelSelected,
                            ]}>{size}</Text>
                            <View style={[
                                styles.radio,
                                fontSize === size.toLowerCase() && styles.radioSelected,
                                { borderColor: 'rgba(255,255,255,0.1)' }
                            ]}>
                                {fontSize === size.toLowerCase() && <View style={styles.radioInner} />}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.previewBox}>
                    <Text style={styles.previewTitle}>Live Preview</Text>
                    <Text style={[
                        styles.previewText,
                        fontSize === 'small' && { fontSize: 13 },
                        fontSize === 'medium' && { fontSize: 16 },
                        fontSize === 'large' && { fontSize: 19 },
                        fontSize === 'extra large' && { fontSize: 22 },
                    ]}>
                        This is how your questions will look. Preparation is the key to success.
                    </Text>
                </View>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    bg: { flex: 1 },
    container: { padding: 16 },
    sectionTitle: { fontSize: 10, fontWeight: '900', color: '#475569', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
    grid: { gap: 8, marginBottom: 24 },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderColor: 'rgba(255,255,255,0.05)'
    },
    optionSelected: { borderColor: '#ff8c00', backgroundColor: '#ff8c0008' },
    optionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    optionLabel: { flex: 1, fontSize: 14, fontWeight: '800' },
    optionLabelSelected: { color: '#ff8c00' },
    fontSizeCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    fontRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
    fontLabel: { fontSize: 14, fontWeight: '700', color: '#64748B' },
    fontLabelSelected: { color: '#F1F5F9', fontWeight: '800' },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    radioSelected: { borderColor: '#ff8c00' },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff8c00' },
    previewBox: { backgroundColor: 'rgba(255,140,0,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,140,0,0.2)' },
    previewTitle: { fontSize: 9, fontWeight: '900', color: '#ff8c00', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    previewText: { fontSize: 15, fontWeight: '600', color: '#CBD5E1', lineHeight: 22 }
});
