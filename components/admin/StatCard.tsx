import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { ThemeColors } from '../../theme/colors';

interface StatCardProps {
    label: string;
    count: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bgColor: string;
}

export function StatCard({ label, count, icon, color, bgColor }: StatCardProps) {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <View>
                <Text style={[styles.count, { color: colors.text }]}>{count}</Text>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minWidth: '45%',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    count: {
        fontSize: 20,
        fontWeight: '900',
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
    },
});
