import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_PAPERS } from '../../../data/mockData';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';

interface QuestionPaperDetailViewProps {
    paperId: string;
    onBack: () => void;
    onEditQuestion?: (questionId: string) => void;
}

export function QuestionPaperDetailView({ paperId, onBack, onEditQuestion }: QuestionPaperDetailViewProps) {
    const { theme } = useAppStore();
    // const isDark = theme === 'dark';
    const colors = ThemeColors.light; // Force light mode for theme consistency
    const paper = MOCK_PAPERS.find(p => p.id === paperId);

    if (!paper) {
        return (
            <View style={[styles.container, { backgroundColor: '#FFF8F6' }]}>
                <TouchableOpacity onPress={onBack} style={styles.backBtnHeader}>
                    <Ionicons name="arrow-back" size={24} color="#000000" />
                    <Text style={[styles.backText, { color: '#000000' }]}>Back</Text>
                </TouchableOpacity>
                <View style={styles.center}>
                    <Text style={{ color: '#64748B' }}>Paper not found</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: '#FFF8F6' }]}>
            <View style={[styles.header, { backgroundColor: '#FFFFFF', borderBottomColor: '#EFEBE9' }]}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000000" />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.headerTitle, { color: '#000000' }]}>{paper.name}</Text>
                    <Text style={[styles.headerSub, { color: '#64748B' }]}>{paper.year} • {paper.subjectId.toUpperCase()}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.statsRow, { borderBottomColor: '#EFEBE9' }]}>
                    <View style={[styles.statChip, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}>
                        <Text style={[styles.statLabel, { color: '#64748B' }]}>Questions</Text>
                        <Text style={[styles.statValue, { color: '#000000' }]}>{paper.questions.length}</Text>
                    </View>
                    <View style={[styles.statChip, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}>
                        <Text style={[styles.statLabel, { color: '#64748B' }]}>Time</Text>
                        <Text style={[styles.statValue, { color: '#000000' }]}>120m</Text>
                    </View>
                    <View style={[styles.statChip, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}>
                        <Text style={[styles.statLabel, { color: '#64748B' }]}>Status</Text>
                        <Text style={[styles.statValue, { color: '#10B981' }]}>Active</Text>
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: '#000000' }]}>All Questions</Text>

                <View style={styles.questionsList}>
                    {paper.questions.map((q: any, index: number) => (
                        <View key={q.id} style={[styles.questionCard, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}>
                            <View style={styles.qHeader}>
                                <View style={[styles.qNumBox, { backgroundColor: '#FFF8F6' }]}>
                                    <Text style={[styles.qNum, { color: '#864b03' }]}>Q{index + 1}</Text>
                                </View>
                                <TouchableOpacity onPress={() => onEditQuestion?.(q.id)} style={[styles.editBtn, { backgroundColor: '#FFF8F6' }]}>
                                    <Ionicons name="pencil" size={14} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.qText, { color: '#3E2723' }]}>{q.text}</Text>

                            <View style={styles.optionsGrid}>
                                {q.options.map((opt: any) => (
                                    <View key={opt.id} style={[
                                        styles.option,
                                        { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' },
                                        opt.id === q.correctOptionId && { backgroundColor: '#ECFDF5', borderColor: '#10B981' }
                                    ]}>
                                        <Text style={[
                                            styles.optionText,
                                            { color: '#64748B' },
                                            opt.id === q.correctOptionId && { color: '#047857', fontWeight: '800' }
                                        ]}>
                                            {opt.id.toUpperCase()}. {opt.text}
                                        </Text>
                                        {opt.id === q.correctOptionId && (
                                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                        )}
                                    </View>
                                ))}
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF8F6' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    backBtnHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 8 },
    backText: { fontSize: 16, fontWeight: '600' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 16,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
        backgroundColor: '#FFFFFF'
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '900' },
    headerSub: { fontSize: 12, fontWeight: '700' },
    content: {
        padding: 20,
        paddingBottom: 40,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    statChip: { flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, elevation: 1 },
    statLabel: { fontSize: 10, marginBottom: 4, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    statValue: { fontSize: 15, fontWeight: '900' },
    sectionTitle: { fontSize: 16, fontWeight: '900', marginBottom: 16 },
    questionsList: { gap: 16 },
    questionCard: { borderRadius: 20, padding: 16, borderWidth: 1, elevation: 1 },
    qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    qNumBox: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    qNum: { fontSize: 11, fontWeight: '900' },
    editBtn: { padding: 6, borderRadius: 8 },
    qText: { fontSize: 15, fontWeight: '700', marginBottom: 20, lineHeight: 22 },
    optionsGrid: { gap: 8 },
    option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1 },
    optionText: { fontSize: 13, fontWeight: '600' }
});
