import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { ThemeColors } from '../../theme/colors';

interface AdminSidebarProps {
    activeItem?: string;
    onNavigate: (item: string) => void;
}

const MENU_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { id: 'library', label: 'Question Bank', icon: 'library' },
    { id: 'upload_pq', label: 'Upload PDFs', icon: 'cloud-upload' },
    { id: 'manual_entry', label: 'Manual Add', icon: 'create' },
    { id: 'jamb_text', label: 'JAMB Texts', icon: 'book' },
    { id: 'ads', label: 'Manage Ads', icon: 'megaphone' },
    { id: 'activity', label: 'Activity Log', icon: 'pulse' },
    { id: 'notes', label: 'Study Notes', icon: 'create' },
    { id: 'career_inst', label: 'Career & Inst', icon: 'school' },
    { id: 'competitions', label: 'Competitions', icon: 'trophy' },
    { id: 'referrals', label: 'Referrals', icon: 'people' },
];

export function AdminSidebar({ activeItem = 'dashboard', onNavigate }: AdminSidebarProps) {
    const { theme } = useAppStore();
    // const isDark = theme === 'dark';
    const colors = ThemeColors.light; // Force light mode for consistency

    return (
        <View style={[styles.container, { backgroundColor: '#FFFFFF', borderBottomColor: '#EFEBE9' }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                {MENU_ITEMS.map((item) => {
                    const isActive = activeItem === item.id;
                    return (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.item,
                                { backgroundColor: '#FFF8F6' },
                                isActive && { backgroundColor: '#864b03' }
                            ]}
                            onPress={() => onNavigate(item.id)}
                        >
                            <Ionicons
                                name={item.icon as any}
                                size={20}
                                color={isActive ? '#FFFFFF' : '#64748B'}
                            />
                            <Text style={[
                                styles.text,
                                { color: '#64748B' },
                                isActive && { color: '#FFFFFF' }
                            ]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    )
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderBottomWidth: 1,
    },
    scroll: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 8,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    text: {
        fontSize: 13,
        fontWeight: '700',
    },
});
