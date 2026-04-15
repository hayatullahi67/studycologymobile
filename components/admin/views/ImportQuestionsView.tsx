import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  Modal,
  FlatList,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as myQuestAPI from '../../../services/myQuestAPI';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';

// Re-using types from service for consistency
import { Exam, Year, Subject, APIQuestion } from '../../../services/myQuestAPI';

interface ImportViewProps {
  onNavigate: (screen: string, params?: any) => void;
  onBackPress?: () => void;
}

type TabType = 'import' | 'bulk';

interface SelectionModalProps {
  visible: boolean;
  title: string;
  items: any[];
  onSelect: (item: any) => void;
  onClose: () => void;
  displayKey?: string;
  isDark: boolean;
  colors: any;
  disabledItems?: string[];
  multiSelect?: boolean;
  selectedItems?: any[];
  onDone?: () => void;
}

export const SelectionModal: React.FC<SelectionModalProps> = ({
  visible,
  title,
  items,
  onSelect,
  onClose,
  displayKey = 'name',
  isDark,
  colors,
  disabledItems = [],
  multiSelect = false,
  selectedItems = [],
  onDone
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
              {multiSelect && <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>{selectedItems.length} selected</Text>}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {multiSelect && onDone && (
                <TouchableOpacity
                  onPress={() => { onDone(); onClose(); }}
                  style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 13 }}>DONE</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.background }]}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyList}>
              <Text style={[styles.emptyListText, { color: colors.textSecondary }]}>No options available</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item, index) => item.id || index.toString()}
              contentContainerStyle={styles.listContent}
              extraData={selectedItems}
              renderItem={({ item }) => {
                const itemValue = item[displayKey] || item;
                const isDisabled = disabledItems.includes(itemValue);
                const isSelected = selectedItems.some(si => (si[displayKey] || si) === itemValue);

                return (
                  <TouchableOpacity
                    style={[
                      styles.listItem,
                      { borderBottomColor: colors.border },
                      isDisabled && { opacity: 0.4 },
                      isSelected && { backgroundColor: isDark ? 'rgba(33, 150, 243, 0.1)' : '#EFF6FF' }
                    ]}
                    onPress={() => {
                      if (isDisabled) return;
                      onSelect(item);
                      if (!multiSelect) onClose();
                    }}
                    disabled={isDisabled}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      {multiSelect && (
                        <View style={[
                          styles.checkboxOuter,
                          { borderColor: isSelected ? colors.primary : colors.border },
                          isSelected && { backgroundColor: isDark ? colors.primary + '30' : colors.primary + '10' }
                        ]}>
                          <View style={[
                            styles.checkboxInner,
                            isSelected && { backgroundColor: colors.primary }
                          ]}>
                            {isSelected && <Ionicons name="checkmark" size={12} color="#FFF" />}
                          </View>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[
                          styles.listItemText,
                          { color: colors.text },
                          (isDisabled || (isSelected && !multiSelect)) && { color: colors.textSecondary },
                          isSelected && multiSelect && { color: colors.primary, fontWeight: '900' }
                        ]}>
                          {itemValue}
                        </Text>
                        {isSelected && multiSelect && (
                          <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '700', marginTop: 2 }}>SELECTED</Text>
                        )}
                      </View>
                      {isDisabled && (
                        <View style={[styles.syncedBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5' }]}>
                          <Text style={[styles.syncedBadgeText, { color: isDark ? '#34D399' : '#047857' }]}>FULLY SYNCED</Text>
                        </View>
                      )}
                    </View>
                    {!multiSelect && (
                      <Ionicons
                        name={isDisabled ? "checkmark-circle" : "chevron-forward"}
                        size={18}
                        color={isDisabled ? colors.primary : colors.border}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

export const ImportQuestionsView: React.FC<ImportViewProps> = ({
  onNavigate,
  onBackPress,
}) => {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  // State Management
  const [activeTab, setActiveTab] = useState<TabType>('import');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);

  // Dropdown Data State
  const [exams, setExams] = useState<Exam[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [syncedSubjects, setSyncedSubjects] = useState<string[]>([]);

  // Selection State
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedYear, setSelectedYear] = useState<Year | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Bulk State
  const [startYear, setStartYear] = useState<Year | null>(null);
  const [endYear, setEndYear] = useState<Year | null>(null);
  const [bulkSubjects, setBulkSubjects] = useState<Subject[]>([]);
  const [selectedBulkSubjects, setSelectedBulkSubjects] = useState<Subject[]>([]);
  const [bulkSyncedSubjects, setBulkSyncedSubjects] = useState<string[]>([]);

  // Preview State
  const [previewQuestions, setPreviewQuestions] = useState<APIQuestion[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    items: any[];
    onSelect: (item: any) => void;
    displayKey: string;
    disabledItems?: string[];
    multiSelect?: boolean;
    selectedItems?: any[];
    onDone?: () => void;
  }>({ title: '', items: [], onSelect: () => { }, displayKey: 'name', disabledItems: [], multiSelect: false, selectedItems: [], onDone: () => { } });

  // Manual entry state (simplified for this view)
  const [manualQuestion, setManualQuestion] = useState('');

  // Import progress
  const [importProgress, setImportProgress] = useState({
    total: 0,
    current: 0,
    status: '',
    overall: '',
  });

  // ============================================
  // INITIALIZATION & API HEALTH CHECK
  // ============================================

  useEffect(() => {
    checkApiAndLoadExams();
  }, []);

  const checkApiAndLoadExams = async () => {
    try {
      setLoading(true);

      // Check API health
      const health = await myQuestAPI.checkApiHealth();
      setApiAvailable(health.isAvailable);

      if (!health.isAvailable) {
        Alert.alert('Notice', 'Cloud library is currently offline. You can still add questions manually.');
      }

      // Load exams
      const examsData = await myQuestAPI.getExams();
      setExams(examsData);
    } catch (error) {
      console.error('Error checking API:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // SELECTION HANDLERS
  // ============================================

  const openSelectionModal = (type: 'exam' | 'year' | 'subject' | 'startYear' | 'endYear') => {
    switch (type) {
      case 'exam':
        setModalConfig({
          title: 'Select Exam Body',
          items: exams,
          displayKey: 'name',
          onSelect: (item) => handleSelectExam(item)
        });
        break;
      case 'year':
        setModalConfig({
          title: 'Select Exam Year',
          items: years,
          displayKey: 'year',
          onSelect: (item) => handleSelectYear(item)
        });
        break;
      case 'subject':
        if (activeTab === 'bulk') {
          setModalConfig({
            title: 'Select Subjects',
            items: bulkSubjects,
            displayKey: 'name',
            multiSelect: true,
            selectedItems: selectedBulkSubjects,
            onSelect: (item) => {
              setSelectedBulkSubjects(prev => {
                const exists = prev.some(s => s.id === item.id);
                const next = exists ? prev.filter(s => s.id !== item.id) : [...prev, item];
                // Update modalConfig to trigger immediate re-render of the modal
                setModalConfig(current => ({ ...current, selectedItems: next }));
                return next;
              });
            },
            disabledItems: bulkSyncedSubjects,
            onDone: () => { }
          });
        } else {
          setModalConfig({
            title: 'Select Subject',
            items: subjects,
            displayKey: 'name',
            onSelect: (item) => handleSelectSubject(item),
            disabledItems: syncedSubjects,
            multiSelect: false,
            selectedItems: selectedSubject ? [selectedSubject] : []
          });
        }
        break;
      case 'startYear':
        setModalConfig({
          title: 'Select Start Year',
          items: years,
          displayKey: 'year',
          onSelect: (item) => {
            setStartYear(item);
            if (endYear) updateBulkSyncedSubjects(item, endYear);
          }
        });
        break;
      case 'endYear':
        setModalConfig({
          title: 'Select End Year',
          items: years,
          displayKey: 'year',
          onSelect: (item) => {
            setEndYear(item);
            if (startYear) updateBulkSyncedSubjects(startYear, item);
          }
        });
        break;
    }
    setModalVisible(true);
  };

  const handleSelectExam = async (exam: Exam) => {
    setSelectedExam(exam);
    setSelectedYear(null);
    setSelectedSubject(null);
    setStartYear(null);
    setEndYear(null);
    setSelectedBulkSubjects([]);
    setBulkSyncedSubjects([]);
    setYears([]);
    setSubjects([]);
    setBulkSubjects([]);
    setSyncedSubjects([]);
    setLoading(true);
    try {
      const yearsData = await myQuestAPI.getExamYears(exam.name);
      setYears(yearsData);

      // Fetch sample subjects for bulk selection (using first year as proxy)
      if (yearsData.length > 0) {
        try {
          const sampleSubjects = await myQuestAPI.getSubjects(exam.name, yearsData[0].id);
          setBulkSubjects(sampleSubjects);
          // Don't auto-select subjects for bulk mode to prevent accidental imports
          setSelectedBulkSubjects([]);
        } catch (subErr) {
          console.error('Error fetching bulk subjects:', subErr);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectYear = async (year: Year) => {
    setSelectedYear(year);
    setSelectedSubject(null);
    setSubjects([]);
    setSyncedSubjects([]);
    setLoading(true);
    try {
      // Parallel fetch for speed
      const [subjectsData, syncedData] = await Promise.all([
        myQuestAPI.getSubjects(selectedExam!.name, year.id),
        supabaseDB.getImportedSubjects(selectedExam!.name, year.year)
      ]);
      setSubjects(subjectsData);
      setSyncedSubjects(syncedData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSubject = (subject: Subject) => {
    setSelectedSubject(subject);
  };

  const updateBulkSyncedSubjects = async (start: Year | null, end: Year | null) => {
    if (!selectedExam || !start || !end || years.length === 0) {
      setBulkSyncedSubjects([]);
      return;
    }

    const startIdx = years.findIndex(y => y.id === start.id);
    const endIdx = years.findIndex(y => y.id === end.id);
    if (startIdx === -1 || endIdx === -1) return;

    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);
    const rangeYears = years.filter((_, idx) => idx >= minIdx && idx <= maxIdx);

    setLoading(true);
    try {
      const allSynced = await Promise.all(
        rangeYears.map(y => supabaseDB.getImportedSubjects(selectedExam.name, y.year))
      );

      if (allSynced.length > 0) {
        // A subject is "fully synced" for the range if it appears in ALL years of the range
        const intersection = allSynced.reduce((a, b) => a.filter(c => b.includes(c)));
        setBulkSyncedSubjects(intersection);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FETCH & PREVIEW
  // ============================================

  const handleFetchPreview = async () => {
    if (!selectedExam || !selectedYear || !selectedSubject) {
      Alert.alert('Required', 'Please select Exam, Year, and Subject.');
      return;
    }

    try {
      setLoading(true);
      setImportProgress({ total: 0, current: 0, status: 'Fetching questions from repository...', overall: '' });

      const apiQuestions = await myQuestAPI.getAllQuestions(
        selectedExam.name,
        selectedYear.id,
        selectedSubject.id
      );

      if (apiQuestions.length === 0) {
        Alert.alert('No Data', 'No questions found for this selection.');
      } else {
        setPreviewQuestions(apiQuestions);
        setIsPreviewMode(true);
      }
    } catch (error) {
      console.error('Fetch Error:', error);
      Alert.alert('Error', 'Failed to fetch questions. Check connection.');
    } finally {
      setLoading(false);
      setImportProgress({ total: 0, current: 0, status: '', overall: '' });
    }
  };

  // ============================================
  // CONFIRM IMPORT (SAVE TO DB)
  // ============================================

  const handleConfirmImport = async () => {
    if (!selectedExam || !selectedYear || !selectedSubject || previewQuestions.length === 0) return;

    try {
      setSyncing(true);
      setImportProgress({
        total: previewQuestions.length,
        current: 0,
        status: 'Preparing database...',
        overall: '',
      });

      // 1. Ensure Hierarchy Exists
      const examDb = await supabaseDB.upsertExam(selectedExam.name);
      const yearDb = await supabaseDB.upsertExamYear(examDb.id, selectedYear.year);
      const subjectDb = await supabaseDB.upsertSubject(
        examDb.id,
        yearDb.id,
        selectedSubject.name
      );

      // 2. Filter Duplicates (Optimized)
      setImportProgress(prev => ({ ...prev, status: 'Checking for existing questions...' }));
      const existingIds = await supabaseDB.getExistingApiQuestionIds(examDb.id, yearDb.id, subjectDb.id);
      const existingIdsSet = new Set(existingIds);

      const newQuestions = previewQuestions
        .filter(q => !existingIdsSet.has(q.id))
        .map(q => ({
          examId: examDb.id,
          examYearId: yearDb.id,
          subjectId: subjectDb.id,
          question: q.question,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          explanation: q.explanation || '',
          api_question_id: q.id,
        }));

      // 3. Insert Batch
      if (newQuestions.length > 0) {
        setImportProgress({
          total: newQuestions.length,
          current: 0,
          status: `Saving ${newQuestions.length} questions to Supabase...`,
          overall: '',
        });

        await supabaseDB.insertQuestionsInBatch(newQuestions);

        Alert.alert(
          'Import Success',
          `${selectedExam.name} ${selectedYear.year} - ${selectedSubject.name}\n\n• ${newQuestions.length} questions uploaded.\n• ${previewQuestions.length - newQuestions.length} existing questions skipped.`
        );
      } else {
        Alert.alert(
          'Already Synced',
          `All questions for ${selectedExam.name} ${selectedYear.year} (${selectedSubject.name}) are already in your database.`
        );
      }

      // Build updated synced list
      setSyncedSubjects(prev => [...new Set([...prev, selectedSubject.name])]);

      // Reset
      setIsPreviewMode(false);
      setPreviewQuestions([]);
      setSelectedSubject(null);

    } catch (error: any) {
      console.error('Import Error:', error);
      // Specific handling for RLS error 42501
      if (JSON.stringify(error).includes('42501') || (error.message && error.message.includes('row-level security'))) {
        Alert.alert(
          'Permission Denied (RLS)',
          'You need to run the SQL fix script in your Supabase Dashboard to allow writing to the database.\n\nCheck "supabase/migrations/20240122_fix_rls.sql".'
        );
      } else {
        Alert.alert('Import Failed', 'Failed to save questions to database.');
      }
    } finally {
      setSyncing(false);
      setImportProgress({ total: 0, current: 0, status: '', overall: '' });
    }
  };

  const handleBulkSync = async () => {
    if (!selectedExam || !startYear || !endYear || selectedBulkSubjects.length === 0) {
      Alert.alert('Required', 'Please select Exam, Year Range, and at least one Subject.');
      return;
    }

    const startIdx = years.findIndex(y => y.id === startYear.id);
    const endIdx = years.findIndex(y => y.id === endYear.id);

    if (startIdx === -1 || endIdx === -1) {
      Alert.alert('Selection Error', 'Could not determine the year range. Please re-select the years.');
      return;
    }

    // Filter years in range (handling descending/ascending API response)
    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);
    const selectedYears = years.filter((_, idx) => idx >= minIdx && idx <= maxIdx);

    if (selectedYears.length === 0) {
      Alert.alert('Selection Error', 'No years found in the selected range.');
      return;
    }

    try {
      setSyncing(true);
      let totalImported = 0;
      let skippedPapers = 0;
      const totalSteps = selectedBulkSubjects.length * selectedYears.length;
      let currentStep = 0;

      // 1. Setup DB Exam structure once
      const examDb = await supabaseDB.upsertExam(selectedExam.name);

      for (const currentYear of selectedYears) {
        // 2. Setup DB Year structure once per year
        const yearDb = await supabaseDB.upsertExamYear(examDb.id, currentYear.year);

        for (const subject of selectedBulkSubjects) {
          currentStep++;
          setImportProgress({
            total: totalSteps,
            current: currentStep,
            status: `[${subject.name}] Fetching ${currentYear.year}...`,
            overall: `Processing Subject ${selectedBulkSubjects.indexOf(subject) + 1} of ${selectedBulkSubjects.length}`
          });

          // 3. Fetch questions for this year/subject
          const apiQuestions = await myQuestAPI.getAllQuestions(
            selectedExam.name,
            currentYear.id,
            subject.id
          );

          if (apiQuestions.length === 0) {
            skippedPapers++;
            continue;
          }

          // 4. Setup Subject DB structure
          const subjectDb = await supabaseDB.upsertSubject(
            examDb.id,
            yearDb.id,
            subject.name
          );

          // 5. Batch Duplicate Check (Optimized)
          setImportProgress(prev => ({
            ...prev,
            status: `[${subject.name}] Checking for duplicates...`
          }));
          const existingIds = await supabaseDB.getExistingApiQuestionIds(examDb.id, yearDb.id, subjectDb.id);
          const existingIdsSet = new Set(existingIds);

          const newQuestions = apiQuestions
            .filter(q => !existingIdsSet.has(q.id))
            .map(q => ({
              examId: examDb.id,
              examYearId: yearDb.id,
              subjectId: subjectDb.id,
              question: q.question,
              option_a: q.option_a,
              option_b: q.option_b,
              option_c: q.option_c,
              option_d: q.option_d,
              correct_answer: q.correct_answer,
              explanation: q.explanation || '',
              api_question_id: q.id,
            }));

          // 6. Batch Insert
          if (newQuestions.length > 0) {
            setImportProgress(prev => ({
              ...prev,
              status: `[${subject.name}] Saving ${newQuestions.length} questions for ${currentYear.year}...`
            }));
            await supabaseDB.insertQuestionsInBatch(newQuestions);
            totalImported += newQuestions.length;
          }
        }
      }

      Alert.alert(
        'Bulk Import Complete',
        `${selectedExam.name} - Multiple Papers\n\nSuccessfully synced ${totalImported} new questions across ${selectedBulkSubjects.length} subjects and ${selectedYears.length} years.\n\n${skippedPapers > 0 ? `• Note: ${skippedPapers} papers were skipped because no data was found on the repository.` : ''}`
      );

      // Cleanup
      setStartYear(null);
      setEndYear(null);
      setSelectedBulkSubjects([]);

    } catch (error) {
      console.error('Bulk Import Error:', error);
      Alert.alert('Error', 'Bulk import failed. Please check your connection.');
    } finally {
      setSyncing(false);
      setImportProgress({ total: 0, current: 0, status: '', overall: '' });
    }
  };

  const renderQuestionPreview = ({ item, index }: { item: APIQuestion, index: number }) => (
    <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.qHeader}>
        <Text style={[styles.qNumber, { color: colors.textSecondary }]}>Q{index + 1}</Text>
        <View style={[styles.qBadge, { backgroundColor: isDark ? colors.background : '#F1F5F9' }]}><Text style={[styles.qBadgeText, { color: colors.textSecondary }]}>Preview</Text></View>
      </View>

      <Text style={[styles.qText, { color: colors.text }]}>{item.question}</Text>

      {['a', 'b', 'c', 'd'].map((optKey) => {
        const isCorrect = item.correct_answer === optKey;
        // @ts-ignore
        const optText = item[`option_${optKey}`];
        return (
          <View key={optKey} style={[
            styles.optionRow,
            { backgroundColor: colors.background, borderColor: colors.border },
            isCorrect && { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5', borderColor: '#10B981' }
          ]}>
            <Text style={[
              styles.optLabel,
              { color: colors.textSecondary },
              isCorrect && { color: '#10B981' }
            ]}>{optKey.toUpperCase()}.</Text>
            <Text style={[
              styles.optText,
              { color: colors.text },
              isCorrect && { color: isDark ? '#34D399' : '#047857', fontWeight: '700' }
            ]}>{optText}</Text>
            {isCorrect && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
          </View>
        );
      })}

      {item.explanation ? (
        <View style={[styles.explanationBox, { backgroundColor: isDark ? 'rgba(249, 115, 22, 0.1)' : '#FFF7ED', borderLeftColor: '#F97316' }]}>
          <Text style={styles.explanationTitle}>EXPLANATION</Text>
          <Text style={[styles.explanationText, { color: isDark ? colors.text : '#431407' }]}>{item.explanation}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={isPreviewMode ? () => setIsPreviewMode(false) : onBackPress} style={styles.backBtn}>
          <Ionicons name={isPreviewMode ? "close" : "arrow-back"} size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isPreviewMode ? 'Review Content' : 'Online Import Center'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {isPreviewMode ? `${previewQuestions.length} Questions Found` : 'Online Exam Database'}
          </Text>
        </View>
      </View>

      {!isPreviewMode && (
        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'import' && styles.activeTab]}
            onPress={() => setActiveTab('import')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'import' ? colors.primary : colors.textSecondary }]}>Single Sync</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'bulk' && styles.activeTab]}
            onPress={() => setActiveTab('bulk')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'bulk' ? colors.primary : colors.textSecondary }]}>Bulk Import</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isPreviewMode ? (
        /* ================= SELECTION FORM ================= */
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status Alert */}
          <View style={[
            styles.statusCard,
            apiAvailable
              ? { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5', borderColor: '#10B981' }
              : { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', borderColor: '#EF4444' }
          ]}>
           
            <Ionicons name={apiAvailable ? "cloud-download-outline" : "cloud-offline-outline"} size={20} color={apiAvailable ? "#10B981" : "#EF4444"} />
            <View style={{ marginLeft: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: apiAvailable ? (isDark ? '#34D399' : '#065F46') : '#EF4444' }}>
                {apiAvailable ? 'Online Library Ready' : 'Cloud Library Offline'}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: apiAvailable ? (isDark ? 'rgba(52, 211, 153, 0.7)' : 'rgba(6, 95, 70, 0.7)') : 'rgba(239, 68, 68, 0.7)' }}>
                {apiAvailable ? 'You can now download and upload new exam questions' : 'Please check your internet to sync questions'}
              </Text>
            </View>
          </View>

          {activeTab === 'import' ? (
            <>
              <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Single Paper Fetch</Text>
                {renderDropdown("EXAM BODY", selectedExam?.name, "Select Exam", () => openSelectionModal('exam'), loading, isDark, colors)}
                {renderDropdown("EXAM YEAR", selectedYear?.year, "Select Year", () => openSelectionModal('year'), !selectedExam || loading, isDark, colors)}
                {renderDropdown("SUBJECT", selectedSubject?.name, "Select Subject", () => openSelectionModal('subject'), !selectedYear || loading, isDark, colors)}
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }, (!selectedSubject || loading) && { opacity: 0.5 }]}
                onPress={handleFetchPreview}
                disabled={!selectedSubject || loading}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="search" size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
                    <Text style={styles.primaryBtnText}>Fetch & Review</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Multi-Year Batch Sync</Text>
                {renderDropdown("EXAM BODY", selectedExam?.name, "Select Exam", () => openSelectionModal('exam'), loading, isDark, colors)}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>{renderDropdown("FROM YEAR", startYear?.year, "Start Year", () => openSelectionModal('startYear'), !selectedExam || loading, isDark, colors)}</View>
                  <View style={{ flex: 1 }}>{renderDropdown("TO YEAR", endYear?.year, "End Year", () => openSelectionModal('endYear'), !selectedExam || loading, isDark, colors)}</View>
                </View>
                {renderDropdown(
                  "TARGET SUBJECTS",
                  selectedBulkSubjects.length > 0
                    ? (selectedBulkSubjects.length === 1 ? selectedBulkSubjects[0].name : `${selectedBulkSubjects.length} Subjects Selected`)
                    : undefined,
                  "Select Subjects",
                  () => openSelectionModal('subject'),
                  !selectedExam || loading,
                  isDark,
                  colors
                )}

                <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(33, 150, 243, 0.1)' : '#EFF6FF', borderLeftColor: '#3B82F6' }]}>
                  <Ionicons name="information-circle-outline" size={18} color="#3B82F6" />
                  <Text style={[styles.infoText, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
                    System will automatically skip any questions already in your database.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#10B981' }, (selectedBulkSubjects.length === 0 || !startYear || !endYear || loading || syncing) && { opacity: 0.5 }]}
                onPress={handleBulkSync}
                disabled={selectedBulkSubjects.length === 0 || !startYear || !endYear || loading || syncing}
              >
                {loading || syncing ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="cloud-download" size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
                    <Text style={styles.primaryBtnText}>Start Bulk Import</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* ================= PREVIEW LIST ================= */
        <View style={{ flex: 1 }}>
          <FlatList
            data={previewQuestions}
            renderItem={renderQuestionPreview}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          />

          {/* Floating Action Bar */}
          <View style={[styles.floatingFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 }}>TARGET: {selectedExam?.name} {selectedYear?.year}</Text>
              <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>{selectedSubject?.name}</Text>
            </View>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }, syncing && { opacity: 0.7 }]}
              onPress={handleConfirmImport}
              disabled={syncing}
            >
              {syncing ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Text style={styles.confirmBtnText}>Import All</Text>
                  <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Progress Overlay */}
          {syncing && (
            <View style={styles.fullScreenOverlay}>
              <View style={[styles.progressBox, { backgroundColor: colors.surface }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.overlayTitle, { color: colors.text }]}>
                  {activeTab === 'bulk' ? 'Processing Batch Import...' : 'Synchronizing Paper...'}
                </Text>
                {importProgress.overall && <Text style={styles.overallProgress}>{importProgress.overall}</Text>}
                <Text style={[styles.overlayText, { color: colors.textSecondary }]}>{importProgress.status}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* SELECTION MODAL */}
      <SelectionModal
        visible={modalVisible}
        title={modalConfig.title}
        items={modalConfig.items}
        onSelect={modalConfig.onSelect}
        onClose={() => setModalVisible(false)}
        displayKey={modalConfig.displayKey}
        isDark={isDark}
        colors={colors}
        disabledItems={modalConfig.disabledItems}
        multiSelect={modalConfig.multiSelect}
        selectedItems={modalConfig.selectedItems}
        onDone={modalConfig.onDone}
      />

    </SafeAreaView>
  );
};

// Helper for rendering dropdowns
const renderDropdown = (label: string, value: string | undefined, placeholder: string, onPress: () => void, disabled: boolean, isDark: boolean, colors: any) => (
  <View style={styles.dropdownContainer}>
    <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    <TouchableOpacity
      style={[
        styles.dropdown,
        { backgroundColor: colors.background, borderColor: colors.border },
        disabled && { opacity: 0.5 }
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[
        styles.dropdownText,
        { color: colors.text },
        !value && { color: isDark ? COLORS.slate[500] : COLORS.slate[400] }
      ]}>{value || placeholder}</Text>
      <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  backBtn: { marginRight: 20, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  headerSubtitle: { fontSize: 13, fontWeight: '600' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1 },
  tab: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: COLORS.primary[500] },
  tabText: { fontSize: 14, fontWeight: '800' },
  content: { flex: 1, paddingHorizontal: 16 },

  // Status & Forms
  statusCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, marginBottom: 20, borderWidth: 1, marginTop: 20 },
  formCard: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 24, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '900', marginBottom: 24, letterSpacing: 0.5 },
  dropdownContainer: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderWidth: 1, borderRadius: 14 },
  dropdownText: { fontSize: 15, fontWeight: '700' },

  // Buttons
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16, elevation: 4 },
  primaryBtnText: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },

  // Preview List
  previewCard: { borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, elevation: 2 },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' },
  qNumber: { fontSize: 14, fontWeight: '900' },
  qBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  qBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  qText: { fontSize: 17, fontWeight: '700', lineHeight: 26, marginBottom: 20 },
  optionRow: { flexDirection: 'row', padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, alignItems: 'center' },
  optLabel: { fontWeight: '900', marginRight: 12, fontSize: 15 },
  optText: { flex: 1, fontSize: 15, fontWeight: '600' },
  explanationBox: { marginTop: 16, padding: 16, borderRadius: 16, borderLeftWidth: 4 },
  explanationTitle: { fontSize: 11, fontWeight: '900', color: '#F97316', marginBottom: 8, letterSpacing: 1 },
  explanationText: { fontSize: 14, fontWeight: '600', lineHeight: 22 },

  // Footer & Overlays
  floatingFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, padding: 20, flexDirection: 'row', alignItems: 'center', elevation: 20 },
  confirmBtn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, flexDirection: 'row', alignItems: 'center', elevation: 4 },
  confirmBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  fullScreenOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  progressBox: { padding: 32, borderRadius: 24, alignItems: 'center', width: '85%', elevation: 10 },
  overlayTitle: { fontSize: 18, fontWeight: '900', marginTop: 20 },
  overlayText: { fontSize: 14, fontWeight: '600', marginTop: 10, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '85%', paddingBottom: 40, elevation: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  closeBtn: { padding: 8, borderRadius: 12 },
  listContent: { paddingHorizontal: 24, paddingVertical: 12 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1 },
  listItemText: { fontSize: 16, fontWeight: '700' },
  emptyList: { padding: 60, alignItems: 'center' },
  emptyListText: { fontSize: 15, fontWeight: '600' },
  infoBox: { flexDirection: 'row', padding: 14, borderRadius: 12, marginTop: 12, borderLeftWidth: 4, gap: 10, alignItems: 'center' },
  infoText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  overallProgress: { fontSize: 12, fontWeight: '900', color: COLORS.primary[500], marginTop: 8, letterSpacing: 1 },
  syncedBadge: { marginLeft: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  syncedBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  doneBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, minWidth: 80, alignItems: 'center' },
  checkboxOuter: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  checkboxInner: {
    width: 20,
    height: 20,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
