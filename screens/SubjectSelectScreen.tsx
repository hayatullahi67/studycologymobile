import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppNavigationProp, RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { Screen, Header } from '../components/Layout';
import { COLORS, ThemeColors } from '../theme/colors';
import * as localDB from '../services/localDatabase';
import { ExamMode } from '../types';

// Reusable Dropdown Component (Consistent with PractiseSelectionScreen)
interface DropdownProps {
  label: string;
  placeholder: string;
  value: string | null;
  options: any[];
  onSelect: (item: any) => void;
  disabled?: boolean;
  displayKey?: string;
}

const DropdownField = ({ label, placeholder, value, options, onSelect, disabled = false, displayKey = 'name' }: DropdownProps) => {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}:</Text>
      <TouchableOpacity
        style={[
          styles.dropdown,
          disabled && styles.disabledDropdown,
        ]}
        onPress={() => !disabled && setVisible(true)}
        disabled={disabled}
      >
        <Text style={[
          styles.dropdownText,
          !value && styles.placeholderText,
        ]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={'#64748B'} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {label}</Text>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={24} color={'#64748B'} />
              </TouchableOpacity>
            </View>
            {options.length === 0 ? (
              <View style={styles.emptyOption}>
                <Text style={styles.emptyOptionText}>No options available</Text>
              </View>
            ) : (
              <FlatList
                data={options}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => {
                      onSelect(item);
                      setVisible(false);
                    }}
                  >
                    <Text style={styles.optionText}>{item[displayKey]}</Text>
                    {value === (item[displayKey]?.toString()) && (
                      <View style={[styles.checkCircle, { backgroundColor: '#864b03' }]}>
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export function SubjectSelectScreen() {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'SubjectSelect'>>();
  const nextScreen = route.params?.nextScreen || 'ExamConfig';

  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await localDB.getLocalExams();
      setExams(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExam = async (exam: any) => {
    setSelectedExam(exam);
    setSelectedSubject(null);
    try {
      setLoading(true);
      // Fetch all subjects for this exam across all years, then deduplicate by name
      const allSubs = await localDB.getSubjectsByExamId(exam.id);
      const uniqueSubs = Array.from(new Set(allSubs.map((s: any) => s.name)))
        .map(name => allSubs.find((s: any) => s.name === name));
      setAvailableSubjects(uniqueSubs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = async () => {
    if (!selectedExam || !selectedSubject) {
      Alert.alert("Selection Incomplete", "Please select both an Exam and a Subject.");
      return;
    }

    if (nextScreen === 'EduGame') {
      try {
        setLoading(true);
        // Find a random year for this specific subject name in this exam
        const randomYearSubject = await localDB.getRandomYearSubjectByName(selectedExam.id, selectedSubject.name) as any;
        if (randomYearSubject) {
          navigation.navigate('EduGame', { initialSubjectId: randomYearSubject.id });
        } else {
          Alert.alert("No Questions", "We couldn't find any questions for this selection.");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    } else {
      // For ExamConfig or others, we might need a specific year or just pass the subject name
      navigation.navigate('ExamConfig', { initialSubjectId: selectedSubject.id });
    }
  };

  return (
    <Screen scrollable={false}>
      <Header
        title="" // Request: Blank header text
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.introCard, isDark && {}]}>
          <Ionicons name="game-controller" size={36} color="#864b03" />
          <Text style={[styles.introTitle, isDark && { color: '#864b03' }]}>Game Setup</Text>
          <Text style={[styles.introText, isDark && { color: '#8D6E63' }]}>Choose your exam type and subject. We'll find the best challenge for you!</Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }]}>
          <DropdownField
            label="Exam Type"
            placeholder="Select Exam (e.g. JAMB)"
            value={selectedExam?.name}
            options={exams}
            onSelect={handleSelectExam}
          />

          <DropdownField
            label="Subject"
            placeholder="Select Subject"
            value={selectedSubject?.name}
            options={availableSubjects}
            onSelect={(val) => setSelectedSubject(val)}
            disabled={!selectedExam || loading}
          />

          <TouchableOpacity
            style={[styles.proceedBtn, { backgroundColor: '#864b03' }, (!selectedExam || !selectedSubject || loading) && styles.disabledBtn]}
            onPress={handleProceed}
            disabled={!selectedExam || !selectedSubject || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.proceedBtnText}>Proceed to Game</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  introCard: {
    padding: 24,
    backgroundColor: '#FAF9F8', // Very Light/Clean background
    borderRadius: 24,
    marginBottom: 32,
    alignItems: 'center',
    shadowColor: '#864b03',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  introTitle: { fontSize: 20, fontWeight: '900', color: '#3E2723', marginTop: 16, marginBottom: 8, letterSpacing: 0.5 },
  introText: { fontSize: 14, color: '#5D4037', textAlign: 'center', lineHeight: 22, fontWeight: '600' },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EFEBE9',
    // ... removed shadow for flatter/cleaner look or kept minimal
  },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '900', color: '#8d6e63', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }, // Professional brown
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA', // Subtle contrast against white card
    borderWidth: 1.5,
    borderColor: '#EFEBE9',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60, // Taller touch target
  },
  disabledDropdown: { opacity: 0.5 },
  dropdownText: { fontSize: 15, color: '#3E2723', fontWeight: '800' }, // Bold dark brown for readability
  placeholderText: { color: '#BCAAA4', fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(62, 39, 35, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '80%', paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#3E2723' },
  closeModalBtn: { padding: 4, backgroundColor: '#F5F5F5', borderRadius: 20 },
  optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#FAFAFA' },
  optionText: { fontSize: 16, color: '#3E2723', fontWeight: '600' },
  checkCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emptyOption: { padding: 48, alignItems: 'center' },
  emptyOptionText: { color: '#A1887F', fontSize: 16, fontWeight: '500' },

  proceedBtn: {
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#3E2723',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  disabledBtn: { opacity: 0.5, shadowOpacity: 0.1, elevation: 0 },
  proceedBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});
