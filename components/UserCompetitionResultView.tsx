import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as supabaseDB from '../services/supabaseDatabase';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { ThemeColors, COLORS } from '../theme/colors';

interface UserCompetitionResultViewProps {
    competitionId: string;
    onBack: () => void;
}

export function UserCompetitionResultView({ competitionId, onBack }: UserCompetitionResultViewProps) {
    const { theme, userProfile } = useAppStore();
    // Force specific colors for alignment
    const colors = {
        background: '#FFF8F6',
        surface: '#FFF8F6',
        text: '#000000',
        textSecondary: '#5D4037',
        border: '#EFEBE9',
        primary: '#3E2723'
    };
    const isDark = false;

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

            // Sort: High Score first, then Low Time
            const sorted = res.sort((a: any, b: any) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.time_taken - b.time_taken;
            });

            setResults(sorted);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load leaderboard");
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

    const totalQuestions = competition?.quiz?.length || 0;

    const renderItem = ({ item, index }: { item: any, index: number }) => {
        const isMe = userProfile?.id && item.user_id === userProfile.id; // Assuming user_id is in result or registration
        // Note: supabaseDatabase.getCompetitionResults usually joins with registration. 
        // We'll rely on registration name.

        return (
            <View style={[
                styles.row,
                { borderBottomColor: colors.border },
                isMe && { backgroundColor: isDark ? '#1e293b' : '#F0F9FF' }
            ]}>
                <View style={[styles.rankBadge, index < 3 && { backgroundColor: index === 0 ? '#FEF3C7' : index === 1 ? '#EFEBE9' : '#FFEDD5' }]}>
                    {index < 3 ? (
                        <Ionicons name="trophy" size={16} color={index === 0 ? '#D97706' : index === 1 ? '#5D4037' : '#EA580C'} />
                    ) : (
                        <Text style={[styles.rankText, { color: colors.textSecondary }]}>#{index + 1}</Text>
                    )}
                </View>

                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                    <Text style={[styles.nameText, { color: colors.text }, isMe && { color: colors.primary }]}>
                        {item.registration?.full_name || 'Participant'} {isMe && '(You)'}
                    </Text>
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.scoreText, { color: index === 0 ? '#D97706' : colors.primary }]}>{`${item.score}/${totalQuestions}`}</Text>
                    <View style={styles.timeContainer}>
                        <Ionicons name="time-outline" size={10} color={colors.textSecondary} style={{ marginRight: 2 }} />
                        <Text style={[styles.timeText, { color: colors.textSecondary }]}>{formatTime(item.time_taken)}</Text>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: '#FFF8F6' }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }]}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000000" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                        Leaderboard
                    </Text>
                    <Text style={[styles.headerSub, { color: colors.textSecondary }]} numberOfLines={1}>
                        {competition?.title}
                    </Text>
                </View>
            </View>

            {/* List Header */}
            <View style={[styles.listHeader, { backgroundColor: '#FFF8F6', borderBottomColor: '#EFEBE9' }]}>
                <Text style={[styles.th, { width: 50, color: '#8D6E63' }]}>Rank</Text>
                <Text style={[styles.th, { flex: 1, color: colors.textSecondary }]}>Participant</Text>
                <Text style={[styles.th, { width: 80, textAlign: 'right', color: colors.textSecondary }]}>Score / Time</Text>
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
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No results found</Text>
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
    backBtn: { padding: 8, marginLeft: -8 },
    headerTitle: { fontSize: 18, fontWeight: '900' },
    headerSub: { fontSize: 13, fontWeight: '600' },
    listHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
    th: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    list: { paddingBottom: 40 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
    rankBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
    rankText: { fontWeight: '900', fontSize: 13 },
    nameText: { fontSize: 15, fontWeight: '700' },
    metaText: { fontSize: 11, fontWeight: '500', marginTop: 2 },
    scoreText: { fontSize: 16, fontWeight: '900' },
    timeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    timeText: { fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyText: { marginTop: 16, fontWeight: '700' }
});
