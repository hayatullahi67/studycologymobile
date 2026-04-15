import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';

interface CompetitionResultViewProps {
    competitionId: string;
    onBack: () => void;
}

export function CompetitionResultView({ competitionId, onBack }: CompetitionResultViewProps) {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;

    const [results, setResults] = useState<any[]>([]);
    const [competition, setCompetition] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [competitionId])
    );

    const loadData = async () => {
        try {
            setLoading(true);
            const [comp, res] = await Promise.all([
                supabaseDB.getCompetitions().then(comps => comps.find(c => c.id === competitionId)),
                supabaseDB.getCompetitionResults(competitionId)
            ]);
            setCompetition(comp);
            setResults(res);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load results");
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const renderItem = ({ item, index }: { item: any, index: number }) => (
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={[styles.rankBadge, index < 3 && { backgroundColor: index === 0 ? '#FEF3C7' : index === 1 ? '#F1F5F9' : '#FFEDD5' }]}>
                <Text style={[styles.rankText, { color: index < 3 ? (index === 0 ? '#D97706' : index === 1 ? '#475569' : '#EA580C') : colors.textSecondary }]}>
                    #{index + 1}
                </Text>
            </View>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
                <Text style={[styles.nameText, { color: colors.text }]}>{item.registration?.full_name || 'Unknown'}</Text>
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
            <View style={{ alignItems: 'flex-end', width: 80 }}>
                <Text style={[styles.scoreText, { color: colors.primary }]}>{item.score}</Text>
                <Text style={[styles.timeText, { color: colors.textSecondary }]}>{formatTime(item.time_taken)}</Text>
            </View>
            <TouchableOpacity
                style={[styles.actionBtn]}
                onPress={() => item.registration?.phone && Linking.openURL(`tel:${item.registration.phone}`)}
            >
                <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                        {competition?.title} Results
                    </Text>
                    <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                        {results.length} Participants
                    </Text>
                </View>
            </View>

            {/* List Header */}
            <View style={[styles.listHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <Text style={[styles.th, { width: 50, color: colors.textSecondary }]}>Rank</Text>
                <Text style={[styles.th, { flex: 1, color: colors.textSecondary }]}>Student</Text>
                <Text style={[styles.th, { width: 80, textAlign: 'right', color: colors.textSecondary }]}>Score</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="stats-chart-outline" size={64} color={colors.border} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No results yet</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, elevation: 2 },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '900' },
    headerSub: { fontSize: 13, fontWeight: '600' },
    listHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
    th: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    list: { paddingBottom: 40 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
    rankBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
    rankText: { fontWeight: '900', fontSize: 14 },
    nameText: { fontSize: 15, fontWeight: '700' },
    metaText: { fontSize: 12, fontWeight: '500', marginTop: 2 },
    scoreText: { fontSize: 16, fontWeight: '900' },
    timeText: { fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
    actionBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyText: { marginTop: 16, fontWeight: '700' }
});
