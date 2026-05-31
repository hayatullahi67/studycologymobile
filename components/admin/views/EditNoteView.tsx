import React, { useEffect, useRef, useState } from 'react';
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

type QuizQuestionDraft = {
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
};

type SubtopicDraft = {
    id: string;
    noteId?: string;
    subtopicId?: string;
    title: string;
    content: string;
    isNew?: boolean;
    quiz: QuizQuestionDraft[];
};

const createSubtopicDraft = (): SubtopicDraft => ({
    id: Date.now().toString(),
    title: '',
    content: '',
    isNew: true,
    quiz: [],
});

const createQuizDraft = (): QuizQuestionDraft => ({
    id: Date.now().toString(),
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 'A',
    explanation: '',
});

export function EditNoteView({ noteId, onBack, onSave }: EditNoteViewProps) {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;
    const formScrollRef = useRef<ScrollView>(null);
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [topic, setTopic] = useState('');
    const [topicId, setTopicId] = useState('');
    const [subtopics, setSubtopics] = useState<SubtopicDraft[]>([]);
    const [removedNoteIds, setRemovedNoteIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [keyboardExtraSpace, setKeyboardExtraSpace] = useState(false);
    const [defaultSubtopicId, setDefaultSubtopicId] = useState('');

    useEffect(() => {
        loadNote();
    }, [noteId]);

    const loadNote = async () => {
        try {
            setLoading(true);
            const data = await supabaseDB.getNoteById(noteId);
            if (data) {
                const allNotes = await supabaseDB.getNotes();
                const sameTopicNotes = allNotes
                    .filter((item: any) => {
                        const sameSubject = data.subject_id
                            ? item.subject_id === data.subject_id
                            : (item.subject || '').trim().toLowerCase() === (data.subject || '').trim().toLowerCase();
                        const sameTopic = data.topic_id
                            ? item.topic_id === data.topic_id
                            : (item.topic || '').trim().toLowerCase() === (data.topic || '').trim().toLowerCase();
                        return sameSubject && sameTopic;
                    })
                    .sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

                const topicNotes = sameTopicNotes.length > 0 ? sameTopicNotes : [data];

                setTitle(data.title);
                setSubject(data.subject);
                setSubjectId(data.subject_id || '');
                setTopic(data.topic || '');
                setTopicId(data.topic_id || '');
                setRemovedNoteIds([]);
                const mappedSubtopics = topicNotes.map((item: any) => ({
                    id: item.id,
                    noteId: item.id,
                    subtopicId: item.subtopic_id || '',
                    title: item.subtopic || item.title || '',
                    content: item.content || '',
                    isNew: false,
                    quiz: Array.isArray(item.quiz) ? item.quiz.map((q: any) => ({
                        id: q.id || Date.now().toString(),
                        question: q.question || '',
                        options: Array.isArray(q.options) ? [...q.options, '', '', '', ''].slice(0, 4) : ['', '', '', ''],
                        correctAnswer: q.correctAnswer || 'A',
                        explanation: q.explanation || '',
                    })) : [],
                }));
                setSubtopics(mappedSubtopics);
                const defaultNote = topicNotes.find((item: any) => item.is_default) || topicNotes[0];
                setDefaultSubtopicId(defaultNote?.id || mappedSubtopics[0]?.id || '');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        const cleanTitle = title.trim();
        const cleanSubject = subject.trim();
        const cleanTopic = topic.trim();
        const cleanSubtopics = subtopics.map((item) => ({
            ...item,
            title: item.title.trim(),
            content: item.content.trim(),
        }));

        if (!cleanTitle || !cleanSubject || !cleanTopic) {
            Alert.alert('Validation Error', 'Please fill in Title, Subject, and Topic.');
            return;
        }

        if (cleanSubtopics.length === 0 || cleanSubtopics.some((item) => !item.title || !item.content)) {
            Alert.alert('Validation Error', 'Each subtopic needs a title and content.');
            return;
        }

        try {            setSaving(true);

            for (const id of removedNoteIds) {
                await supabaseDB.deleteNote(id);
            }

            for (const item of cleanSubtopics) {
                if (item.noteId) {
                    await supabaseDB.updateNote(item.noteId, {
                        title: cleanTitle,
                        subject_id: subjectId || null,
                        subject: cleanSubject,
                        topic_id: topicId,
                        topic: cleanTopic,
                        subtopic_id: item.subtopicId,
                        subtopic: item.title,
                        content: item.content,
                        quiz: item.quiz.length > 0 ? item.quiz : undefined,
                        is_default: item.id === defaultSubtopicId,
                    });
                } else {
                    await supabaseDB.addNote(cleanTitle, cleanSubject, cleanTopic, item.content, item.quiz.length > 0 ? item.quiz : undefined, {
                        subject_id: subjectId || null,
                        topic_id: topicId,
                        subtopic_id: item.subtopicId,
                        subtopic: item.title,
                        is_default: item.id === defaultSubtopicId,
                    });
                }
            }
            Alert.alert('Success', 'Note updated successfully!');
            onSave();
        } catch (error) {
            Alert.alert('Error', 'Failed to update note');
        } finally {
            setSaving(false);
        }
    };

    const updateSubtopic = (index: number, field: keyof Omit<SubtopicDraft, 'quiz'>, value: any) => {
        setSubtopics((items) => items.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const addSubtopic = () => {
        const draft = createSubtopicDraft();
        setSubtopics((items) => {
            if (items.length === 0) setDefaultSubtopicId(draft.id);
            return [...items, draft];
        });
    };

    const removeSubtopic = (index: number) => {
        if (subtopics.length === 1) {
            Alert.alert('Validation', 'At least one subtopic is required.');
            return;
        }

        const item = subtopics[index];
        if (item.noteId) {
            setRemovedNoteIds((ids) => [...ids, item.noteId!]);
        }
        const nextItems = subtopics.filter((_, i) => i !== index);
        setSubtopics(nextItems);
        if (defaultSubtopicId === item.id) {
            setDefaultSubtopicId(nextItems[0]?.id || '');
        }
    };

    const addQuizQuestion = (subtopicIndex: number) => {
        setSubtopics((items) => items.map((item, i) =>
            i === subtopicIndex ? { ...item, quiz: [...item.quiz, createQuizDraft()] } : item
        ));
    };

    const updateQuizQuestion = (subtopicIndex: number, qIndex: number, field: string, value: any) => {
        setSubtopics((items) => items.map((item, i) => {
            if (i !== subtopicIndex) return item;
            const newQuiz = item.quiz.map((q, qi) => qi === qIndex ? { ...q, [field]: value } : q);
            return { ...item, quiz: newQuiz };
        }));
    };

    const updateOption = (subtopicIndex: number, qIndex: number, oIndex: number, value: string) => {
        setSubtopics((items) => items.map((item, i) => {
            if (i !== subtopicIndex) return item;
            const newQuiz = item.quiz.map((q, qi) => {
                if (qi !== qIndex) return q;
                const options = [...q.options];
                options[oIndex] = value;
                return { ...q, options };
            });
            return { ...item, quiz: newQuiz };
        }));
    };

    const removeQuizQuestion = (subtopicIndex: number, qIndex: number) => {
        setSubtopics((items) => items.map((item, i) => {
            if (i !== subtopicIndex) return item;
            return { ...item, quiz: item.quiz.filter((_, qi) => qi !== qIndex) };
        }));
    };

    const handleExplanationFocus = () => {
        setKeyboardExtraSpace(true);
        setTimeout(() => {
            formScrollRef.current?.scrollToEnd({ animated: true });
        }, 180);
    };

    if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Note</Text>
                <TouchableOpacity onPress={handleSave} style={[styles.saveHeaderBtn, { backgroundColor: colors.primary }]} disabled={saving}>
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
                    ref={formScrollRef}
                    contentContainerStyle={[styles.form, keyboardExtraSpace && styles.formKeyboardExtra]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="none"
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
                            onChangeText={(value) => {
                                setSubject(value);
                                setSubjectId('');
                            }}
                            placeholder="e.g. Physics"
                            placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>TOPIC</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                            value={topic}
                            onChangeText={(value) => {
                                setTopic(value);
                                setTopicId('');
                                setSubtopics((items) => items.map((item) => ({ ...item, subtopicId: '' })));
                            }}
                            placeholder="e.g. Mechanics"
                            placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                        />
                    </View>

                    <View style={styles.subtopicHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Subtopics ({subtopics.length})</Text>
                        <TouchableOpacity onPress={addSubtopic} style={styles.addBtn}>
                            <Ionicons name="add-circle" size={24} color={colors.primary} />
                            <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Subtopic</Text>
                        </TouchableOpacity>
                    </View>

                    {subtopics.map((item, subtopicIndex) => (
                        <View key={item.id} style={[styles.subtopicCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={styles.subtopicCardHeader}>
                                <Text style={[styles.subtopicTitle, { color: colors.text }]}>Subtopic {subtopicIndex + 1}</Text>
                                <View style={styles.subtopicActions}>
                                    <TouchableOpacity
                                        style={[styles.defaultBtn, item.id === defaultSubtopicId && styles.defaultBtnActive]}
                                        onPress={() => setDefaultSubtopicId(item.id)}
                                    >
                                        <Ionicons name={item.id === defaultSubtopicId ? 'star' : 'star-outline'} size={15} color={item.id === defaultSubtopicId ? '#FFFFFF' : '#864b03'} />
                                        <Text style={[styles.defaultBtnText, item.id === defaultSubtopicId && styles.defaultBtnTextActive]}>Show first</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => removeSubtopic(subtopicIndex)}>
                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>SUBTOPIC TITLE</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                    value={item.title}
                                    onChangeText={(value) => {
                                        updateSubtopic(subtopicIndex, 'title', value);
                                        updateSubtopic(subtopicIndex, 'subtopicId', '');
                                    }}
                                    placeholder="e.g. Newton's First Law"
                                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>CONTENT</Text>
                                <RichTextEditor
                                    initialValue={item.content}
                                    onChange={(value) => updateSubtopic(subtopicIndex, 'content', value)}
                                    placeholder="Write this subtopic content here..."
                                    isDark={false}
                                    height={320}
                                />
                            </View>

                            {/* Quiz section per subtopic */}
                            <View style={[styles.topicQuizCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <View style={styles.quizHeader}>
                                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Quiz Questions ({item.quiz.length})</Text>
                                    <TouchableOpacity onPress={() => addQuizQuestion(subtopicIndex)} style={styles.addBtn}>
                                        <Ionicons name="add-circle" size={24} color={colors.primary} />
                                        <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Question</Text>
                                    </TouchableOpacity>
                                </View>

                                {item.quiz.map((q, qIndex) => (
                                    <View key={q.id || qIndex} style={[styles.questionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                        <View style={styles.qHeader}>
                                            <Text style={[styles.qLabel, { color: colors.text }]}>Question {qIndex + 1}</Text>
                                            <TouchableOpacity onPress={() => removeQuizQuestion(subtopicIndex, qIndex)}>
                                                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>

                                        <TextInput
                                            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, marginBottom: 12 }]}
                                            value={q.question}
                                            onChangeText={(v) => updateQuizQuestion(subtopicIndex, qIndex, 'question', v)}
                                            placeholder="Enter question..."
                                            placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                            multiline
                                        />

                                        <View style={styles.optionsGrid}>
                                            {['A', 'B', 'C', 'D'].map((opt, oIndex) => (
                                                <View key={opt} style={styles.optionRow}>
                                                    <TouchableOpacity
                                                        onPress={() => updateQuizQuestion(subtopicIndex, qIndex, 'correctAnswer', opt)}
                                                        style={[
                                                            styles.radio,
                                                            q.correctAnswer === opt && { backgroundColor: colors.primary, borderColor: colors.primary }
                                                        ]}
                                                    >
                                                        {q.correctAnswer === opt && <Ionicons name="checkmark" size={12} color="#FFF" />}
                                                    </TouchableOpacity>
                                                    <TextInput
                                                        style={[styles.optionInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                                        value={q.options[oIndex]}
                                                        onChangeText={(v) => updateOption(subtopicIndex, qIndex, oIndex, v)}
                                                        placeholder={`Option ${opt}`}
                                                        placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                                    />
                                                </View>
                                            ))}
                                        </View>

                                        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>EXPLANATION</Text>
                                        <TextInput
                                            style={[styles.input, styles.explanationInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                            value={q.explanation}
                                            onChangeText={(v) => updateQuizQuestion(subtopicIndex, qIndex, 'explanation', v)}
                                            onFocus={handleExplanationFocus}
                                            onBlur={() => setKeyboardExtraSpace(false)}
                                            placeholder="Why is this the answer?"
                                            placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                            multiline
                                            textAlignVertical="top"
                                        />
                                    </View>
                                ))}
                            </View>
                        </View>
                    ))}

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
        paddingBottom: 40,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%'
    },
    formKeyboardExtra: { paddingBottom: 130 },
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
    subtopicHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    subtopicCard: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 24,
        backgroundColor: '#FFFFFF',
        borderColor: '#D7CCC8'
    },
    subtopicCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    subtopicTitle: { fontSize: 16, fontWeight: '900' },
    subtopicActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    defaultBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#D7CCC8',
        backgroundColor: '#FFF8F6'
    },
    defaultBtnActive: {
        backgroundColor: '#4E342E',
        borderColor: '#4E342E'
    },
    defaultBtnText: { color: '#864b03', fontSize: 11, fontWeight: '900' },
    defaultBtnTextActive: { color: '#FFFFFF' },
    topicQuizCard: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 40,
        backgroundColor: '#FFFFFF',
        borderColor: '#D7CCC8'
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
    },
    explanationInput: {
        minHeight: 84,
        paddingTop: 12,
        paddingBottom: 12
    }
});
