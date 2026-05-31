import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';

interface CompetitionManagementViewProps {
    onAdd: () => void;
    onEdit: (id: string) => void;
    onViewLive: (id: string) => void;
    onBack?: () => void;
}

export function CompetitionManagementView({ onAdd, onEdit, onViewLive, onBack }: CompetitionManagementViewProps) {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;

    const [competitions, setCompetitions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadCompetitions();
        }, [])
    );

    const loadCompetitions = async () => {
        try {
            setLoading(true);
            const data = await supabaseDB.getCompetitions();
            setCompetitions(data);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load competitions");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            "Delete Competition",
            "Are you sure you want to delete this competition? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await supabaseDB.deleteCompetition(id);
                            loadCompetitions();
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete");
                        }
                    }
                }
            ]
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatus = (start: string, end: string) => {
        const now = new Date();
        const startTime = new Date(start);
        const endTime = new Date(end);

        if (now < startTime) return { label: 'Scheduled', color: '#64748B' };
        if (now > endTime) return { label: 'Ended', color: '#EF4444' };
        return { label: 'LIVE', color: '#10B981' };
    };

    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

    // ... (loadCompetitions)

    const filteredCompetitions = competitions.filter(c => {
        const now = new Date();
        const end = new Date(c.end_time);

        if (activeTab === 'active') {
            return end >= now; // Future or Live
        } else {
            return end < now; // Ended (History)
        }
    });

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />

            <View style={[styles.header, { backgroundColor: '#FFFFFF', borderBottomColor: '#EFEBE9' }]}>
                {onBack ? (
                    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#4E342E" />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 44 }} />
                )}
                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                    <Text style={[styles.headerTitle, { color: '#000000' }]}>Exam Challenges</Text>
                    <Text style={[styles.headerSub, { color: '#64748B' }]}>Manage live proctored events</Text>
                </View>
                <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: '#4E342E' }]}
                    onPress={onAdd}
                >
                    <Ionicons name="add" size={28} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={[styles.tabContainer, { backgroundColor: '#FFFFFF', borderBottomColor: '#EFEBE9' }]}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'active' && [styles.activeTab, { borderBottomColor: '#864b03' }]]}
                    onPress={() => setActiveTab('active')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'active' ? '#864b03' : '#64748B' }]}>Active & Scheduled</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'history' && [styles.activeTab, { borderBottomColor: '#864b03' }]]}
                    onPress={() => setActiveTab('history')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'history' ? '#864b03' : '#64748B' }]}>Past History</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#4E342E" />
                    </View>
                ) : filteredCompetitions.length > 0 ? (
                    filteredCompetitions.map((item) => {
                        const status = getStatus(item.start_time, item.end_time);
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                onPress={() => activeTab === 'history' ? onViewLive(item.id) : onEdit(item.id)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                                        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                                    </View>
                                    <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                                        {formatDate(item.start_time)}
                                    </Text>
                                </View>

                                <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>

                                <View style={styles.infoRow}>
                                    <View style={styles.infoItem}>
                                        <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                                            {item.subject_ids?.length || 0} Subjects
                                        </Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                                            60 Mins
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.cardFooter}>
                                    <TouchableOpacity
                                        style={[styles.footerBtn, { backgroundColor: colors.primary + '15' }]}
                                        onPress={() => onViewLive(item.id)}
                                    >
                                        <Ionicons name="stats-chart" size={18} color={colors.primary} />
                                        <Text style={[styles.footerBtnText, { color: colors.primary }]}>Results</Text>
                                    </TouchableOpacity>

                                    <View style={styles.rightActions}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: colors.border }]}
                                            onPress={() => onEdit(item.id)}
                                        >
                                            <Ionicons name="pencil" size={18} color={colors.text} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]}
                                            onPress={() => handleDelete(item.id)}
                                        >
                                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                ) : (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name={activeTab === 'history' ? "time-outline" : "trophy-outline"} size={80} color={isDark ? colors.border : '#E2E8F0'} />
                        </View>
                        <Text style={[styles.emptyText, { color: colors.text }]}>No {activeTab} competitions</Text>
                        <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                            {activeTab === 'history' ? "Past competitions will appear here." : "Tap '+' to schedule your first UTME competition."}
                        </Text>
                    </View>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF8F6' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomWidth: 1,
        backgroundColor: '#FFFFFF',
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    headerTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, color: '#000000' },
    headerSub: { fontSize: 13, marginTop: 2, fontWeight: '600', color: '#64748B' },
    addBtn: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 4 },
    backBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    listContent: {
        paddingHorizontal: 16,
        paddingVertical: 20,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    loaderContainer: { marginTop: 80, alignItems: 'center' },
    card: {
        padding: 20,
        borderRadius: 28,
        marginBottom: 16,
        borderWidth: 1,
        elevation: 2,
        backgroundColor: '#FFFFFF',
        borderColor: '#D7CCC8'
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, gap: 6 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
    dateText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    title: { fontSize: 19, fontWeight: '900', marginBottom: 12, color: '#3E2723' },
    infoRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    infoText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EFEBE9', paddingTop: 16 },
    footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#EFEBE9' },
    footerBtnText: { fontSize: 13, fontWeight: '800', color: '#864b03' },
    rightActions: { flexDirection: 'row', gap: 8 },
    actionBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFEBE9' },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyIconContainer: { marginBottom: 24 },
    emptyText: { fontSize: 20, fontWeight: '900', marginBottom: 8, color: '#000000' },
    emptySub: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22, fontWeight: '600', color: '#64748B' },
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#EFEBE9',
        backgroundColor: '#FFFFFF',
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: '#864b03' },
    tabText: { fontSize: 14, fontWeight: '800' }
});
