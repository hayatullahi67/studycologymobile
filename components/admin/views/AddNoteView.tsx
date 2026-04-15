import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';
import { RichTextEditor } from '../../RichTextEditor';

interface AddNoteViewProps {
    onBack: () => void;
    onSave: () => void;
}

export function AddNoteView({ onBack, onSave }: AddNoteViewProps) {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [topic, setTopic] = useState('');
    const [content, setContent] = useState('');
    const [quiz, setQuiz] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!title.trim() || !subject.trim() || !content.trim()) {
            Alert.alert("Validation Error", "Please fill in Title, Subject, and Content");
            return;
        }

        try {
            setLoading(true);

            // Validate quiz explanations
            if (quiz.length > 0) {
                const missingExpl = quiz.some(q => !q.explanation.trim());
                if (missingExpl) {
                    Alert.alert("Validation Error", "Please provide explanations for all quiz questions.");
                    setLoading(false);
                    return;
                }
            }

            await supabaseDB.addNote(title, subject, topic, content, quiz);
            Alert.alert("Success", "Note created successfully!");
            onSave();
        } catch (error) {
            Alert.alert("Error", "Failed to save note");
        } finally {
            setLoading(false);
        }
    };

    const addQuizQuestion = () => {
        setQuiz([...quiz, {
            id: Date.now().toString(),
            question: '',
            options: ['', '', '', ''],
            correctAnswer: 'A',
            explanation: ''
        }]);
    };

    const updateQuizQuestion = (index: number, field: string, value: any) => {
        const newQuiz = [...quiz];
        newQuiz[index] = { ...newQuiz[index], [field]: value };
        setQuiz(newQuiz);
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuiz = [...quiz];
        newQuiz[qIndex].options[oIndex] = value;
        setQuiz(newQuiz);
    };

    const removeQuizQuestion = (index: number) => {
        setQuiz(quiz.filter((_, i) => i !== index));
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" s ize={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>New Note</Text>
                <TouchableOpacity onPress={handleSave} style={[styles.saveHeaderBtn, { backgroundColor: colors.primary }]} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.saveText}>Create</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
            >
                <ScrollView
                    contentContainerStyle={styles.form}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>TITLE</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="e.g. Newton's Laws"
                            placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>SUBJECT</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                            value={subject}
                            onChangeText={setSubject}
                            placeholder="e.g. Physics"
                            placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>TOPIC (OPTIONAL)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                            value={topic}
                            onChangeText={setTopic}
                            placeholder="e.g. Mechanics"
                            placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>CONTENT</Text>
                        <RichTextEditor
                            initialValue={content}
                            onChange={setContent}
                            placeholder="Write your note content here..."
                            isDark={false}
                            height={400}
                        />
                    </View>

                    <View style={styles.quizSection}>
                        <View style={styles.quizHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quiz Questions ({quiz.length})</Text>
                            <TouchableOpacity onPress={addQuizQuestion} style={styles.addBtn}>
                                <Ionicons name="add-circle" size={24} color={colors.primary} />
                                <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Question</Text>
                            </TouchableOpacity>
                        </View>

                        {quiz.map((q, qIndex) => (
                            <View key={q.id} style={[styles.questionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <View style={styles.qHeader}>
                                    <Text style={[styles.qLabel, { color: colors.text }]}>Question {qIndex + 1}</Text>
                                    <TouchableOpacity onPress={() => removeQuizQuestion(qIndex)}>
                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>

                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, marginBottom: 12 }]}
                                    value={q.question}
                                    onChangeText={(v) => updateQuizQuestion(qIndex, 'question', v)}
                                    placeholder="Enter question..."
                                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                    multiline
                                />

                                <View style={styles.optionsGrid}>
                                    {['A', 'B', 'C', 'D'].map((opt, oIndex) => (
                                        <View key={opt} style={styles.optionRow}>
                                            <TouchableOpacity
                                                onPress={() => updateQuizQuestion(qIndex, 'correctAnswer', opt)}
                                                style={[
                                                    styles.radio,
                                                    q.correctAnswer === opt && { backgroundColor: colors.primary, borderColor: colors.primary }
                                                ]}
                                            >
                                                {q.correctAnswer === opt && <Ionicons name="checkmark" size={12} color="#FFF" />}
                                            </TouchableOpacity>
                                            <TextInput
                                                style={[styles.optionInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                                value={q.options[oIndex]}
                                                onChangeText={(v) => updateOption(qIndex, oIndex, v)}
                                                placeholder={`Option ${opt}`}
                                                placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                            />
                                        </View>
                                    ))}
                                </View>

                                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>EXPLANATION</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                    value={q.explanation}
                                    onChangeText={(v) => updateQuizQuestion(qIndex, 'explanation', v)}
                                    placeholder="Why is this the answer?"
                                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                />
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF8F6' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        backgroundColor: '#FFFFFF',
        borderBottomColor: '#EFEBE9'
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#000000' },
    saveHeaderBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        minWidth: 80,
        alignItems: 'center',
        backgroundColor: '#4E342E' // Deep Coffee
    },
    saveText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
    form: {
        padding: 20,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    inputGroup: { marginBottom: 24 },
    label: { fontSize: 11, fontWeight: '900', marginBottom: 8, letterSpacing: 1, color: '#864b03' },
    input: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        fontWeight: '600',
        backgroundColor: '#FFFFFF',
        borderColor: '#D7CCC8',
        color: '#3E2723'
    },
    textArea: { minHeight: 200, paddingTop: 16, marginBottom: 20 },
    quizSection: { marginTop: 24, paddingBottom: 40 },
    quizHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#000000' },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    addBtnText: { color: '#864b03', fontWeight: '800', fontSize: 14 },
    questionCard: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 20,
        backgroundColor: '#FFFFFF',
        borderColor: '#D7CCC8'
    },
    qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    qLabel: { fontWeight: '900', fontSize: 14, color: '#3E2723' },
    optionsGrid: { gap: 12 },
    optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D7CCC8', alignItems: 'center', justifyContent: 'center' },
    optionInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
        fontWeight: '600',
        backgroundColor: '#FFF8F6',
        borderColor: '#D7CCC8',
        color: '#3E2723'
    }
});
