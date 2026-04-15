import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';

interface Question {
    id: string;
    text: string;
    options: Array<{ id: string; text: string }>;
    correctOptionId: string;
}

interface AddQuestionsWithListViewProps {
    onBack?: () => void;
}

export function AddQuestionsWithListView({ onBack }: AddQuestionsWithListViewProps) {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;

    const [activeTab, setActiveTab] = useState<'add' | 'list'>('add');
    const [questions, setQuestions] = useState<Question[]>([]);

    // Add Question state
    const [addQuestionText, setAddQuestionText] = useState('');
    const [addOptions, setAddOptions] = useState([
        { id: 'a', text: '' },
        { id: 'b', text: '' },
        { id: 'c', text: '' },
        { id: 'd', text: '' },
    ]);
    const [addCorrectOption, setAddCorrectOption] = useState('a');

    // Edit Question state
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [editQuestionText, setEditQuestionText] = useState('');
    const [editOptions, setEditOptions] = useState<Array<{ id: string; text: string }>>([]);
    const [editCorrectOption, setEditCorrectOption] = useState('');

    const handleAddQuestion = () => {
        if (!addQuestionText.trim()) {
            Alert.alert('Error', 'Question text cannot be empty');
            return;
        }

        if (addOptions.some(opt => !opt.text.trim())) {
            Alert.alert('Error', 'All options must have text');
            return;
        }

        const newQuestion: Question = {
            id: `q-${Date.now()}`,
            text: addQuestionText,
            options: addOptions,
            correctOptionId: addCorrectOption,
        };

        setQuestions([...questions, newQuestion]);
        setAddQuestionText('');
        setAddOptions([
            { id: 'a', text: '' },
            { id: 'b', text: '' },
            { id: 'c', text: '' },
            { id: 'd', text: '' },
        ]);
        setAddCorrectOption('a');
        Alert.alert('Success', 'Question added successfully');
        setActiveTab('list');
    };

    const handleEditQuestion = (question: Question) => {
        setEditingQuestion(question);
        setEditQuestionText(question.text);
        setEditOptions(question.options);
        setEditCorrectOption(question.correctOptionId);
    };

    const handleSaveEdit = () => {
        if (!editQuestionText.trim()) {
            Alert.alert('Error', 'Question text cannot be empty');
            return;
        }

        if (editOptions.some(opt => !opt.text.trim())) {
            Alert.alert('Error', 'All options must have text');
            return;
        }

        setQuestions(questions.map(q =>
            q.id === editingQuestion?.id
                ? {
                    ...q,
                    text: editQuestionText,
                    options: editOptions,
                    correctOptionId: editCorrectOption,
                }
                : q
        ));

        setEditingQuestion(null);
        Alert.alert('Success', 'Question updated successfully');
    };

    const handleDeleteQuestion = (questionId: string) => {
        Alert.alert(
            'Delete Question',
            'Are you sure you want to delete this question?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        setQuestions(questions.filter(q => q.id !== questionId));
                        Alert.alert('Success', 'Question deleted successfully');
                    },
                },
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Manage Questions</Text>
            </View>

            {/* Tab Navigation */}
            <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        { backgroundColor: colors.surface },
                        activeTab === 'add' && { backgroundColor: isDark ? 'rgba(79, 70, 229, 0.1)' : '#EEF2FF', borderColor: colors.primary, borderWidth: 1 }
                    ]}
                    onPress={() => setActiveTab('add')}
                >
                    <Ionicons
                        name="add-circle"
                        size={18}
                        color={activeTab === 'add' ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[
                        styles.tabText,
                        { color: colors.textSecondary },
                        activeTab === 'add' && { color: colors.primary, fontWeight: '800' }
                    ]}>Add Question</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.tab,
                        { backgroundColor: colors.surface },
                        activeTab === 'list' && { backgroundColor: isDark ? 'rgba(79, 70, 229, 0.1)' : '#EEF2FF', borderColor: colors.primary, borderWidth: 1 }
                    ]}
                    onPress={() => setActiveTab('list')}
                >
                    <Ionicons
                        name="list"
                        size={18}
                        color={activeTab === 'list' ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[
                        styles.tabText,
                        { color: colors.textSecondary },
                        activeTab === 'list' && { color: colors.primary, fontWeight: '800' }
                    ]}>My Questions ({questions.length})</Text>
                </TouchableOpacity>
            </View>

            {/* Add Question Tab */}
            {activeTab === 'add' && (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.formGroup}>
                            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>QUESTION TEXT</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                placeholder="Type the question here..."
                                placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                multiline
                                numberOfLines={4}
                                value={addQuestionText}
                                onChangeText={setAddQuestionText}
                            />
                        </View>

                        {['A', 'B', 'C', 'D'].map((opt, idx) => (
                            <View key={opt} style={styles.formGroup}>
                                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>OPTION {opt}</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                    placeholder={`Enter Option ${opt}`}
                                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                    value={addOptions[idx].text}
                                    onChangeText={(text) => {
                                        const updated = [...addOptions];
                                        updated[idx].text = text;
                                        setAddOptions(updated);
                                    }}
                                />
                            </View>
                        ))}

                        <View style={styles.formGroup}>
                            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>CORRECT OPTION</Text>
                            <View style={styles.optionSelector}>
                                {['A', 'B', 'C', 'D'].map((opt, idx) => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[
                                            styles.optionBtn,
                                            { backgroundColor: colors.background, borderColor: colors.border },
                                            addCorrectOption === addOptions[idx].id && { backgroundColor: colors.primary, borderColor: colors.primary }
                                        ]}
                                        onPress={() => setAddCorrectOption(addOptions[idx].id)}
                                    >
                                        <Text style={[
                                            styles.optionBtnText,
                                            { color: colors.textSecondary },
                                            addCorrectOption === addOptions[idx].id && { color: '#FFFFFF' }
                                        ]}>
                                            {opt}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleAddQuestion}>
                            <Text style={styles.saveBtnText}>Add to Paper</Text>
                            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}

            {/* List Questions Tab */}
            {activeTab === 'list' && (
                <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                    {questions.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={64} color={isDark ? colors.border : '#CBD5E1'} />
                            <Text style={[styles.emptyText, { color: colors.text }]}>No questions added yet</Text>
                            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Add questions using the "Add Question" tab</Text>
                        </View>
                    ) : (
                        questions.map((question, idx) => (
                            <View key={question.id} style={[styles.questionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <View style={styles.questionHeader}>
                                    <View style={[styles.questionNumber, { backgroundColor: isDark ? 'rgba(79, 70, 229, 0.1)' : '#EEF2FF' }]}>
                                        <Text style={[styles.questionNumberText, { color: colors.primary }]}>QUESTION {idx + 1}</Text>
                                    </View>
                                    <View style={styles.questionActions}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                                            onPress={() => handleEditQuestion(question)}
                                        >
                                            <Ionicons name="pencil" size={16} color={colors.primary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FECACA' }]}
                                            onPress={() => handleDeleteQuestion(question.id)}
                                        >
                                            <Ionicons name="trash" size={16} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <Text style={[styles.questionText, { color: colors.text }]}>{question.text}</Text>
                                <View style={styles.optionsPreview}>
                                    {question.options.map((opt) => (
                                        <View
                                            key={opt.id}
                                            style={[
                                                styles.optionPreview,
                                                { backgroundColor: colors.background, borderColor: colors.border },
                                                opt.id === question.correctOptionId && { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5', borderColor: '#10B981' }
                                            ]}
                                        >
                                            <Text style={[
                                                styles.optionPreviewText,
                                                { color: colors.textSecondary },
                                                opt.id === question.correctOptionId && { color: isDark ? '#34D399' : '#047857', fontWeight: '800' }
                                            ]}>
                                                {opt.id.toUpperCase()}. {opt.text}
                                            </Text>
                                            {opt.id === question.correctOptionId && (
                                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                            )}
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}

            {/* Edit Modal */}
            <Modal
                visible={editingQuestion !== null}
                transparent
                animationType="slide"
                onRequestClose={() => setEditingQuestion(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <TouchableOpacity onPress={() => setEditingQuestion(null)} style={[styles.closeBtn, { backgroundColor: colors.background }]}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Question</Text>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalFormContent} showsVerticalScrollIndicator={false}>
                            <View style={styles.formGroup}>
                                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>QUESTION TEXT</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                    placeholder="Type the question here..."
                                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                    multiline
                                    numberOfLines={4}
                                    value={editQuestionText}
                                    onChangeText={setEditQuestionText}
                                />
                            </View>

                            {['A', 'B', 'C', 'D'].map((opt, idx) => (
                                <View key={opt} style={styles.formGroup}>
                                    <Text style={[styles.formLabel, { color: colors.textSecondary }]}>OPTION {opt}</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                        placeholder={`Enter Option ${opt}`}
                                        placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                        value={editOptions[idx]?.text}
                                        onChangeText={(text) => {
                                            const updated = [...editOptions];
                                            updated[idx].text = text;
                                            setEditOptions(updated);
                                        }}
                                    />
                                </View>
                            ))}

                            <View style={styles.formGroup}>
                                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>CORRECT OPTION</Text>
                                <View style={styles.optionSelector}>
                                    {editOptions.map((opt) => (
                                        <TouchableOpacity
                                            key={opt.id}
                                            style={[
                                                styles.optionBtn,
                                                { backgroundColor: colors.background, borderColor: colors.border },
                                                editCorrectOption === opt.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                                            ]}
                                            onPress={() => setEditCorrectOption(opt.id)}
                                        >
                                            <Text style={[
                                                styles.optionBtnText,
                                                { color: colors.textSecondary },
                                                editCorrectOption === opt.id && { color: '#FFFFFF' }
                                            ]}>
                                                {opt.id.toUpperCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.cancelBtn, { borderColor: colors.border }]}
                                onPress={() => setEditingQuestion(null)}
                            >
                                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveBtn, { flex: 2, backgroundColor: colors.primary, marginTop: 0 }]}
                                onPress={handleSaveEdit}
                            >
                                <Text style={styles.saveBtnText}>Save Changes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1, gap: 16 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '900', flex: 1 },
    tabContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 10, borderBottomWidth: 1 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, gap: 8, justifyContent: 'center' },
    tabText: { fontSize: 13, fontWeight: '700' },
    content: { padding: 20, paddingBottom: 40 },
    listContent: { padding: 20, paddingBottom: 40 },
    formCard: { padding: 20, borderRadius: 24, borderWidth: 1, elevation: 2 },
    formGroup: { marginBottom: 20 },
    formLabel: { fontSize: 11, fontWeight: '900', marginBottom: 8, letterSpacing: 0.5 },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, fontWeight: '600' },
    textArea: { height: 100, textAlignVertical: 'top' },
    optionSelector: { flexDirection: 'row', gap: 12 },
    optionBtn: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    optionBtnText: { fontSize: 14, fontWeight: '900' },
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 16, marginTop: 12, gap: 10, elevation: 4 },
    saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    emptyText: { fontSize: 18, fontWeight: '900', marginTop: 16 },
    emptySubtext: { fontSize: 14, fontWeight: '600', marginTop: 8, textAlign: 'center' },
    questionCard: { borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, elevation: 2 },
    questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    questionNumber: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    questionNumberText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    questionActions: { flexDirection: 'row', gap: 10 },
    actionBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    questionText: { fontSize: 15, fontWeight: '700', marginBottom: 20, lineHeight: 22 },
    optionsPreview: { gap: 10 },
    optionPreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 14, borderWidth: 1 },
    optionPreviewText: { fontSize: 13, fontWeight: '600', flex: 1 },
    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '90%', paddingBottom: 40, elevation: 20 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1, gap: 16 },
    closeBtn: { padding: 8, borderRadius: 12 },
    modalTitle: { fontSize: 18, fontWeight: '900', flex: 1 },
    modalFormContent: { paddingHorizontal: 20, paddingVertical: 20 },
    modalActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 10 },
    cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    cancelBtnText: { fontSize: 15, fontWeight: '900' },
});
