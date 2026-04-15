import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../../navigation/types';
import { useAppStore } from '../../store/useAppStore';
import { ThemeColors } from '../../theme/colors';

interface AdminHeaderProps {
    title?: string;
}

export function AdminHeader({ title = 'STUDYCOLOGY Admin' }: AdminHeaderProps) {
    const navigation = useNavigation<AppNavigationProp>();
    const { theme } = useAppStore();
    // const isDark = theme === 'dark';
    const colors = ThemeColors.light; // Force light mode for consistency

    const handleLogout = () => {
        navigation.navigate('Login');
    };

    return (
        <View style={[styles.header, { backgroundColor: '#FFFFFF', borderBottomColor: '#EFEBE9' }]}>
            <View style={styles.left}>
                <Image
                    source={require('../../assets/logo.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                />
                <View style={[styles.badge, { backgroundColor: '#864b03' }]}>
                    <Text style={styles.badgeText}>ADMIN</Text>
                </View>
                <Text style={[styles.title, { color: '#000000' }]}>{title}</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                <Ionicons name="log-out-outline" size={20} color="#64748B" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        height: 60,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logoImage: {
        width: 32,
        height: 32,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
    },
    logoutBtn: {
        padding: 8,
    },
});
