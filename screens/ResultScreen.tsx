import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { Screen, Header } from '../components/Layout';
import { AdBanner } from '../components/AdBanner';

export function ResultScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const { results, clearActiveExam, theme } = useAppStore();
  const isDark = theme === 'dark';
  const lastResult = results[0];

  if (!lastResult) return null;

  const scoreInt = Math.round(lastResult.totalScore);
  const isPassed = scoreInt >= 50;
  const scoreColor = isPassed ? '#10B981' : '#EF4444';

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}m ${sec}s`;
  };

  return (
    <Screen style={[styles.bg, { backgroundColor: '#FFF8F6' }]} scrollable={false}>
      <Header
        title="Performance Report"
        onBack={() => { clearActiveExam(); navigation.replace('MainTabs'); }}
        titleStyle={{ color: '#000000' }}
        iconColor="#000000"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.topLabel, { color: '#000000' }]}>JAMB SCORE ANALYSIS</Text>
        <View style={[styles.scoreCircle, { borderColor: scoreColor, backgroundColor: '#FFFFFF' }]}>
          <Text style={[styles.scoreValue, { color: scoreColor }]}>{scoreInt}%</Text>
          <Text style={[styles.scoreSublabel, { color: '#94A3B8' }]}>OVERALL SCORE</Text>
          <View style={[styles.statusBadge, { backgroundColor: scoreColor + '15' }]}>
            <Text style={[styles.statusBadgeText, { color: scoreColor }]}>{isPassed ? 'SUCCESS' : 'FAILED'}</Text>
          </View>
        </View>

        <View style={styles.statsSummary}>
          <View style={[styles.summaryItem, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }]}>
            <Text style={styles.summaryLabel}>TOTAL QUESTIONS</Text>
            <Text style={[styles.summaryValue, { color: '#3E2723' }]}>{lastResult.totalQuestions}</Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }]}>
            <Text style={styles.summaryLabel}>TIME SPENT</Text>
            <Text style={[styles.summaryValue, { color: '#3E2723' }]}>{formatTime(lastResult.timeSpent)}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.breakdownTitle}>SUBJECT BREAKDOWN</Text>
        </View>

        <View style={styles.breakdownList}>
          {lastResult.subjectResults.map((sub) => (
            <View key={sub.subjectId} style={[styles.subCard, { backgroundColor: '#864b03', borderColor: '#864b03' }]}>
              <View style={styles.subInfo}>
                <Text style={[styles.subName, { color: '#FFFFFF' }]}>{sub.name}</Text>
                <Text style={[styles.subDetail, { color: '#E2E8F0' }]}>{sub.correctAnswers} Correct • {sub.wrongAnswers} Wrong</Text>
              </View>
              <View style={[styles.subScoreBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={[styles.subScoreText, { color: '#FFFFFF' }]}>
                  {Math.round(sub.score)}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Square Result Ad */}
        <View style={{ width: '100%', alignItems: 'center', marginBottom: 24 }}>
          <AdBanner
            placement="result_square"
            size="square"
            style={{ width: '100%' }}
          />
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#3E2723' }]}
            onPress={() => navigation.navigate('Review', { resultId: lastResult.id })}
          >
            <Text style={styles.primaryBtnText}>Review Corrections</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#3E2723' }]}
            onPress={() => navigation.navigate('Analysis')}
          >
            <Text style={[styles.secondaryBtnText, { color: '#3E2723' }]}>View Analysis</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#3E2723' }]}
            onPress={() => { clearActiveExam(); navigation.replace('MainTabs'); }}
          >
            <Text style={[styles.secondaryBtnText, { color: '#3E2723' }]}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  content: { padding: 16, alignItems: 'center', paddingTop: 10 },
  topLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 20, textTransform: 'uppercase' },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  scoreValue: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  scoreSublabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5, marginTop: -2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 6 },
  statusBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },

  statsSummary: { flexDirection: 'row', gap: 10, marginBottom: 20, width: '100%' },
  summaryItem: { flex: 1, padding: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
  summaryLabel: { fontSize: 8, fontWeight: '900', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: '800' },

  sectionHeader: { width: '100%', marginBottom: 10, alignSelf: 'flex-start' },
  breakdownTitle: { fontSize: 10, fontWeight: '900', color: '#64748B', letterSpacing: 1 },
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
  secondaryBtnText: { fontWeight: '900', fontSize: 14 }
});

