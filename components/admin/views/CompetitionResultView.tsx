import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Linking, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors } from '../../../theme/colors';

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

    // Detail modal state
    const [selectedResult, setSelectedResult] = useState<any>(null);
    const [registration, setRegistration] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [showDetail, setShowDetail] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [competitionId])
    );

    const loadData = async () => {
        try {
            setLoading(true);
            const [comp, res] = await Promise.all([
                supabaseDB.getCompetitions().then(comps => comps.find((c: any) => c.id === competitionId)),
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

    const handleRowPress = async (item: any) => {
        setSelectedResult(item);
        setShowDetail(true);
        setRegistration(null);

        // Fetch full registration details using registration_id
        const regId = item.registration_id;
        if (!regId) return;

        try {
            setDetailLoading(true);
            const reg = await supabaseDB.getCompetitionRegistrationById(regId);
            setRegistration(reg);
        } catch (error) {
            console.error('Error loading registration:', error);
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        setShowDetail(false);
        setSelectedResult(null);
        setRegistration(null);
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const totalQuestions = competition?.quiz?.length || 0;

    const renderItem = ({ item, index }: { item: any, index: number }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => handleRowPress(item)}
        >
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
                <Text style={[styles.scoreText, { color: colors.primary }]}>{item.score}{totalQuestions > 0 ? `/${totalQuestions}` : ''}</Text>
                <Text style={[styles.timeText, { color: colors.textSecondary }]}>{formatTime(item.time_taken)}</Text>
            </View>
            <View style={styles.actionBtn}>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </View>
        </TouchableOpacity>
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
                        {results.length} Participant{results.length !== 1 ? 's' : ''}
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

            {/* Participant Detail Modal */}
            <Modal
                visible={showDetail}
                transparent
                animationType="slide"
                onRequestClose={closeDetail}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
                        {/* Modal Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Participant Details</Text>
                            <TouchableOpacity onPress={closeDetail} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={22} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {detailLoading ? (
                            <View style={styles.modalLoading}>
                                <ActivityIndicator size="large" color={colors.primary} />
                            </View>
                        ) : (
                            <View style={styles.modalBody}>
                                {/* Score summary */}
                                <View style={[styles.scoreSummary, { backgroundColor: isDark ? '#FFF8F6' : '#FFF8F6', borderColor: colors.border }]}>
                                    <View style={styles.scoreSummaryItem}>
                                        <Text style={[styles.scoreSummaryValue, { color: colors.primary }]}>
                                            {selectedResult?.score}{totalQuestions > 0 ? `/${totalQuestions}` : ''}
                                        </Text>
                                        <Text style={[styles.scoreSummaryLabel, { color: colors.textSecondary }]}>SCORE</Text>
                                    </View>
                                    <View style={[styles.scoreDivider, { backgroundColor: colors.border }]} />
                                    <View style={styles.scoreSummaryItem}>
                                        <Text style={[styles.scoreSummaryValue, { color: colors.text }]}>
                                            {selectedResult ? formatTime(selectedResult.time_taken) : '--'}
                                        </Text>
                                        <Text style={[styles.scoreSummaryLabel, { color: colors.textSecondary }]}>TIME TAKEN</Text>
                                    </View>
                                    <View style={[styles.scoreDivider, { backgroundColor: colors.border }]} />
                                    <View style={styles.scoreSummaryItem}>
                                        <Text style={[styles.scoreSummaryValue, { color: colors.text }]}>
                                            {selectedResult ? new Date(selectedResult.created_at).toLocaleDateString() : '--'}
                                        </Text>
                                        <Text style={[styles.scoreSummaryLabel, { color: colors.textSecondary }]}>DATE</Text>
                                    </View>
                                </View>

                                {/* Registration details */}
                                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>REGISTRATION INFO</Text>

                                <DetailRow
                                    icon="person-outline"
                                    label="Full Name"
                                    value={registration?.full_name || selectedResult?.registration?.full_name || 'N/A'}
                                    colors={colors}
                                />
                                <DetailRow
                                    icon="mail-outline"
                                    label="Email"
                                    value={registration?.email || 'N/A'}
                                    colors={colors}
                                    onPress={registration?.email ? () => Linking.openURL(`mailto:${registration.email}`) : undefined}
                                />
                                <DetailRow
                                    icon="call-outline"
                                    label="Phone"
                                    value={registration?.phone || 'N/A'}
                                    colors={colors}
                                    onPress={registration?.phone ? () => Linking.openURL(`tel:${registration.phone}`) : undefined}
                                />
                                <DetailRow
                                    icon="trophy-outline"
                                    label="Competition"
                                    value={competition?.title || 'N/A'}
                                    colors={colors}
                                />

                                {/* Action buttons */}
                                <View style={styles.modalActions}>
                                    {registration?.phone && (
                                        <TouchableOpacity
                                            style={[styles.modalActionBtn, { backgroundColor: '#4E342E' }]}
                                            onPress={() => Linking.openURL(`tel:${registration.phone}`)}
                                        >
                                            <Ionicons name="call" size={18} color="#FFFFFF" />
                                            <Text style={styles.modalActionBtnText}>Call</Text>
                                        </TouchableOpacity>
                                    )}
                                    {registration?.email && (
                                        <TouchableOpacity
                                            style={[styles.modalActionBtn, { backgroundColor: '#1e40af' }]}
                                            onPress={() => Linking.openURL(`mailto:${registration.email}`)}
                                        >
                                            <Ionicons name="mail" size={18} color="#FFFFFF" />
                                            <Text style={styles.modalActionBtnText}>Email</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─── Detail Row ───────────────────────────────────────────────────────────────
function DetailRow({ icon, label, value, colors, onPress }: {
    icon: any;
    label: string;
    value: string;
    colors: any;
    onPress?: () => void;
}) {
    const content = (
        <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.detailIconBox, { backgroundColor: isDarkColor(colors.background) ? '#1e293b' : '#FFF8F6' }]}>
                <Ionicons name={icon} size={18} color={colors.primary} />
            </View>
            <View style={styles.detailTextWrap}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={[styles.detailValue, { color: onPress ? colors.primary : colors.text }]} numberOfLines={1}>
                    {value}
                </Text>
            </View>
            {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />}
        </View>
    );

    if (onPress) {
        return <TouchableOpacity activeOpacity={0.7} onPress={onPress}>{content}</TouchableOpacity>;
    }
    return content;
}

const isDarkColor = (bg: string) => bg === '#101920' || bg === '#0f172a' || bg === '#1e293b';

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
    emptyText: { marginTop: 16, fontWeight: '700' },

    // Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
    modalCard: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 32,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
    },
    modalTitle: { fontSize: 18, fontWeight: '900' },
    modalCloseBtn: { padding: 6 },
    modalLoading: { paddingVertical: 60, alignItems: 'center' },
    modalBody: { paddingHorizontal: 20, paddingTop: 20 },

    scoreSummary: {
        flexDirection: 'row',
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        marginBottom: 24,
        alignItems: 'center',
    },
    scoreSummaryItem: { flex: 1, alignItems: 'center' },
    scoreSummaryValue: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
    scoreSummaryLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
    scoreDivider: { width: 1, height: 36, marginHorizontal: 8 },

    sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },

    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        gap: 12,
    },
    detailIconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailTextWrap: { flex: 1 },
    detailLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
    detailValue: { fontSize: 15, fontWeight: '700' },

    modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    modalActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 16,
    },
    modalActionBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
});
