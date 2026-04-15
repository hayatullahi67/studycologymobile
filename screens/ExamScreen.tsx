import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import * as localDB from '../services/localDatabase';
import { AdBanner } from '../components/AdBanner';
import { ExamMode } from '../types';
import { Screen } from '../components/Layout';
import { Ionicons } from '@expo/vector-icons';
import { useAdRotation } from '../hooks/useAdRotation';
import { COLORS, ThemeColors } from '../theme/colors';

export function ExamScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const {
    activeQuestions,
    activeMode,
    activeExamMeta,
    setAnswer,
    submitExam,
    clearActiveExam,
    selectedSubjectIds,
    subjects,
    userAnswers
  } = useAppStore();

  const { getAdConfig, getCurrentPriorityFilter, moveToNextPriority } = useAdRotation();

  const [subjectIndices, setSubjectIndices] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(60 * 60);
  const [activeTabSubjectId, setActiveTabSubjectId] = useState(selectedSubjectIds[0] || '');
  const [lastAdPriority, setLastAdPriority] = useState<number | null>(null);

  // Get questions for active subject (Flexible Property Mapping)
  const subjectQuestions = useMemo(() => {
    if (!activeTabSubjectId) return [];

    // 1. Direct Filtering with robust string matching
    const filtered = activeQuestions.filter(q => {
      const qSubId = String(q.subject_id || q.subjectId || '').trim();
      const activeId = String(activeTabSubjectId).trim();
      return qSubId === activeId;
    });

    // 2. Fallback: If we have questions but filtering returned none, 
    // and we only have one subject selected, show all active questions.
    if (filtered.length === 0 && selectedSubjectIds.length === 1 && activeQuestions.length > 0) {
      console.log('Using fallback questions display');
      return activeQuestions;
    }

    return filtered;
  }, [activeQuestions, activeTabSubjectId, selectedSubjectIds]);

  // Ensure a valid subject is selected on start or tab changes
  useEffect(() => {
    if (selectedSubjectIds.length > 0) {
      const activeIdStr = String(activeTabSubjectId).trim();
      const isValid = selectedSubjectIds.some(id => String(id).trim() === activeIdStr);

      if (!activeTabSubjectId || !isValid) {
        console.log('[ExamScreen] Resetting activeTabSubjectId to first subject');
        setActiveTabSubjectId(selectedSubjectIds[0]);
      }
    }
  }, [selectedSubjectIds, activeTabSubjectId]);

  const currentIndex = subjectIndices[activeTabSubjectId] || 0;
  const currentQuestion = subjectQuestions[currentIndex];

  // Get ad rotation config for current question
  const adConfig = useMemo(() => getAdConfig(currentIndex), [currentIndex, getAdConfig]);
  const adPriorities = useMemo(() =>
    adConfig.priority !== null ? [adConfig.priority] : [],
    [adConfig.priority]
  );

  // Randomize placement: 40% Chance Above, 60% Chance Mixed
  // We use currentIndex as seed to keep it consistent for the same question during navigation
  const adPosition = useMemo(() => {
    // Simple pseudo-random based on index
    const isMixed = (currentIndex * 7) % 10 < 6;
    return isMixed ? 'mixed' : 'above';
  }, [currentIndex]);

  // Check if priority changed (ad was shown)
  useEffect(() => {
    if (adConfig.priority !== null && adConfig.priority !== lastAdPriority) {
      setLastAdPriority(adConfig.priority);
      // Check if this priority cycle is complete
      // (In a real system, you'd track when all ads of a priority are exhausted)
    }
  }, [adConfig.priority, lastAdPriority]);


  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          handleSubmitFlow(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSubmitFlow = (auto: boolean = false) => {
    const performSubmit = () => {
      submitExam(3600 - timeLeft);
      navigation.navigate('Result');
    };

    if (auto) {
      performSubmit();
      return;
    }

    Alert.alert("Finish Exam?", "Are you sure you want to submit? This will end your session.", [
      { text: "Go Back", style: "cancel" },
      { text: "Submit Exam", style: "default", onPress: performSubmit }
    ]);
  };

  const handleQuit = () => {
    Alert.alert("Quit Exam?", "Your progress will be lost.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Quit", style: "destructive", onPress: () => {
          clearActiveExam();
          navigation.navigate('MainTabs');
        }
      }
    ]);
  };

  const setCurrentIndex = (index: number) => {
    setSubjectIndices(prev => ({ ...prev, [activeTabSubjectId]: index }));
  };

  const options = currentQuestion ? [
    { id: 'a', text: currentQuestion.option_a },
    { id: 'b', text: currentQuestion.option_b },
    { id: 'c', text: currentQuestion.option_c },
    { id: 'd', text: currentQuestion.option_d },
  ] : [];

  const activeSubjectName = subjects.find(s => s.id === activeTabSubjectId)?.name || activeTabSubjectId;
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  return (
    <Screen scrollable={false} style={[styles.bg, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleQuit} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={'#3E2723'} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: '#3E2723' }]}>{activeSubjectName}</Text>

        <View style={styles.headerRight}>
          {/* <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="calculator-outline" size={24} color={isDark ? '#F1F53E2723F9' : '#3E2723'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="menu-outline" size={24} color={'#3E2723'} />
          </TouchableOpacity> */}
        </View>
      </View>

      <View style={styles.infoBar}>
        <View style={styles.infoLeft}>
          <Text style={[styles.qCounter, { color: isDark ? '#3E2723' : '#3E2723' }]}>
            Question {currentIndex + 1} of {subjectQuestions.length}
          </Text>
          <Text style={[styles.timerText, { color: isDark ? '#3E2723' : '#3E2723' }]}>
            {formatTime(timeLeft)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => handleSubmitFlow(false)}
          style={[styles.submitBtn, { backgroundColor: COLORS.primary[600] }]}
        >
          <Text style={styles.submitBtnText}>Submit</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.subjectTabs, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {selectedSubjectIds.map(id => {
            const subject = subjects.find(s => id === s.id);
            const isActive = activeTabSubjectId === id;
            return (
              <TouchableOpacity
                key={id}
                onPress={() => setActiveTabSubjectId(id)}
                style={[
                  styles.tab,
                  isActive && { borderBottomColor: '#3E2723', borderBottomWidth: 3 }
                ]}
              >
                <Text style={[
                  styles.tabText,
                  { color: isActive ? '#3E2723' : '#864b03' }
                ]}>
                  {subject?.name || 'Subject'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {!currentQuestion ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={48} color={isDark ? '#475569' : '#94A3B8'} />
            <Text style={[styles.emptyTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>No Questions Found</Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              We couldn't find offline questions for {activeSubjectName}.
              {'\n'}
              <Text style={{ fontSize: 10, opacity: 0.5 }}>(ID: {activeTabSubjectId})</Text>
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.instructionCard}>
              <Text style={[styles.instructionTitle, { color: isDark ? '#3E2723' : '#3E2723' }]}>Question Instruction</Text>
              <Text style={[styles.instructionText, { color: isDark ? '#94A3B8' : '#475569' }]}>
                Choose the option that best completes the sentence... [Read More]
              </Text>
            </View>

            <Text style={[styles.qSectionTitle, { color: isDark ? '#4E342E' : '#4E342E' }]}>Question {currentIndex + 1}</Text>



            <Text style={[styles.questionText, { color: isDark ? '#1a1a1a' : '#1a1a1a' }]}>{currentQuestion.question}</Text>

            <View style={styles.optionsList}>
              {options.map((opt, index) => {
                const isSelected = userAnswers[currentQuestion.id] === opt.id;
                return (
                  <View key={opt.id}>
                    <TouchableOpacity
                      onPress={() => setAnswer(currentQuestion.id, opt.id)}
                      style={[
                        styles.optionItem,
                        isSelected && { backgroundColor: isDark ? '#3E2723' : '#3E2723', borderColor: '#3E2723' }
                      ]}
                    >
                      <View style={[
                        styles.optionLetterBox,
                        { backgroundColor: isDark ? '#162127' : '#F1F5F9' },
                        isSelected && { backgroundColor: COLORS.primary[600] }
                      ]}>
                        <Text style={[
                          styles.optionLetter,
                          { color: isDark ? '#FFFFFF' : '#FFFFFF' },
                          isSelected && { color: '#FFFFFF' }
                        ]}>
                          {opt.id.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[
                        styles.optionText,
                        { color: isDark ? '#FFFFFF' : '#FFFFFF' },
                        isSelected && { color: '#FFFFFF', fontWeight: '800' }
                      ]}>
                        {opt.text}
                      </Text>
                    </TouchableOpacity>

                    {/* Inject Ad after 2nd option (index 1) */}
                    {index === 1 && (
                      <AdBanner
                        placement="exam_option"
                        size="option"
                        questionIndex={currentIndex}
                      />
                    )}
                  </View>
                );
              })}
            </View>

            {/* <View style={styles.bottomMeta}>
              <Text style={styles.sourceText}>(lexis - 2023)</Text>
              <View style={styles.metaIcons}>
                <TouchableOpacity><Ionicons name="flag-outline" size={20} color="#94A3B8" /></TouchableOpacity>
                <TouchableOpacity><Ionicons name="bookmark-outline" size={20} color="#94A3B8" /></TouchableOpacity>
              </View>
            </View> */}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: '#FFF8F6', borderTopColor: '#E2E8F0' }]}>
        <View style={styles.navButtons}>
          <TouchableOpacity
            onPress={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0 || !currentQuestion}
            style={[styles.navBtn, { backgroundColor: '#EFEBE9' }, (currentIndex === 0 || !currentQuestion) && styles.disabledBtn]}
          >
            <Text style={[styles.navBtnText, { color: '#3E2723' }]}>Prev</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (currentIndex < subjectQuestions.length - 1) {
                setCurrentIndex(currentIndex + 1);
              } else {
                const currentIdx = selectedSubjectIds.indexOf(activeTabSubjectId);
                if (currentIdx < selectedSubjectIds.length - 1) {
                  setActiveTabSubjectId(selectedSubjectIds[currentIdx + 1]);
                } else {
                  Alert.alert("End of Exam", "You have reached the end of all questions. Click Submit to finish.");
                }
              }
            }}
            style={[styles.navBtn, { backgroundColor: '#3E2723' }]}
            disabled={!currentQuestion && selectedSubjectIds.indexOf(activeTabSubjectId) === selectedSubjectIds.length - 1}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerRight: { flexDirection: 'row', gap: 16 },
  iconBtn: { padding: 4 },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10, // Reduced from 14
  },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qCounter: { fontSize: 14, fontWeight: '700' },
  timerText: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  submitBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  subjectTabs: { borderBottomWidth: 1 },
  tabsScroll: { paddingHorizontal: 16 },
  tab: { paddingVertical: 12, marginRight: 24 },
  tabText: { fontSize: 14, fontWeight: '800' },
  container: { padding: 16, paddingBottom: 100 },
  instructionCard: {
    padding: 12, // Reduced from 16
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 16, // Reduced from 24
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  instructionTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 }, // Reduced from 15
  instructionText: { fontSize: 12, lineHeight: 18 }, // Reduced from 13/20
  qSectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 }, // Reduced from 18/12
  questionText: { fontSize: 15, lineHeight: 22, marginBottom: 20 }, // Reduced from 24/32
  optionsList: { gap: 8 }, // Reduced gap from 12
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8, // Reduced from 12
    borderRadius: 10,
    backgroundColor: '#864b03', // Standard Brown
    borderWidth: 1,
    borderColor: '#864b03'
  },
  optionLetterBox: {
    width: 28, // Reduced from 32
    height: 28, // Reduced from 32
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12 // Reduced from 16
  },
  optionLetter: { fontSize: 16, fontWeight: '900' },
  optionText: { flex: 1, fontSize: 14, fontWeight: '600' },
  bottomMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 },
  sourceText: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },
  metaIcons: { flexDirection: 'row', gap: 20 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1
  },
  navButtons: { flexDirection: 'row', gap: 12 },
  navBtn: { flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontSize: 16, fontWeight: '900' },
  disabledBtn: { opacity: 0.5 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '900', marginTop: 20, marginBottom: 10 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22, fontWeight: '600', paddingHorizontal: 20 }
});
