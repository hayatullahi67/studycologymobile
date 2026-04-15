import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppNavigationProp, RootStackParamList } from '../navigation/types';
import { Screen, Header } from '../components/Layout';
import { Button } from '../components/Button';
import { useAppStore } from '../store/useAppStore';
import { COLORS, ThemeColors } from '../theme/colors';
import { ExamMode } from '../types';
import * as localDB from '../services/localDatabase';

export function ExamConfigScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'ExamConfig'>>();
  const mode = route.params?.mode || ExamMode.EXAM;

  const { subjects, setExamConfig, theme, syncStatus } = useAppStore();
  const isDark = theme === 'dark';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [duration, setDuration] = useState(120);
  const [loading, setLoading] = useState(false);
  const [cbtMeta, setCbtMeta] = useState<{ examId: string; yearId: string; year: number } | null>(null);
  const [jambExamId, setJambExamId] = useState<string | null>(null);
  const [questionsPerSubject, setQuestionsPerSubject] = useState(40);

  // Filter and Unique subjects by name
  const processedSubjects = useMemo(() => {
    // 1. Filter by JAMB relevance if in EXAM mode (CBT)
    let filtered = subjects;
    if (mode === ExamMode.EXAM) {
      filtered = (subjects as any[]).filter(s => {
        const examName = (s.exam_name || s.examName || '').toLowerCase();
        const qCount = s.question_count || s.questionCount || 0;
        return examName.includes('jamb') && qCount > 0;
      });
    }

    // 2. Unique by name
    const seen = new Set();
    const uniqueSubjects = filtered.filter(s => {
      const name = s.name.trim().toLowerCase();

      // Filter out invalid subjects
      // if (name.includes('lekki head master')) return false;

      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });

    // 3. Sort: "Use of English" first, then alphabetical
    return uniqueSubjects.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const isAEnglish = aName === 'use of english';
      const isBEnglish = bName === 'use of english';

      if (isAEnglish) return -1;
      if (isBEnglish) return 1;
      return aName.localeCompare(bName);
    });
  }, [subjects, mode]);

  const questionOptions = [10, 20, 30, 40, 50, 60];

  useEffect(() => {
    const fetchJambId = async () => {
      const id = await localDB.getJambExamId();
      setJambExamId(id);
    };
    fetchJambId();
  }, []);

  useEffect(() => {
    if (mode === ExamMode.EXAM) {
      prepareCbtMode();
    }
  }, [mode]);

  const prepareCbtMode = async () => {
    try {
      setLoading(true);
      const jambId = await localDB.getJambExamId();
      if (!jambId) {
        // If syncing, we wait. If not syncing and no ID, then alert.
        if (!syncStatus.isSyncing) {
          Alert.alert("Data Missing", "JAMB data not found. Please sync again.");
          navigation.goBack();
        }
        return;
      }
      const randomYear = await localDB.getRandomYearForExam(jambId) as any;
      if (!randomYear) {
        if (!syncStatus.isSyncing) {
          Alert.alert("Data Missing", "No years found for JAMB. Please sync again.");
          navigation.goBack();
        }
        return;
      }
      setCbtMeta({ examId: jambId, yearId: randomYear.id, year: randomYear.year });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (name: string) => {
    setSelectedNames(prev => {
      if (prev.includes(name)) {
        return prev.filter(item => item !== name);
      }
      if (prev.length >= 4) {
        Alert.alert("Maximum Subjects", "You can select up to 4 subjects.");
        return prev;
      }
      return [...prev, name];
    });
  };

  const handleStart = async () => {
    if (mode === ExamMode.EXAM) {
      // CBT Mode - JAMB: 1 to 4 subjects
      if (selectedNames.length < 1) {
        Alert.alert("Subject Selection", "Please select at least one subject.");
        return;
      }

      setLoading(true);
      try {
        const jambId = await localDB.getJambExamId();
        if (!jambId) {
          Alert.alert("Data Missing", "JAMB data not found. Please sync your data.");
          setLoading(false);
          return;
        }

        console.log(`[CBT] Selected names: ${JSON.stringify(selectedNames)}`);

        // --- STEP 1: Find all matching JAMB subjects (case-insensitive) ---
        const allSubjects = await localDB.getLocalSubjects() as any[];

        // Filter by name 'JAMB' and ensure questions exist (fixes "0 questions" and "lekki" issues)
        const jambSubjects = allSubjects.filter(s => {
          const eName = (s.exam_name || '').toLowerCase();
          const qCount = s.question_count || 0;
          return eName.includes('jamb') && qCount > 0;
        });

        console.log(`[CBT] Total subjects in DB: ${allSubjects.length}, JAMB subjects (with questions): ${jambSubjects.length}`);
        console.log(`[CBT] JAMB subject names: ${jambSubjects.map(s => s.name).join(', ')}`);

        // Normalize names for robust matching
        const normalizedSelectedNames = selectedNames.map(n => n.trim().toLowerCase());
        const matchedSubjects = jambSubjects.filter(s =>
          normalizedSelectedNames.includes(s.name.trim().toLowerCase())
        );

        console.log(`[CBT] Matched subjects count: ${matchedSubjects.length}`);
        console.log(`[CBT] Matched subjects: ${matchedSubjects.map(s => `${s.name}(${s.id})`).join(', ')}`);

        if (matchedSubjects.length === 0) {
          Alert.alert("No Data", "No subjects found for your selection. Please sync your questions.");
          setLoading(false);
          return;
        }

        // --- STEP 2: Pick one canonical subject ID per name (for ExamScreen tabs) ---
        // Use normalized name matching to prevent casing/whitespace mismatches
        const canonicalMap: Record<string, string> = {};
        for (const name of selectedNames) {
          const normalizedName = name.trim().toLowerCase();
          const first = matchedSubjects.find(s => s.name.trim().toLowerCase() === normalizedName);
          if (first) {
            canonicalMap[name] = first.id;
          } else {
            // Fallback: try the store's subjects directly
            const storeSub = subjects.find(s => s.name.trim().toLowerCase() === normalizedName);
            if (storeSub) {
              canonicalMap[name] = storeSub.id;
              console.log(`[CBT] Used store fallback for "${name}" → ${storeSub.id}`);
            }
          }
        }

        const finalSubjectIds = selectedNames.map(n => canonicalMap[n]).filter(Boolean);
        console.log(`[CBT] canonicalMap: ${JSON.stringify(canonicalMap)}`);
        console.log(`[CBT] finalSubjectIds: ${JSON.stringify(finalSubjectIds)}`);

        // --- STEP 3: Try single-year simulation ---
        const yearMap: Record<string, any[]> = {};
        matchedSubjects.forEach(s => {
          if (!yearMap[s.exam_year_id]) yearMap[s.exam_year_id] = [];
          yearMap[s.exam_year_id].push(s);
        });

        const eligibleYears = Object.keys(yearMap).filter(yid => {
          const namesInYear = new Set(yearMap[yid].map((s: any) => s.name.trim().toLowerCase()));
          return namesInYear.size === selectedNames.length;
        });

        let allQuestions: any[] = [];
        let finalYearNumber: number = 0;

        if (eligibleYears.length > 0) {
          const finalYearId = eligibleYears[Math.floor(Math.random() * eligibleYears.length)];
          const years = await localDB.getYearsForExam(jambId) as any[];
          finalYearNumber = years.find(y => y.id === finalYearId)?.year || 0;

          console.log(`[CBT] Strict year simulation: ${finalYearNumber}`);
          for (const name of selectedNames) {
            const normalizedName = name.trim().toLowerCase();
            const limit = questionsPerSubject;
            const yearSub = yearMap[finalYearId].find((s: any) => s.name.trim().toLowerCase() === normalizedName);
            if (yearSub) {
              const subQs = await localDB.getRandomQuestionsBySubject(yearSub.id, limit);
              // Normalize subject_id so ExamScreen tabs work
              const normalized = subQs.map((q: any) => ({ ...q, subject_id: canonicalMap[name] }));
              allQuestions = [...allQuestions, ...normalized];
              console.log(`[CBT] ${name}: ${subQs.length}/${limit} questions (year ${finalYearNumber})`);
            }
          }
        }

        // --- STEP 4: Fallback to global name-based fetch ---
        if (allQuestions.length === 0) {
          console.log('[CBT] Falling back to global name-based search.');
          finalYearNumber = 0;
          for (const name of selectedNames) {
            const limit = questionsPerSubject;
            const subQs = await localDB.getRandomQuestionsBySubjectName(name, limit);
            // Normalize subject_id to the canonical ID for this name
            const normalized = subQs.map((q: any) => ({ ...q, subject_id: canonicalMap[name] }));
            allQuestions = [...allQuestions, ...normalized];
            console.log(`[CBT] ${name}: ${subQs.length}/${limit} questions (global)`);
          }
        }

        if (allQuestions.length === 0) {
          Alert.alert("No Questions Found", "Could not find any questions for the selected subjects. Please check your sync status.");
          setLoading(false);
          return;
        }

        console.log(`[CBT] Final pool: ${allQuestions.length} questions across ${finalSubjectIds.length} subjects.`);

        setExamConfig(finalSubjectIds, mode, allQuestions, {
          title: finalYearNumber > 0 ? `JAMB ${finalYearNumber} Simulation` : 'UTME Practice (All Years)',
          year: finalYearNumber
        });

        setSelectedNames([]);
        navigation.navigate('Exam');

      } catch (error) {
        console.error('[CBT] Error preparing exam:', error);
        Alert.alert("Error", "Failed to prepare questions. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      // Standard Practice mode
      navigation.navigate('PastQuestions');
    }
  };

  if (processedSubjects.length === 0 && syncStatus.isSyncing) {
    const progress = Math.round(syncStatus.progress * 100);
    return (
      <Screen scrollable={false} style={[styles.bg, { backgroundColor: '#FFF8F6' }]}>
        <View style={styles.syncContainer}>
          <View style={styles.syncCard}>
            <View style={styles.syncIconWrapper}>
              <Ionicons name="cloud-download" size={48} color="#864b03" />
            </View>

            <Text style={styles.syncTitle}>Preparing Your Exams</Text>
            <Text style={styles.syncSubtitle}>
              We're setting up the subjects and questions for your offline practice.
            </Text>

            <View style={styles.progressSection}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{progress}% Completed</Text>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color="#8D6E63" />
              <Text style={styles.infoText}>
                This takes a few moments. You can come back in a few minutes and everything will be ready for offline use.
              </Text>
            </View>

            <Button
              // variant="outlin"
              textStyle={{ color: '#FFFFFF' }}
              fullWidth
              onPress={() => navigation.goBack()}
            >
              Go Back
            </Button>
          </View>
        </View>
      </Screen>
    );
  }

  if (loading && mode === ExamMode.EXAM) {
    return (
      <View style={[styles.center, isDark && { backgroundColor: '#0b141a' }]}>
        <ActivityIndicator size="large" color="#864b03" />
      </View>
    );
  }

  return (
    <Screen scrollable={false} style={[styles.bg, { backgroundColor: '#FFF8F6' }]}>
      <View style={[styles.customHeader, { borderBottomWidth: 0 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="chevron-back" size={24} color={'#000000'} />
        </TouchableOpacity>
      </View>

      <View style={styles.introHeader}>
        <Text style={[styles.headerTitle, { color: '#000000' }]}>Examine Yourself</Text>
        <Text style={[styles.headerSubtitle, { color: '#5D4037' }]}>Select 1 to 4 subjects for your CBT session</Text>
      </View>

      <View style={styles.configBlock}>
        <Text style={styles.configTitle}>Questions Per Subject</Text>
        <View style={styles.optionRow}>
          {questionOptions.map((count) => {
            const selected = questionsPerSubject === count;
            return (
              <TouchableOpacity
                key={count}
                style={[styles.optionChip, selected && styles.optionChipActive]}
                onPress={() => setQuestionsPerSubject(count)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionChipText, selected && styles.optionChipTextActive]}>{count}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.subjectList}>
          {processedSubjects.map(subject => {
            const isSelected = selectedNames.includes(subject.name);
            const initial = subject.name.charAt(0).toUpperCase();

            // Amber/Lava look for selection boxes
            const iconBg = isSelected ? COLORS.primary[600] : (isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9');

            return (
              <View key={subject.id} style={styles.subjectWrapper}>
                <TouchableOpacity
                  style={[
                    styles.subjectItem,
                    { backgroundColor: isSelected ? '#3E2723' : '#864b03' },
                    { borderColor: isSelected ? '#3E2723' : '#864b03' }
                  ]}
                  onPress={() => toggleSubject(subject.name)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.letterBox, { backgroundColor: '#FFFFFF' }]}>
                    <Text style={[styles.letterText, { color: '#864b03' }]}>{initial}</Text>
                  </View>

                  <Text style={[styles.subjectName, { color: '#FFFFFF' }]}>
                    {subject.name}
                  </Text>

                  <View style={[styles.checkbox, isSelected && { backgroundColor: COLORS.primary[600], borderColor: COLORS.primary[600] }]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>

              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopWidth: 0 }]}>
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: COLORS.primary[600] }]}
          onPress={handleStart}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.startBtnText}>Proceed</Text>
          )}
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  customHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: { padding: 4 },
  introHeader: {
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  configBlock: {
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  configTitle: {
    color: '#5D4037',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    borderWidth: 1.5,
    borderColor: '#D7CCC8',
    backgroundColor: '#FFF8F6',
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionChipActive: {
    backgroundColor: '#864b03',
    borderColor: '#864b03',
  },
  optionChipText: {
    color: '#5D4037',
    fontSize: 13,
    fontWeight: '800',
  },
  optionChipTextActive: {
    color: '#FFFFFF',
  },
  container: {
    paddingBottom: 40,
  },
  subjectList: {
    paddingHorizontal: 16,
  },
  subjectWrapper: {
    marginBottom: 12,
  },
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  letterBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  letterText: {
    fontSize: 16,
    fontWeight: '900',
  },
  subjectName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 10,
  },
  startBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#864b03',
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  syncContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  syncCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#864b03',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  syncIconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(134, 75, 3, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  syncTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#3E2723',
    textAlign: 'center',
    marginBottom: 12,
  },
  syncSubtitle: {
    fontSize: 15,
    color: '#5D4037',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    fontWeight: '500',
  },
  progressSection: {
    width: '100%',
    marginBottom: 32,
  },
  progressBarBg: {
    width: '100%',
    height: 10,
    backgroundColor: '#F3E5F5',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#864b03',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#864b03',
    textAlign: 'right',
  },
  infoBox: {
    flexDirection: 'row',
    // backgroundColor: '#FFF8F1',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    color: '#8D6E63',
    lineHeight: 18,
    fontWeight: '600',
  },
  backButton: {
    height: 56,
    borderRadius: 16,
  },
});
