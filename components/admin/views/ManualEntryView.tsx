import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';

interface ManualEntryViewProps {
    onBack: () => void;
}

interface QuestionItem {
    id: string; // temporary id for react key
    text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: 'a' | 'b' | 'c' | 'd';
    explanation: string;
}

export function ManualEntryView({ onBack }: ManualEntryViewProps) {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;

    // Manual Input State
    const [exam, setExam] = useState('');
    const [year, setYear] = useState('');
    const [subject, setSubject] = useState('');
    const [loading, setLoading] = useState(false);

    // Questions State (List of forms)
    const [questions, setQuestions] = useState<QuestionItem[]>([
        { id: 'init-1', text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a', explanation: '' }
    ]);

    const handleAddForm = () => {
        const newQ: QuestionItem = {
            id: Date.now().toString(),
            text: '',
            option_a: '',
            option_b: '',
            option_c: '',
            option_d: '',
            correct_answer: 'a',
            explanation: ''
        };
        setQuestions([...questions, newQ]);
    };

    const handleRemoveForm = (index: number) => {
        if (questions.length === 1) {
            Alert.alert('Notice', 'You must have at least one question.');
            return;
        }
        const updated = [...questions];
        updated.splice(index, 1);
        setQuestions(updated);
    };

    const updateQuestion = (index: number, field: keyof QuestionItem, value: string) => {
        const updated = [...questions];
        // @ts-ignore
        updated[index][field] = value;
        setQuestions(updated);
    };

    const handleSaveAll = async () => {
        // Validation
        if (!exam.trim() || !year.trim() || !subject.trim()) {
            Alert.alert('Error', 'Please enter Exam, Year, and Subject details.');
            return;
        }

        // Validate all questions
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.text.trim()) {
                Alert.alert('Validation Error', `Question ${i + 1} text is empty.`);
                return;
            }
            if (!q.option_a || !q.option_b || !q.option_c || !q.option_d) {
                Alert.alert('Validation Error', `Question ${i + 1} has missing options.`);
                return;
            }
        }

        try {
            setLoading(true);

            // 1. Ensure structure exists in DB
            const examRec = await supabaseDB.upsertExam(exam.trim());
            const yearRec = await supabaseDB.upsertExamYear(examRec.id, year.trim());
            const subjectRec = await supabaseDB.upsertSubject(examRec.id, yearRec.id, subject.trim());

            // 2. Batch Insert
            const questionsToInsert = questions.map(q => ({
                examId: examRec.id,
                examYearId: yearRec.id,
                subjectId: subjectRec.id,
                question: q.text,
                option_a: q.option_a,
                option_b: q.option_b,
                option_c: q.option_c,
                option_d: q.option_d,
                correct_answer: q.correct_answer,
                explanation: q.explanation
            }));

            await supabaseDB.insertQuestionsInBatch(questionsToInsert);

            Alert.alert('Success', `Saved ${questions.length} questions successfully!`);
            onBack();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save questions');
        } finally {
            setLoading(false);
        }
    };

    const renderQuestionForm = (q: QuestionItem, index: number) => (
        <View key={q.id} style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.formHeader}>
                <Text style={[styles.formTitle, { color: colors.text }]}>QUESTION {index + 1}</Text>
                {questions.length > 1 && (
                    <TouchableOpacity onPress={() => handleRemoveForm(index)} style={[styles.removeBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2' }]}>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                )}
            </View>

            <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="Type question here..."
                placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                multiline
                numberOfLines={3}
                value={q.text}
                onChangeText={(txt) => updateQuestion(index, 'text', txt)}
            />

            <View style={styles.optionsGrid}>
                {['a', 'b', 'c', 'd'].map((opt) => (
                    <View key={opt} style={styles.optionRow}>
                        <TouchableOpacity
                            style={[
                                styles.radioBtn,
                                { backgroundColor: colors.background, borderColor: colors.border },
                                q.correct_answer === opt && { backgroundColor: colors.primary, borderColor: colors.primary }
                            ]}
                            onPress={() => updateQuestion(index, 'correct_answer', opt)}
                        >
                            <Text style={[
                                styles.radioText,
                                { color: colors.textSecondary },
                                q.correct_answer === opt && { color: '#FFFFFF' }
                            ]}>
                                {opt.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                        <TextInput
                            style={[styles.input, styles.optionInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                            placeholder={`Option ${opt.toUpperCase()}`}
                            placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                            // @ts-ignore
                            value={q[`option_${opt}`]}
                            // @ts-ignore
                            onChangeText={(txt) => updateQuestion(index, `option_${opt}`, txt)}
                        />
                    </View>
                ))}
            </View>

            <TextInput
                style={[styles.input, { marginTop: 16, backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="Explanation (Optional)"
                placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                value={q.explanation}
                onChangeText={(txt) => updateQuestion(index, 'explanation', txt)}
            />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Manual Entry</Text>
                </View>

                <TouchableOpacity style={[styles.saveHeaderBtn, { backgroundColor: '#10B981', opacity: loading ? 0.7 : 1 }]} onPress={handleSaveAll} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveHeaderText}>Save All ({questions.length})</Text>}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* 1. Target Details */}
                    <View style={[styles.targetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.inputRow}>
                            <View style={styles.flexInput}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>EXAM</Text>
                                <TextInput
                                    style={[styles.targetInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                    placeholder="e.g. JAMB"
                                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                    value={exam}
                                    onChangeText={setExam}
                                />
                            </View>
                            <View style={styles.flexInput}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>YEAR</Text>
                                <TextInput
                                    style={[styles.targetInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                    placeholder="2024"
                                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                    value={year}
                                    onChangeText={setYear}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={styles.flexInput}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>SUBJECT</Text>
                                <TextInput
                                    style={[styles.targetInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                    placeholder="English"
                                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                    value={subject}
                                    onChangeText={setSubject}
                                />
                            </View>
                        </View>
                    </View>

                    {/* 2. List of Forms */}
                    {questions.map((q, index) => renderQuestionForm(q, index))}

                    {/* 3. Add Button */}
                    <TouchableOpacity style={[styles.addNewBtn, { backgroundColor: isDark ? 'rgba(79, 70, 229, 0.1)' : '#EEF2FF', borderColor: colors.primary }]} onPress={handleAddForm}>
                        <Ionicons name="add-circle" size={20} color={colors.primary} />
                        <Text style={[styles.addNewText, { color: colors.primary }]}>Add Another Question</Text>
                    </TouchableOpacity>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, justifyContent: 'space-between' },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '900', marginLeft: 12 },
    saveHeaderBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, elevation: 2 },
    saveHeaderText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
    content: { padding: 16 },
    targetCard: { padding: 16, borderRadius: 20, marginBottom: 20, borderWidth: 1, elevation: 1 },
    inputRow: { flexDirection: 'row', gap: 10 },
    flexInput: { flex: 1 },
    label: { fontSize: 10, fontWeight: '900', marginBottom: 8, letterSpacing: 0.5 },
    targetInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, fontWeight: '600' },
    formCard: { padding: 16, borderRadius: 24, marginBottom: 16, borderWidth: 1, elevation: 2 },
    formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    formTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    removeBtn: { padding: 8, borderRadius: 10 },
    input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, fontWeight: '600' },
    textArea: { height: 80, textAlignVertical: 'top', marginBottom: 12 },
    optionsGrid: { gap: 10 },
    optionRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    optionInput: { flex: 1, height: 48 },
    radioBtn: { width: 44, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    radioText: { fontWeight: '900', fontSize: 15 },
    addNewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', marginTop: 8 },
    addNewText: { fontWeight: '800', fontSize: 14, marginLeft: 8 }
});
