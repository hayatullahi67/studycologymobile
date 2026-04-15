import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Layout';
import { useAppStore } from '../store/useAppStore';

import { Ionicons } from '@expo/vector-icons';

interface SubjectCardProps {
    name: string;
    icon: string;
    paperCount: number;
    children?: React.ReactNode;
}

export function SubjectCard({ name, icon, paperCount, children }: SubjectCardProps) {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';

    return (
        <Card style={[styles.container, { backgroundColor: '#864b03', borderColor: '#864b03' }]}>
            <View style={[styles.header, { backgroundColor: '#864b03' }]}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 255, 255, 0.2)', borderColor: 'transparent' }]}>
                    <Ionicons name={icon as any} size={24} color="#FFFFFF" />
                </View>
                <View style={styles.info}>
                    <Text style={[styles.name, { color: '#FFFFFF' }]}>{name}</Text>
                    <Text style={[styles.count, { color: 'rgba(255, 255, 255, 0.7)' }]}>{paperCount} Available Papers</Text>
                </View>
            </View>
            {children}
        </Card>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 0,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderRadius: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 1,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 15,
        fontWeight: '800',
    },
    count: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '700',
        marginTop: 1,
    },
});
