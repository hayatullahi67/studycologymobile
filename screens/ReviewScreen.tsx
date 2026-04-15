import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppNavigationProp, RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { Screen, Header } from '../components/Layout';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ThemeColors } from '../theme/colors';
import * as localDB from '../services/localDatabase';

export function ReviewScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'Review'>>();
  const { resultId, questions: initialQuestions } = route.params;

  const { results, activeQuestions: storeQuestions, theme } = useAppStore();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(!initialQuestions);
  const [questions, setQuestions] = useState<any[]>(initialQuestions || []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTabSubId, setActiveTabSubId] = useState<string | null>(null);
  const { width: windowWidth } = useWindowDimensions();
  const { fontSize } = useAppStore();
  const bodySize = fontSize === 'small' ? 14 : fontSize === 'medium' ? 16 : fontSize === 'large' ? 19 : 22;

  const result = useMemo(() => results.find(r => r.id === resultId), [results, resultId]);

  useEffect(() => {
    async function loadQuestions() {
      if (initialQuestions) return;

      // If result is fresh (just finished), questions might be in store
      if (storeQuestions.length > 0 && resultId === results[0]?.id) {
        setQuestions(storeQuestions);
        setLoading(false);
        return;
      }

      // Fetch from DB
      if (result) {
        const qIds = Object.keys(result.userAnswers);
        try {
          const fetched = await localDB.getQuestionsByIds(qIds);
          setQuestions(fetched);
        } catch (e) {
          console.error('Failed to fetch review questions', e);
        }
      }
      setLoading(false);
    }
    loadQuestions();
  }, [resultId, initialQuestions, result, storeQuestions, results]);

  const subjects = useMemo(() => {
    if (!result) return [];
    return result.subjectResults;
  }, [result]);

  useEffect(() => {
    if (subjects.length > 0 && !activeTabSubId) {
      setActiveTabSubId(subjects[0].subjectId);
    }
  }, [subjects, activeTabSubId]);

  const filteredQuestions = useMemo(() => {
    if (!activeTabSubId) return questions;
    return questions.filter(q => q.subject_id === activeTabSubId);
  }, [questions, activeTabSubId]);

  const currentQ = filteredQuestions[activeIndex];
  const userAnswer = currentQ ? result?.userAnswers[currentQ.id] : null;
  const isCorrect = currentQ && userAnswer === currentQ.correct_answer;

  if (loading) {
    return (
      <Screen style={[styles.bg, isDark && { backgroundColor: '#0b141a' }]}>
        <View style={styles.center}><ActivityIndicator color={COLORS.primary[600]} /></View>
      </Screen>
    );
  }

  if (!result || questions.length === 0) {
    return (
      <Screen style={[styles.bg, isDark && { backgroundColor: '#0b141a' }]}>
        <Header title="Review Mode" onBack={() => navigation.goBack()} />
        <View style={styles.center}><Text style={{ color: '#94A3B8' }}>No questions found for review.</Text></View>
      </Screen>
    );
  }

  return (
    <Screen style={[styles.bg, { backgroundColor: '#FFF8F6' }]} scrollable={false}>
      <Header
        title="Correction & Review"
        onBack={() => navigation.goBack()}
        titleStyle={{ color: '#000000' }}
        iconColor="#000000"
        style={{ backgroundColor: '#FFF8F6' }}
      />

      {/* Subject Tabs */}
      <View style={[styles.subjectTabs, { borderBottomColor: 'rgba(134, 75, 3, 0.1)' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {subjects.map((sub) => {
            const isActive = activeTabSubId === sub.subjectId;
            return (
              <TouchableOpacity
                key={sub.subjectId}
                onPress={() => {
                  setActiveTabSubId(sub.subjectId);
                  setActiveIndex(0);
                }}
                style={[
                  styles.tab,
                  isActive && { borderBottomColor: '#3E2723', borderBottomWidth: 3 }
                ]}
              >
                <Text style={[
                  styles.tabText,
                  { color: isActive ? '#3E2723' : '#864b03' }
                ]}>
                  {sub.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Pagination Numbers */}
      <View style={styles.paginationBox}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paginationScroll}>
          {filteredQuestions.map((q, i) => {
            const qUserAns = result.userAnswers[q.id];
            const qIsCorrect = qUserAns === q.correct_answer;
            const isActive = i === activeIndex;

            return (
              <TouchableOpacity
                key={q.id}
                onPress={() => setActiveIndex(i)}
                style={[
                  styles.pageBtn,
                  isActive && { borderColor: '#3E2723', borderWidth: 2 },
                  !isActive && { backgroundColor: qIsCorrect ? '#DCFCE7' : '#FEE2E2', borderColor: 'transparent' }
                ]}
              >
                <Text style={[
                  styles.pageBtnText,
                  { color: isActive ? '#3E2723' : (qIsCorrect ? '#166534' : '#991B1B') }
                ]}>
                  {i + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {currentQ && (
          <>
            <View style={styles.qHeader}>
              <Text style={styles.qNumber}>QUESTION {activeIndex + 1}</Text>
              <View style={[styles.statusBadge, { backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                <Text style={[styles.statusBadgeText, { color: isCorrect ? '#10B981' : '#EF4444' }]}>
                  {isCorrect ? 'CORRECT' : 'WRONG'}
                </Text>
              </View>
            </View>

            <RenderHtml
              contentWidth={windowWidth - 32}
              source={{ html: currentQ.question }}
              tagsStyles={{
                body: {
                  fontSize: bodySize,
                  color: isDark ? '#1E293B' : '#1E293B', // Forced text color
                  textAlign: 'left', // Forced alignment,
                  minHeight: '100px'
                },
                p: { textAlign: 'left', marginBottom: 10 }
              }}
            />

            <View style={styles.optionsList}>
              {['a', 'b', 'c', 'd'].map((opt) => {
                const optText = currentQ[`option_${opt}`];
                if (!optText) return null;

                const isUserChoice = userAnswer === opt;
                const isCorrectChoice = currentQ.correct_answer === opt;

                let borderColor = '#864b03';
                let bgColor = '#864b03';
                if (isCorrectChoice) {
                  borderColor = '#166534';
                  bgColor = '#DCFCE7';
                } else if (isUserChoice && !isCorrectChoice) {
                  borderColor = '#991B1B';
                  bgColor = '#FEE2E2';
                }

                return (
                  <View key={opt} style={[styles.optionItem, { borderColor, backgroundColor: bgColor }]}>
                    <View style={[styles.optionLetterBox, { backgroundColor: isCorrectChoice ? '#166534' : (isUserChoice ? '#991B1B' : '#FFFFFF') }]}>
                      <Text style={[styles.optionLetter, { color: isCorrectChoice || isUserChoice ? '#FFFFFF' : '#864b03' }]}>{opt.toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.optionText, { color: isCorrectChoice ? '#166534' : (isUserChoice ? '#991B1B' : '#FFFFFF') }]}>{optText}</Text>
                    {isCorrectChoice && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
                    {isUserChoice && !isCorrectChoice && <Ionicons name="close-circle" size={20} color="#EF4444" />}
                  </View>
                );
              })}
            </View>

            {currentQ.explanation && (
              <View style={[styles.explanationCard, { borderColor: '#5D4037', backgroundColor: '#EFEBE9' }]}>
                <View style={styles.explanationHeader}>
                  <Ionicons name="bulb-outline" size={18} color={'#5D4037'} />
                  <Text style={[styles.explanationTitle, { color: '#5D4037' }]}>EXPLANATION</Text>
                </View>
                <RenderHtml
                  contentWidth={windowWidth - 64} // Accounting for padding
                  source={{ html: currentQ.explanation }}
                  tagsStyles={{
                    body: {
                      fontSize: bodySize - 2,
                      color: '#4E342E',
                      textAlign: 'left',
                      minHeight: '100px'
                    },
                    p: { textAlign: 'left', margin: 0, padding: 0 }
                  }}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: '#E2E8F0', backgroundColor: '#FFF8F6' }]}>
        <View style={styles.navButtons}>
          <TouchableOpacity
            onPress={() => setActiveIndex(Math.max(0, activeIndex - 1))}
            disabled={activeIndex === 0}
            style={[styles.navBtn, { backgroundColor: '#F1F5F9' }, activeIndex === 0 && styles.disabledBtn]}
          >
            <Text style={[styles.navBtnText, { color: '#64748B' }]}>Prev</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveIndex(Math.min(filteredQuestions.length - 1, activeIndex + 1))}
            disabled={activeIndex === filteredQuestions.length - 1}
            style={[styles.navBtn, { backgroundColor: '#3E2723' }, activeIndex === filteredQuestions.length - 1 && styles.disabledBtn]}
          >
            <Text style={[styles.navBtnText, { color: '#FFFFFF' }]}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  subjectTabs: { borderBottomWidth: 1 },
  tabsScroll: { paddingHorizontal: 16 },
  tab: { paddingVertical: 10, marginRight: 24 },
  tabText: { fontSize: 13, fontWeight: '800' },
  paginationBox: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)' },
  paginationScroll: { paddingHorizontal: 16, gap: 8 },
  pageBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  pageBtnText: { fontSize: 13, fontWeight: '800' },
  container: { padding: 16, paddingBottom: 100 },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  qNumber: { fontSize: 11, fontWeight: '900', color: '#94A3B8', letterSpacing: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  questionText: { fontSize: 15, lineHeight: 24, marginBottom: 24, fontWeight: '700' },
  optionsList: { gap: 10, marginBottom: 24 },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionLetterBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionLetter: { fontSize: 14, fontWeight: '900' },
  optionText: { flex: 1, fontSize: 13, fontWeight: '600' },
  explanationCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 20
  },
  explanationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  explanationTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  explanationText: { fontSize: 13, lineHeight: 20, fontWeight: '500' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 24, borderTopWidth: 1 },
  navButtons: { flexDirection: 'row', gap: 12 },
  navBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontSize: 14, fontWeight: '900' },
  disabledBtn: { opacity: 0.5 }
});