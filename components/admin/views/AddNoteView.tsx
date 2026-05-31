import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';
import { RichTextEditor } from '../../RichTextEditor';

interface AddNoteViewProps {
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
    title: string;
    content: string;
    quiz: QuizQuestionDraft[];
};

type SubjectOption = {
    id: string;
    name: string;
};

const createSubtopicDraft = (): SubtopicDraft => ({
    id: Date.now().toString(),
    title: '',
    content: '',
    quiz: [],
});

const createQuizDraft = (): QuizQuestionDraft => ({
    id: Date.now().toString(),
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 'A',
    explanation: '',
});

export function AddNoteView({ onBack, onSave }: AddNoteViewProps) {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;
    const formScrollRef = useRef<ScrollView>(null);
    const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<SubjectOption | null>(null);
    const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
    const [subjectSearch, setSubjectSearch] = useState('');
    const [subjectsLoading, setSubjectsLoading] = useState(false);
    const [topic, setTopic] = useState('');
    const [subtopics, setSubtopics] = useState<SubtopicDraft[]>([createSubtopicDraft()]);
    const [loading, setLoading] = useState(false);
    const [keyboardExtraSpace, setKeyboardExtraSpace] = useState(false);
    const [defaultSubtopicId, setDefaultSubtopicId] = useState(subtopics[0].id);

    useEffect(() => {
        loadSubjectOptions();
    }, []);

    const normalizeSubjectName = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

    const loadSubjectOptions = async () => {
        try {
            setSubjectsLoading(true);
            const subjects = await supabaseDB.getAdminNoteSubjects();
            const grouped = new Map<string, SubjectOption>();
            (subjects || []).forEach((item: any) => {
                const name = String(item.name || '').trim();
                if (!name) return;

                const key = normalizeSubjectName(name);
                if (key === 'arabic') return;
                if (!grouped.has(key)) {
                    grouped.set(key, {
                        id: item.id,
                        name,
                    });
                }
            });

            const options = Array.from(grouped.values()).sort((a, b) => {
                const aEnglish = normalizeSubjectName(a.name) === 'use of english';
                const bEnglish = normalizeSubjectName(b.name) === 'use of english';
                if (aEnglish) return -1;
                if (bEnglish) return 1;
                return a.name.localeCompare(b.name);
            });

            setSubjectOptions(options);
        } catch (error) {
            console.error('Error loading note subjects:', error);
            Alert.alert('Error', 'Failed to load subjects.');
        } finally {
            setSubjectsLoading(false);
        }
    };

    const selectedSubjectLabel = useMemo(() => {
        return selectedSubject?.name || '';
    }, [selectedSubject]);

    const filteredSubjectOptions = useMemo(() => {
        const query = normalizeSubjectName(subjectSearch);
        if (!query) return subjectOptions;

        return subjectOptions.filter((item) => {
            return normalizeSubjectName(item.name).includes(query);
        });
    }, [subjectOptions, subjectSearch]);

    const updateSubtopic = (index: number, field: keyof Omit<SubtopicDraft, 'quiz'>, value: any) => {
        setSubtopics((items) => items.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const addSubtopic = () => {
        setSubtopics((items) => [...items, createSubtopicDraft()]);
    };

    const removeSubtopic = (index: number) => {
        if (subtopics.length === 1) {
            Alert.alert('Validation', 'At least one subtopic is required.');
            return;
        }
        const removedId = subtopics[index].id;
        const nextItems = subtopics.filter((_, i) => i !== index);
        setSubtopics(nextItems);
        if (defaultSubtopicId === removedId) {
            setDefaultSubtopicId(nextItems[0].id);
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

    const handleSave = async () => {
        const cleanSubtopics = subtopics.map((item) => ({
            ...item,
            title: item.title.trim(),
            content: item.content.trim(),
        }));

        if (!selectedSubject || !topic.trim()) {
            Alert.alert('Validation Error', 'Please select a subject and fill in the topic.');
            return;
        }

        if (cleanSubtopics.some((item) => !item.title || !item.content)) {
            Alert.alert('Validation Error', 'Each subtopic needs a title and content.');
            return;
        }

        // Quiz explanations are optional, so we only require question setup.

        try {
            setLoading(true);
            const cleanTopic = topic.trim();
            for (const item of cleanSubtopics) {
                await supabaseDB.addNote(cleanTopic, selectedSubject.name, cleanTopic, item.content, item.quiz.length > 0 ? item.quiz : undefined, {
                    subject_id: selectedSubject.id,
                    subtopic: item.title,
                    is_default: item.id === defaultSubtopicId,
                });
            }
            Alert.alert('Success', `${cleanSubtopics.length} subtopic${cleanSubtopics.length === 1 ? '' : 's'} created successfully!`);
            onSave();
        } catch (error) {
            Alert.alert('Error', 'Failed to save note');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>New Note</Text>
                <TouchableOpacity onPress={handleSave} style={[styles.saveHeaderBtn, { backgroundColor: colors.primary }]} disabled={loading}>
                    {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveText}>Create</Text>}
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
                        <Text style={[styles.label, { color: colors.textSecondary }]}>SUBJECT</Text>
                        <TouchableOpacity
                            style={[styles.subjectSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => setSubjectPickerOpen(true)}
                            disabled={subjectsLoading}
                        >
                            <Text style={[styles.subjectSelectorText, { color: selectedSubject ? colors.text : COLORS.slate[400] }]} numberOfLines={1}>
                                {subjectsLoading ? 'Loading subjects...' : selectedSubjectLabel || 'Select subject'}
                            </Text>
                            {subjectsLoading ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>TOPIC</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                            value={topic}
                            onChangeText={setTopic}
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
                                    onChangeText={(value) => updateSubtopic(subtopicIndex, 'title', value)}
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

                            {/* Quiz section inside subtopic card */}
                            <View style={[styles.topicQuizCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <View style={styles.quizHeader}>
                                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Quiz Questions ({item.quiz.length})</Text>
                                    <TouchableOpacity onPress={() => addQuizQuestion(subtopicIndex)} style={styles.addBtn}>
                                        <Ionicons name="add-circle" size={24} color={colors.primary} />
                                        <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Question</Text>
                                    </TouchableOpacity>
                                </View>

                                {item.quiz.map((q, qIndex) => (
                                    <View key={q.id} style={[styles.questionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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

                                        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>EXPLANATION (optional)</Text>
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

            <Modal visible={subjectPickerOpen} transparent animationType="slide" onRequestClose={() => setSubjectPickerOpen(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Subject</Text>
                            <TouchableOpacity onPress={() => setSubjectPickerOpen(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={22} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.subjectSearchWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <Ionicons name="search" size={18} color={colors.textSecondary} />
                            <TextInput
                                style={[styles.subjectSearchInput, { color: colors.text }]}
                                value={subjectSearch}
                                onChangeText={setSubjectSearch}
                                placeholder="Search subjects..."
                                placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {subjectSearch.length > 0 && (
                                <TouchableOpacity onPress={() => setSubjectSearch('')} style={styles.clearSearchBtn}>
                                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <FlatList
                            data={filteredSubjectOptions}
                            keyExtractor={(item) => item.id}
                            ListEmptyComponent={
                                <View style={styles.emptySubjects}>
                                    <Text style={[styles.emptySubjectsText, { color: colors.textSecondary }]}>
                                        {subjectSearch.trim() ? 'No matching subject found.' : 'No subjects found.'}
                                    </Text>
                                </View>
                            }
                            renderItem={({ item }) => {
                                const selected = selectedSubject?.id === item.id;
                                return (
                                    <TouchableOpacity
                                        style={[styles.subjectOption, { borderBottomColor: colors.border }, selected && { backgroundColor: '#FFF8F6' }]}
                                        onPress={() => {
                                            setSelectedSubject(item);
                                            setSubjectPickerOpen(false);
                                        }}
                                    >
                                        <View style={styles.subjectOptionTextWrap}>
                                            <Text style={[styles.subjectOptionName, { color: colors.text }]}>{item.name}</Text>
                                        </View>
                                        {selected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                </View>
            </Modal>
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
        backgroundColor: '#4E342E'
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
    subjectSelector: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderColor: '#D7CCC8'
    },
    subjectSelectorText: { flex: 1, fontSize: 15, fontWeight: '700' },
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
    quizHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#000000' },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    addBtnText: { color: '#864b03', fontWeight: '800', fontSize: 14 },
    questionCard: {
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        marginBottom: 16,
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
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.35)'
    },
    modalCard: {
        maxHeight: '72%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF'
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EFEBE9'
    },
    modalTitle: { fontSize: 18, fontWeight: '900' },
    modalCloseBtn: { padding: 6 },
    subjectSearchWrap: {
        marginHorizontal: 20,
        marginTop: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        minHeight: 46,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFF8F6',
        borderColor: '#D7CCC8'
    },
    subjectSearchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        paddingVertical: 10
    },
    clearSearchBtn: { padding: 2 },
    subjectOption: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12
    },
    subjectOptionTextWrap: { flex: 1 },
    subjectOptionName: { fontSize: 15, fontWeight: '800' },
    subjectOptionMeta: { marginTop: 3, fontSize: 11, fontWeight: '700' },
    emptySubjects: { padding: 28, alignItems: 'center' },
    emptySubjectsText: { fontSize: 14, fontWeight: '700' }
});
