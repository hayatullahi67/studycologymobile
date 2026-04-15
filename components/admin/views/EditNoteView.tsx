import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';
import { RichTextEditor } from '../../RichTextEditor';

interface EditNoteViewProps {
    noteId: string;
    onBack: () => void;
    onSave: () => void;
}

export function EditNoteView({ noteId, onBack, onSave }: EditNoteViewProps) {
    const { theme } = useAppStore();
    // const isDark = theme === 'dark';
    const colors = ThemeColors.light; // Forced to light mode color set for theming logic
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [topic, setTopic] = useState('');
    const [content, setContent] = useState('');
    const [quiz, setQuiz] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadNote();
    }, [noteId]);

    const loadNote = async () => {
        try {
            setLoading(true);
            const data = await supabaseDB.getNoteById(noteId);
            if (data) {
                setTitle(data.title);
                setSubject(data.subject);
                setTopic(data.topic || '');
                setContent(data.content);
                setQuiz(data.quiz || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!title.trim() || !content.trim()) {
            Alert.alert("Validation", "Title and Content are required");
            return;
        }

        try {
            setSaving(true);

            // Validate quiz explanations
            if (quiz && quiz.length > 0) {
                const missingExpl = quiz.some((q: any) => !q.explanation || !q.explanation.trim());
                if (missingExpl) {
                    Alert.alert("Validation Error", "Please provide explanations for all quiz questions.");
                    setSaving(false);
                    return;
                }
            }

            await supabaseDB.updateNote(noteId, { title, subject, topic, content, quiz });
            Alert.alert("Success", "Note updated successfully!");
            onSave();
        } catch (error) {
            Alert.alert("Error", "Failed to update note");
        } finally {
            setSaving(false);
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

    if (loading) return <View style={styles.center}><ActivityIndicator color="#4E342E" /></View>;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Note</Text>
                <TouchableOpacity onPress={handleSave} style={styles.saveHeaderBtn} disabled={saving}>
                    {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.saveText}>Save</Text>
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
                        <Text style={styles.label}>TITLE</Text>
                        <TextInput
                            style={styles.input}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Note Title"
                            placeholderTextColor="#94A3B8"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>SUBJECT</Text>
                        <TextInput
                            style={styles.input}
                            value={subject}
                            onChangeText={setSubject}
                            placeholder="Subject"
                            placeholderTextColor="#94A3B8"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>TOPIC (OPTIONAL)</Text>
                        <TextInput
                            style={styles.input}
                            value={topic}
                            onChangeText={setTopic}
                            placeholder="Topic"
                            placeholderTextColor="#94A3B8"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: '#864b03' }]}>CONTENT</Text>
                        <RichTextEditor
                            initialValue={content}
                            onChange={setContent}
                            placeholder="Write your note here..."
                            isDark={false}
                            height={400}
                        />
                    </View>

                    <View style={styles.quizSection}>
                        <View style={styles.quizHeader}>
                            <Text style={styles.sectionTitle}>Quiz Questions ({quiz.length})</Text>
                            <TouchableOpacity onPress={addQuizQuestion} style={styles.addBtn}>
                                <Ionicons name="add-circle" size={24} color="#864b03" />
                                <Text style={styles.addBtnText}>Add Question</Text>
                            </TouchableOpacity>
                        </View>

                        {quiz.map((q, qIndex) => (
                            <View key={q.id || qIndex} style={styles.questionCard}>
                                <View style={styles.qHeader}>
                                    <Text style={styles.qLabel}>Question {qIndex + 1}</Text>
                                    <TouchableOpacity onPress={() => removeQuizQuestion(qIndex)}>
                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>

                                <TextInput
                                    style={[styles.input, { backgroundColor: '#FFF8F6', marginBottom: 12 }]}
                                    value={q.question}
                                    onChangeText={(v) => updateQuizQuestion(qIndex, 'question', v)}
                                    placeholder="Enter question..."
                                    placeholderTextColor="#94A3B8"
                                    multiline
                                />

                                <View style={styles.optionsGrid}>
                                    {['A', 'B', 'C', 'D'].map((opt, oIndex) => (
                                        <View key={opt} style={styles.optionRow}>
                                            <TouchableOpacity
                                                onPress={() => updateQuizQuestion(qIndex, 'correctAnswer', opt)}
                                                style={[
                                                    styles.radio,
                                                    q.correctAnswer === opt && { backgroundColor: '#4E342E', borderColor: '#4E342E' }
                                                ]}
                                            >
                                                {q.correctAnswer === opt && <Ionicons name="checkmark" size={12} color="#FFF" />}
                                            </TouchableOpacity>
                                            <TextInput
                                                style={styles.optionInput}
                                                value={q.options[oIndex]}
                                                onChangeText={(v) => updateOption(qIndex, oIndex, v)}
                                                placeholder={`Option ${opt}`}
                                                placeholderTextColor="#94A3B8"
                                            />
                                        </View>
                                    ))}
                                </View>

                                <Text style={styles.label}>EXPLANATION</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: '#FFF8F6' }]}
                                    value={q.explanation}
                                    onChangeText={(v) => updateQuizQuestion(qIndex, 'explanation', v)}
                                    placeholder="Why is this the answer?"
                                    placeholderTextColor="#94A3B8"
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8F6' },
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
