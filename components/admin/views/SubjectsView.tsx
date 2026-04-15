import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';

export function SubjectsView() {
    const { subjects } = useAppStore();
    const colors = ThemeColors.light;

    return (
        <View style={[styles.container, { backgroundColor: '#FFF8F6' }]}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: '#000000' }]}>Subjects</Text>
                <TouchableOpacity style={styles.addBtn}>
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.addBtnText}>Add New</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                <View style={styles.grid}>
                    {subjects.map((subject) => (
                        <View key={subject.id} style={styles.card}>
                            <View style={styles.iconBox}>
                                <Ionicons name="book" size={24} color="#864b03" />
                            </View>
                            <View style={styles.cardInfo}>
                                <Text style={[styles.title, { color: '#3E2723' }]}>{subject.name}</Text>
                                <Text style={[styles.subtitle, { color: '#64748B' }]}>CODE: {subject.id.toUpperCase()}</Text>
                            </View>
                            <TouchableOpacity style={styles.actionBtn}>
                                <Ionicons name="ellipsis-vertical" size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#FFF8F6' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        paddingVertical: 10,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#000000' },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        gap: 8,
        elevation: 2,
        backgroundColor: '#4E342E' // Deep Coffee
    },
    addBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
    listContent: {
        paddingBottom: 100,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    grid: { gap: 12 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        elevation: 1,
        backgroundColor: '#FFFFFF',
        borderColor: '#D7CCC8'
    },
    iconBox: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 1,
        backgroundColor: '#FFF8F6',
        borderColor: '#D7CCC8'
    },
    cardInfo: { flex: 1 },
    title: { fontSize: 16, fontWeight: '800', marginBottom: 4, color: '#3E2723' },
    subtitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: '#64748B' },
    actionBtn: { padding: 10, borderRadius: 12, backgroundColor: '#EFEBE9' }
});
