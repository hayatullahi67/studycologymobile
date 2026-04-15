import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { Screen, Header } from '../components/Layout';
import { Ionicons } from '@expo/vector-icons';
import { AdBanner } from '../components/AdBanner';

export function AnalysisScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const { results, subjects, theme } = useAppStore();
  const isDark = theme === 'dark';
  const [showAd, setShowAd] = useState(false);

  useEffect(() => {
    setShowAd(true);
  }, []);

  const totalExams = results.length;
  const averageScore = useMemo(() => {
    if (totalExams === 0) return 0;
    return results.reduce((sum, result) => sum + result.totalScore, 0) / totalExams;
  }, [results, totalExams]);

  const subjectPerformance = useMemo(() => {
    const performanceMap = new Map<string, { scoreSum: number; attempts: number }>();

    results.forEach(result => {
      result.subjectResults.forEach(sr => {
        const existing = performanceMap.get(sr.subjectId) || { scoreSum: 0, attempts: 0 };
        performanceMap.set(sr.subjectId, {
          scoreSum: existing.scoreSum + sr.score,
          attempts: existing.attempts + 1
        });
      });
    });

    return subjects
      .map(subject => {
        const entry = performanceMap.get(subject.id);
        if (!entry) {
          return {
            subjectId: subject.id,
            name: subject.name,
            averageScore: 0,
            totalAttempts: 0,
            strength: 'Not Attempted' as const,
            color: '#94A3B8'
          };
        }

        const avgScore = entry.scoreSum / entry.attempts;
        const totalAttempts = entry.attempts;
        let strength: 'Excellent' | 'Good' | 'Average' | 'Needs Improvement';
        let color: string;

        if (avgScore >= 80) {
          strength = 'Excellent';
          color = '#10B981';
        } else if (avgScore >= 70) {
          strength = 'Good';
          color = '#3B82F6';
        } else if (avgScore >= 60) {
          strength = 'Average';
          color = '#F59E0B';
        } else {
          strength = 'Needs Improvement';
          color = '#EF4444';
        }

        return {
          subjectId: subject.id,
          name: subject.name,
          averageScore: avgScore,
          totalAttempts,
          strength,
          color
        };
      })
      .sort((a, b) => b.averageScore - a.averageScore);
  }, [results, subjects]);

  const performanceTrend = useMemo(() => {
    const recentResults = results.slice(0, 5).reverse();
    if (recentResults.length <= 1) return 'Not enough data';

    const latest = recentResults[recentResults.length - 1].totalScore;
    const first = recentResults[0].totalScore;
    if (latest > first) return 'Improving';
    if (latest < first) return 'Declining';
    return 'Stable';
  }, [results]);

  const attemptedSubjects = useMemo(
    () => subjectPerformance.filter(subject => subject.totalAttempts > 0),
    [subjectPerformance]
  );

  const strongestSubject = attemptedSubjects[0];
  const weakestSubject = attemptedSubjects[attemptedSubjects.length - 1];

  const trendIcon = useMemo(() => {
    switch (performanceTrend) {
      case 'Improving': return 'trending-up';
      case 'Declining': return 'trending-down';
      default: return 'remove';
    }
  }, [performanceTrend]);

  const trendColor = useMemo(() => {
    switch (performanceTrend) {
      case 'Improving': return '#10B981';
      case 'Declining': return '#EF4444';
      default: return '#94A3B8';
    }
  }, [performanceTrend]);

  return (
    <Screen style={[styles.bg, { backgroundColor: '#FFF8F6' }]} scrollable={false}>
      <Header
        title="Performance Analysis"
        onBack={() => navigation.goBack()}
        titleStyle={{ color: '#000000' }}
        iconColor="#000000"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overall Performance Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Overall Performance</Text>

          <View style={styles.overallStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalExams}</Text>
              <Text style={styles.statLabel}>Total Exams</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{averageScore.toFixed(1)}%</Text>
              <Text style={styles.statLabel}>Average Score</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name={trendIcon} size={24} color={trendColor} />
              <Text style={[styles.statLabel, { color: trendColor }]}>{performanceTrend}</Text>
            </View>
          </View>
        </View>

        {/* Subject Strength Analysis */}
        <View style={styles.analysisCard}>
          <Text style={styles.sectionTitle}>Attempted Subjects</Text>
          <Text style={styles.sectionSubtitle}>
            {attemptedSubjects.length > 0
              ? `You have attempted ${attemptedSubjects.length} subject${attemptedSubjects.length !== 1 ? 's' : ''}.`
              : 'You have not attempted any subjects yet.'}
          </Text>

          {attemptedSubjects.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <Text style={styles.emptyStateText}>No attempted subjects to display yet.</Text>
            </View>
          ) : (
            attemptedSubjects.map((subject) => (
              <View key={subject.subjectId} style={styles.subjectRow}>
                <View style={styles.subjectInfo}>
                  <Text style={styles.subjectName}>{subject.name}</Text>
                  <Text style={styles.subjectAttempts}>
                    {subject.totalAttempts} attempt{subject.totalAttempts !== 1 ? 's' : ''}
                  </Text>
                </View>

                <View style={styles.subjectScore}>
                  <Text style={styles.scoreText}>{subject.averageScore.toFixed(1)}%</Text>
                  <View style={[styles.strengthBadge, { backgroundColor: subject.color + '20', borderColor: subject.color }]}>
                    <Text style={[styles.strengthText, { color: subject.color }]}> 
                      {subject.strength}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Performance Insights */}
        <View style={styles.insightsCard}>
          <Text style={styles.sectionTitle}>Performance Insights</Text>

          <View style={styles.insightItem}>
            <Ionicons name="trophy-outline" size={24} color="#10B981" />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Strongest Subject</Text>
              <Text style={styles.insightText}>
                {strongestSubject?.name || 'No data yet'}
              </Text>
            </View>
          </View>

          <View style={styles.insightItem}>
            <Ionicons name="school-outline" size={24} color="#EF4444" />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Area for Improvement</Text>
              <Text style={styles.insightText}>
                {weakestSubject?.name || 'No data yet'}
              </Text>
            </View>
          </View>

          <View style={styles.insightItem}>
            <Ionicons name="time-outline" size={24} color="#3B82F6" />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Study Recommendation</Text>
              <Text style={styles.insightText}>
                Focus on {attemptedSubjects.filter(s => s.averageScore < 70).length} subjects that need improvement
              </Text>
            </View>
          </View>
        </View>

        {/* Ad Banner */}
        {showAd && (
          <View style={{ width: '100%', alignItems: 'center', marginVertical: 20 }}>
            <AdBanner
              placement="analysis_banner"
              size="large"
              style={{ width: '100%' }}
            />
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#3E2723' }]}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Text style={styles.primaryBtnText}>View All Results</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#3E2723' }]}
            onPress={() => navigation.replace('MainTabs')}
          >
            <Text style={[styles.secondaryBtnText, { color: '#3E2723' }]}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  analysisCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  insightsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },

  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },

  overallStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  statItem: {
    alignItems: 'center',
    flex: 1,
  },

  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#3E2723',
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },

  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },

  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  subjectInfo: {
    flex: 1,
  },

  subjectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },

  subjectAttempts: {
    fontSize: 12,
    color: '#64748B',
  },

  subjectScore: {
    alignItems: 'flex-end',
  },

  scoreText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3E2723',
    marginBottom: 4,
  },

  strengthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },

  strengthText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  emptyStateBox: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },

  emptyStateText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },

  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },

  insightContent: {
    flex: 1,
    marginLeft: 12,
  },

  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },

  insightText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },

  buttonGroup: {
    gap: 12,
    marginTop: 20,
  },

  primaryBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  secondaryBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});