import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppNavigationProp, RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { Screen, Header } from '../components/Layout';
import { Button } from '../components/Button';

export function HistoryDetailScreen() {
    const navigation = useNavigation<AppNavigationProp>();
    const route = useRoute<RouteProp<RootStackParamList, 'HistoryDetail'>>();
    const { resultId } = route.params;
    const { results, theme } = useAppStore();
    const isDark = theme === 'dark';

    const result = results.find(r => r.id === resultId);

    if (!result) {
        return (
            <Screen style={[styles.bg, isDark && { backgroundColor: '#0F172A' }]}>
                <Header title="Result Not Found" onBack={() => navigation.goBack()} />
                <View style={styles.content}>
                    <Text style={[styles.emptyText, isDark && { color: '#94A3B8' }]}>This result could not be found.</Text>
                </View>
            </Screen>
        );
    }

    const scoreInt = Math.round(result.totalScore);
    const isPassed = scoreInt >= 50;
    const scoreColor = isPassed ? '#10B981' : '#EF4444';

    const formatTime = (seconds: number) => {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}m ${sec}s`;
    };

    const stylesDark = {
        bg: { backgroundColor: '#0F172A' },
        cardBg: { backgroundColor: '#1E293B', borderColor: '#334155' },
        textTitle: { color: '#F1F5F9' },
        textSub: { color: '#94A3B8' },
        summaryItem: { backgroundColor: '#1E293B' },
        summaryValue: { color: '#F8FAFC' }
    };

    return (
        <Screen style={[styles.bg, { backgroundColor: '#FFF8F6' }]} scrollable={false}>
            <Header
                title={result.mode === 'PAST_QUESTION'
                    ? `Review: ${result.subjectResults[0]?.name || 'Practice'}`
                    : 'Performance History'}
                onBack={() => navigation.goBack()}
                style={{ backgroundColor: '#FFF8F6', borderBottomColor: '#FFF8F6' }}
                titleStyle={{ color: '#000000' }}
                iconColor="#000000"
            />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.topLabel}>EXAM PERFORMANCE REPORT</Text>

                <View style={[styles.scoreCircle, { borderColor: scoreColor, backgroundColor: scoreColor + '10' }]}>
                    <Text style={[styles.scoreValue, { color: scoreColor }]}>{scoreInt}%</Text>
                    <Text style={[styles.scoreSublabel, { color: '#5D4037' }]}>OVERALL SCORE</Text>
                </View>

                <View style={styles.statsSummary}>
                    <View style={[styles.summaryItem, { backgroundColor: '#EFEBE9', borderColor: '#D7CCC8' }]}>
                        <Text style={[styles.summaryLabel, { color: '#5D4037' }]}>TOTAL QUESTIONS</Text>
                        <Text style={[styles.summaryValue, { color: '#3E2723' }]}>{result.totalQuestions}</Text>
                    </View>
                    <View style={[styles.summaryItem, { backgroundColor: '#EFEBE9', borderColor: '#D7CCC8' }]}>
                        <Text style={[styles.summaryLabel, { color: '#5D4037' }]}>TIME SPENT</Text>
                        <Text style={[styles.summaryValue, { color: '#3E2723' }]}>{formatTime(result.timeSpent)}</Text>
                    </View>
                </View>

                <Text style={styles.breakdownTitle}>SUBJECT BREAKDOWN</Text>
                <View style={styles.breakdownList}>
                    {result.subjectResults.map((sub) => (
                        <View key={sub.subjectId} style={[styles.subCard, { backgroundColor: '#864b03', borderColor: '#864b03' }]}>
                            <View style={styles.subInfo}>
                                <Text style={[styles.subName, { color: '#FFFFFF' }]}>{sub.name}</Text>
                                <Text style={[styles.subDetail, { color: 'rgba(255,255,255,0.8)' }]}>{sub.correctAnswers} Correct • {sub.wrongAnswers} Wrong</Text>
                            </View>
                            <View style={[styles.subScoreBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                <Text style={[styles.subScoreText, { color: '#FFFFFF' }]}>
                                    {Math.round(sub.score)}%
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.buttonGroup}>
                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: '#3E2723' }]}
                        onPress={() => navigation.navigate('Review', { resultId: result.id })}
                    >
                        <Text style={styles.primaryBtnText}>Detailed Review</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.secondaryBtn, { backgroundColor: '#EFEBE9' }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={[styles.secondaryBtnText, { color: '#5D4037' }]}>Back to History</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    bg: { flex: 1 },
    content: { padding: 16, alignItems: 'center', paddingTop: 10 },
    topLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 2, marginBottom: 20, textTransform: 'uppercase' },
    scoreCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    scoreValue: { fontSize: 32, fontWeight: '900' },
    scoreSublabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: -2 },

    statsSummary: { flexDirection: 'row', gap: 10, marginBottom: 20, width: '100%' },
    summaryItem: { flex: 1, padding: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
    summaryLabel: { fontSize: 8, fontWeight: '900', color: '#94A3B8', letterSpacing: 1, marginBottom: 4 },
    summaryValue: { fontSize: 14, fontWeight: '800' },

    breakdownTitle: { fontSize: 10, fontWeight: '900', color: '#64748B', letterSpacing: 1, alignSelf: 'flex-start', marginBottom: 10 },
    breakdownList: { width: '100%', gap: 8, marginBottom: 24 },
    subCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1 },
    subInfo: { flex: 1 },
    subName: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
    subDetail: { fontSize: 10, fontWeight: '700' },
    subScoreBox: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    subScoreText: { fontSize: 13, fontWeight: '900' },

    buttonGroup: { width: '100%', gap: 12, marginBottom: 40 },
    primaryBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    primaryBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
    secondaryBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    secondaryBtnText: { fontWeight: '900', fontSize: 14 },
    emptyText: { color: '#64748B', fontSize: 16, textAlign: 'center', marginTop: 100 }
});
