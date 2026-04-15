import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as supabaseDB from '../../../services/supabaseDatabase';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';
import { CustomDateTimePicker } from '../CustomDateTimePicker';

interface AddCompetitionViewProps {
    competitionId: string | null;
    onBack: () => void;
    onSave: () => void;
}

export function AddCompetitionView({ competitionId, onBack, onSave }: AddCompetitionViewProps) {
    const { theme } = useAppStore();
    // const isDark = theme === 'dark';
    const colors = ThemeColors.light; // Force light mode for theme consistency

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date(Date.now() + 3600000));

    const [showPicker, setShowPicker] = useState<{ mode: 'date' | 'time', target: 'start' | 'end' } | null>(null);

    const [quiz, setQuiz] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, [competitionId]);

    const loadData = async () => {
        try {
            setLoading(true);
            if (competitionId) {
                const comps = await supabaseDB.getCompetitions();
                const comp = comps.find((c: any) => c.id === competitionId);
                if (comp) {
                    setTitle(comp.title);
                    setDescription(comp.description || '');
                    setStartDate(new Date(comp.start_time));
                    setEndDate(new Date(comp.end_time));
                    setQuiz(comp.quiz || []);
                }
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load form data");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert("Missing Info", "Title is required.");
            return;
        }

        if (endDate <= startDate) {
            Alert.alert("Invalid Time", "End time must be after start time.");
            return;
        }

        if (quiz.length === 0) {
            Alert.alert("Missing Content", "Please add at least one question to the competition.");
            return;
        }

        try {
            setSaving(true);
            const competition: any = {
                title: title.trim(),
                description: description.trim(),
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                quiz: quiz,
                question_count: quiz.length
            };

            if (competitionId) {
                competition.id = competitionId;
            }

            await supabaseDB.saveCompetition(competition);
            Alert.alert("Success", "Competition saved successfully");
            onSave();
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to save competition");
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

    const formatTime = (date: Date) => {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours}:${String(minutes).padStart(2, '0')} ${ampm}`;
    };

    const formatDateStr = (date: Date) => {
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color="#4E342E" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: '#FFF8F6' }]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <View style={[styles.header, { backgroundColor: '#FFFFFF', borderBottomColor: '#EFEBE9' }]}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000000" />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: '#000000' }]}>
                    {competitionId ? 'Edit Challenge' : 'New Challenge'}
                </Text>
                <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.5 }]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.saveBtnText}>Publish</Text>
                    )}
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
                    <View style={[styles.formCard, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}>
                        <View style={styles.section}>
                            <Text style={[styles.label, { color: '#864b03' }]}>CHALLENGE TITLE</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: '#FFF8F6', color: '#3E2723', borderColor: '#D7CCC8' }]}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="e.g., National UTME Mock Challenge"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.label, { color: '#864b03' }]}>DESCRIPTION</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: '#FFF8F6', color: '#3E2723', borderColor: '#D7CCC8' }]}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={3}
                                placeholder="Competition details..."
                                placeholderTextColor="#94A3B8"
                            />
                        </View>

                        <Text style={[styles.label, { color: '#864b03', marginBottom: 12 }]}>START DATE & TIME</Text>
                        <View style={[styles.row, { marginBottom: 24 }]}>
                            <TouchableOpacity
                                style={[styles.pickerBtn, { backgroundColor: '#FFF8F6', borderColor: '#D7CCC8' }]}
                                onPress={() => setShowPicker({ mode: 'date', target: 'start' })}
                            >
                                <Ionicons name="calendar-outline" size={20} color="#4E342E" />
                                <Text style={[styles.pickerText, { color: '#3E2723' }]}>{formatDateStr(startDate)}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.pickerBtn, { backgroundColor: '#FFF8F6', borderColor: '#D7CCC8', marginLeft: 12 }]}
                                onPress={() => setShowPicker({ mode: 'time', target: 'start' })}
                            >
                                <Ionicons name="time-outline" size={20} color="#4E342E" />
                                <Text style={[styles.pickerText, { color: '#3E2723' }]}>{formatTime(startDate)}</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.label, { color: '#864b03', marginBottom: 12 }]}>END DATE & TIME</Text>
                        <View style={[styles.row, { marginBottom: 12 }]}>
                            <TouchableOpacity
                                style={[styles.pickerBtn, { backgroundColor: '#FFF8F6', borderColor: '#D7CCC8' }]}
                                onPress={() => setShowPicker({ mode: 'date', target: 'end' })}
                            >
                                <Ionicons name="calendar-outline" size={20} color="#4E342E" />
                                <Text style={[styles.pickerText, { color: '#3E2723' }]}>{formatDateStr(endDate)}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.pickerBtn, { backgroundColor: '#FFF8F6', borderColor: '#D7CCC8', marginLeft: 12 }]}
                                onPress={() => setShowPicker({ mode: 'time', target: 'end' })}
                            >
                                <Ionicons name="time-outline" size={20} color="#4E342E" />
                                <Text style={[styles.pickerText, { color: '#3E2723' }]}>{formatTime(endDate)}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Inline Quiz Builder Section */}
                    <View style={[styles.quizSection, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' }]}>
                        <View style={styles.quizHeader}>
                            <Text style={[styles.sectionTitle, { color: '#000000' }]}>Questions ({quiz.length})</Text>
                            <TouchableOpacity onPress={addQuizQuestion} style={styles.addBtn}>
                                <Ionicons name="add-circle" size={24} color="#4E342E" />
                                <Text style={[styles.addBtnText, { color: '#4E342E' }]}>Add Question</Text>
                            </TouchableOpacity>
                        </View>

                        {quiz.map((q, qIndex) => (
                            <View key={q.id} style={[styles.questionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <View style={styles.qHeader}>
                                    <Text style={[styles.qLabel, { color: colors.text }]}>Question {qIndex + 1}</Text>
                                    <TouchableOpacity onPress={() => removeQuizQuestion(qIndex)}>
                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>

                                <TextInput
                                    style={[styles.input, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8', color: '#3E2723', marginBottom: 12 }]}
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
                                                style={[styles.optionInput, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8', color: '#3E2723' }]}
                                                value={q.options[oIndex]}
                                                onChangeText={(v) => updateOption(qIndex, oIndex, v)}
                                                placeholder={`Option ${opt}`}
                                                placeholderTextColor="#94A3B8"
                                            />
                                        </View>
                                    ))}
                                </View>

                                <Text style={[styles.label, { color: '#64748B', marginTop: 12 }]}>EXPLANATION</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: '#FFFFFF', borderColor: '#D7CCC8', color: '#3E2723' }]}
                                    value={q.explanation}
                                    onChangeText={(v) => updateQuizQuestion(qIndex, 'explanation', v)}
                                    placeholder="Explain why the answer is correct..."
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>
                        ))}

                        {quiz.length === 0 && (
                            <View style={styles.emptyQuiz}>
                                <Ionicons name="document-text-outline" size={48} color="#E2E8F0" />
                                <Text style={[styles.emptyQuizText, { color: '#64748B' }]}>No questions added yet</Text>
                            </View>
                        )}
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {showPicker && (
                <CustomDateTimePicker
                    visible={!!showPicker}
                    mode={showPicker.mode}
                    initialDate={showPicker.target === 'start' ? startDate : endDate}
                    onClose={() => setShowPicker(null)}
                    onSelect={(date) => {
                        if (showPicker.target === 'start') setStartDate(date);
                        else setEndDate(date);
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF8F6' },
    center: { alignItems: 'center', justifyContent: 'center' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        backgroundColor: '#FFFFFF'
    },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#000000' },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    saveBtn: {
        backgroundColor: '#4E342E', // Deep Coffee/Mahogany ("not really brown")
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12
    },
    saveBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
    content: {
        padding: 16,
        maxWidth: 750,
        alignSelf: 'center',
        width: '100%'
    },
    formCard: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 24, backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' },
    section: { marginBottom: 20 },
    row: { flexDirection: 'row' },
    label: { fontSize: 10, fontWeight: '900', color: '#864b03', letterSpacing: 1.5, textTransform: 'uppercase' },
    input: { height: 56, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 16, fontWeight: '600', backgroundColor: '#FFF8F6', borderColor: '#D7CCC8' },
    textArea: { height: 100, paddingTop: 16, textAlignVertical: 'top' },
    pickerBtn: { flex: 1, height: 56, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10, borderColor: '#D7CCC8' },
    pickerText: { fontSize: 15, fontWeight: '700' },

    quizSection: { padding: 20, borderRadius: 24, borderWidth: 1, backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' },
    quizHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '900' },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    addBtnText: { fontWeight: '800', fontSize: 14 },
    questionCard: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 16, backgroundColor: '#FFF8F6', borderColor: '#D7CCC8' },
    qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    qLabel: { fontWeight: '900', fontSize: 14 },
    optionsGrid: { gap: 10 },
    optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D7CCC8', alignItems: 'center', justifyContent: 'center' },
    optionInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontWeight: '600', backgroundColor: '#FFFFFF', borderColor: '#D7CCC8' },
    emptyQuiz: { alignItems: 'center', paddingVertical: 40 },
    emptyQuizText: { marginTop: 12, fontSize: 14, fontWeight: '600' }
});
