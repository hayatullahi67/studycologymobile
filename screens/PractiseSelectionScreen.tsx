import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { Screen, Header } from '../components/Layout';
import { COLORS, ThemeColors } from '../theme/colors';
import { ExamMode } from '../types';
import * as localDB from '../services/localDatabase';

// Reusable Dropdown Component
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
    const { theme } = useAppStore();
    const isDark = false; // Forced Theme: White & Brown

    return (
        <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && { color: '#94A3B8' }]}>{label}:</Text>
            <TouchableOpacity
                style={[
                    styles.dropdown,
                    isDark && { backgroundColor: '#1E293B', borderColor: '#334155' },
                    disabled && styles.disabledDropdown,
                    disabled && isDark && { backgroundColor: '#111827', opacity: 0.4 }
                ]}
                onPress={() => !disabled && setVisible(true)}
                disabled={disabled}
            >
                <Text style={[
                    styles.dropdownText,
                    isDark && { color: '#F1F5F9' },
                    !value && styles.placeholderText,
                    !value && isDark && { color: '#475569' }
                ]}>
                    {value || placeholder}
                </Text>
                <Ionicons name="chevron-down" size={20} color={isDark ? '#475569' : '#64748B'} />
            </TouchableOpacity>

            <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setVisible(false)}>
                    <View style={[styles.modalContent, isDark && { backgroundColor: '#0F172A' }]}>
                        <View style={[styles.modalHeader, isDark && { borderBottomColor: '#1E293B' }]}>
                            <Text style={[styles.modalTitle, isDark && { color: '#F8FAFC' }]}>Select {label}</Text>
                            <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeModalBtn}>
                                <Ionicons name="close" size={24} color={isDark ? '#94A3B8' : '#64748B'} />
                            </TouchableOpacity>
                        </View>
                        {options.length === 0 ? (
                            <View style={styles.emptyOption}>
                                <Text style={[styles.emptyOptionText, isDark && { color: '#475569' }]}>No options available</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={options}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.optionItem, isDark && { borderBottomColor: '#1E293B' }]}
                                        onPress={() => {
                                            onSelect(item);
                                            setVisible(false);
                                        }}
                                    >
                                        <Text style={[styles.optionText, isDark && { color: '#F1F5F9' }]}>{item[displayKey]}</Text>
                                        {value === (item[displayKey]?.toString()) && (
                                            <View style={[styles.checkCircle, { backgroundColor: COLORS.primary[600] }]}>
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

export function PractiseSelectionScreen() {
    const navigation = useNavigation<AppNavigationProp>();
    const { setExamConfig, theme } = useAppStore();
    const isDark = false; // Forced Theme: White & Brown

    const [loading, setLoading] = useState(false);
    const [questionsPerSubject, setQuestionsPerSubject] = useState(40);
    const questionOptions = [10, 20, 30, 40, 50, 60];

    // ... (rest of the logic remains same, just adding isDark)
    // Data lists
    const [exams, setExams] = useState<any[]>([]);
    const [years, setYears] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);

    // Selections
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [selectedYear, setSelectedYear] = useState<any>(null);
    const [selectedSubject, setSelectedSubject] = useState<any>(null);

    useEffect(() => {
        loadExams();
    }, []);

    const loadExams = async () => {
        try {
            const [examsData, subjectsData] = await Promise.all([
                localDB.getLocalExams(),
                localDB.getLocalSubjects()
            ]);

            // Filter exams: Only keep exams that have at least one subject with > 0 questions
            const validExamIds = new Set();
            (subjectsData as any[]).forEach(s => {
                if ((s.question_count || 0) > 0) {
                    if (s.exam_id) validExamIds.add(s.exam_id);
                }
            });

            const filteredExams = (examsData as any[]).filter(e => validExamIds.has(e.id));
            setExams(filteredExams);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSelectExam = async (exam: any) => {
        setSelectedExam(exam);
        setSelectedYear(null);
        setSelectedSubject(null);
        setYears([]);
        setSubjects([]);

        try {
            const data = await localDB.getYearsForExam(exam.id);
            setYears(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSelectYear = async (year: any) => {
        setSelectedYear(year);
        setSelectedSubject(null);
        setSubjects([]);

        try {
            const data = await localDB.getSubjectsForYear(year.id);
            // Filter subjects: Only show subjects with actual questions
            const filteredSubjects = (data as any[]).filter(s => (s.question_count || 0) > 0);
            setSubjects(filteredSubjects);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSelectSubject = (subject: any) => {
        setSelectedSubject(subject);
    };

    const handleClear = () => {
        setSelectedExam(null);
        setSelectedYear(null);
        setSelectedSubject(null);
        setYears([]);
        setSubjects([]);
    };

    const handleGetQuestions = async () => {
        if (!selectedExam || !selectedYear || !selectedSubject) {
            Alert.alert("Selection Incomplete", "Please select an Exam, Year, and Subject.");
            return;
        }

        setLoading(true);
        try {
            // Fetch random questions for the selected subject based on chosen count
            const questions = await localDB.getRandomQuestionsBySubject(selectedSubject.id, questionsPerSubject);

            if (questions.length === 0) {
                Alert.alert("No Questions", "Found no questions for this selection.");
                return;
            }

            setExamConfig([selectedSubject.id], ExamMode.PRACTICE, questions, {
                title: `${selectedExam.name} - ${selectedSubject.name}`,
                year: selectedYear.year
            });

            // Clear selection for next time
            handleClear();

            navigation.navigate('Exam');
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load questions.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Screen scrollable={false} style={[styles.bg, isDark && { backgroundColor: '#0F172A' }]}>
            <Header
                title="Standard Practice"
                onBack={() => navigation.goBack()}
                style={{ backgroundColor: '#FFF8F6' }}
                titleStyle={{ color: '#000000' }}
                iconColor="#000000"
            />

            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <View style={[styles.introCard, isDark && { backgroundColor: 'rgba(134, 75, 3, 0.1)', borderColor: 'rgba(134, 75, 3, 0.2)' }]}>
                    <Ionicons name="school-outline" size={32} color={COLORS.primary[600]} />
                    <Text style={[styles.introTitle, isDark && { color: '#F8FAFC' }]}>Custom Session</Text>
                    <Text style={[styles.introText, isDark && { color: COLORS.primary[600] }]}>Select your preferred exam type, year, and subject to begin a focused practice session.</Text>
                </View>

                {/* Main Form Card */}
                <View style={[styles.formCard, isDark && { backgroundColor: '#1E293B', borderColor: '#334155' }]}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, isDark && { color: '#94A3B8' }]}>Questions Per Subject:</Text>
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

                    <DropdownField
                        label="Exam Type"
                        placeholder="Select Exam (e.g. JAMB)"
                        value={selectedExam?.name}
                        options={exams}
                        onSelect={handleSelectExam}
                    />

                    <DropdownField
                        label="Exam Year"
                        placeholder="Select Year"
                        value={selectedYear?.year?.toString()}
                        options={years}
                        displayKey="year"
                        onSelect={handleSelectYear}
                        disabled={!selectedExam}
                    />

                    <DropdownField
                        label="Subject"
                        placeholder="Select Subject"
                        value={selectedSubject?.name}
                        options={subjects}
                        onSelect={handleSelectSubject}
                        disabled={!selectedYear}
                    />

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: COLORS.primary[600] }]}
                            onPress={handleGetQuestions}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.primaryBtnText}>Get Questions</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.secondaryBtn, isDark && { backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 1 }]}
                            onPress={handleClear}
                        >
                            <Text style={[styles.secondaryBtnText, isDark && { color: '#94A3B8' }]}>Clear</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    bg: { backgroundColor: '#F8FAFC' },
    container: { padding: 16 },
    introCard: {
        padding: 16,
        backgroundColor: '#EEF2FF',
        borderRadius: 16,
        marginBottom: 16,
        alignItems: 'center',
        textAlign: 'center'
    },
    introTitle: { fontSize: 18, fontWeight: '900', color: '#4E342E', marginTop: 8, marginBottom: 4 },
    introText: { fontSize: 13, color: '#5D4037', textAlign: 'center', lineHeight: 20, fontWeight: '600', opacity: 0.8 },
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 11, fontWeight: '900', color: '#64748B', marginBottom: 8, letterSpacing: 0.5 },
    optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    optionChip: {
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        height: 34,
        minWidth: 46,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    optionChipActive: {
        backgroundColor: '#864b03',
        borderColor: '#864b03',
    },
    optionChipText: {
        color: '#1E293B',
        fontSize: 13,
        fontWeight: '800',
    },
    optionChipTextActive: {
        color: '#FFFFFF',
    },
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
    },
    disabledDropdown: { opacity: 0.5, backgroundColor: '#F1F5F9' },
    dropdownText: { fontSize: 14, color: '#0F172A', fontWeight: '700' },
    placeholderText: { color: '#94A3B8', fontWeight: '600' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    modalTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
    closeModalBtn: { padding: 4 },
    optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
    optionText: { fontSize: 15, color: '#1E293B', fontWeight: '700' },
    checkCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#864b03', alignItems: 'center', justifyContent: 'center' },
    emptyOption: { padding: 30, alignItems: 'center' },
    emptyOptionText: { color: '#94A3B8', fontSize: 15, fontWeight: '600' },

    // Buttons
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
    primaryBtn: { flex: 2, backgroundColor: '#0F172A', height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, // Reduced height from 48
    primaryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900' }, // Reduced font size
    secondaryBtn: { flex: 1, backgroundColor: '#F1F5F9', height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, // Reduced height from 48
    secondaryBtnText: { color: '#64748B', fontSize: 13, fontWeight: '800' },
});
