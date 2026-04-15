import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../../store/useAppStore';
import { ThemeColors, COLORS } from '../../../theme/colors';

interface AddPastQuestionViewProps {
    onBack?: () => void;
}

export function AddPastQuestionView({ onBack }: AddPastQuestionViewProps) {
    const { theme } = useAppStore();
    const isDark = theme === 'dark';
    const colors = isDark ? ThemeColors.dark : ThemeColors.light;
    const [selectedPaper, setSelectedPaper] = useState('');
    const [questionText, setQuestionText] = useState('');
    const [options, setOptions] = useState([
        { id: 'a', text: '' },
        { id: 'b', text: '' },
        { id: 'c', text: '' },
        { id: 'd', text: '' },
    ]);
    const [correctOption, setCorrectOption] = useState('a');
    const [explanation, setExplanation] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAddQuestion = () => {
        if (!selectedPaper.trim()) {
            Alert.alert('Error', 'Please select a paper');
            return;
        }

        if (!questionText.trim()) {
            Alert.alert('Error', 'Question text cannot be empty');
            return;
        }

        if (options.some(opt => !opt.text.trim())) {
            Alert.alert('Error', 'All options must have text');
            return;
        }

        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            // Clear form
            setSelectedPaper('');
            setQuestionText('');
            setOptions([
                { id: 'a', text: '' },
                { id: 'b', text: '' },
                { id: 'c', text: '' },
                { id: 'd', text: '' },
            ]);
            setCorrectOption('a');
            setExplanation('');
            setLoading(false);
            Alert.alert('Success', 'Question added to paper successfully');
        }, 1000);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Add New Question</Text>
            </View>

            <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>

                {/* Paper Selection */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>SELECT PAPER</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                        placeholder="Search for paper (e.g. Math 2023)"
                        placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                        value={selectedPaper}
                        onChangeText={setSelectedPaper}
                    />
                    <Text style={[styles.subText, { color: colors.textSecondary }]}>Cannot find the paper? Create it in Library first.</Text>
                </View>

                {/* Question Text */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>QUESTION TEXT</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                        placeholder="Type the question here..."
                        placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                        multiline
                        numberOfLines={4}
                        value={questionText}
                        onChangeText={setQuestionText}
                    />
                </View>

                {/* Options */}
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Options</Text>

                {['A', 'B', 'C', 'D'].map((opt, idx) => (
                    <View key={opt} style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>OPTION {opt}</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                            placeholder={`Enter Option ${opt}`}
                            placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                            value={options[idx].text}
                            onChangeText={(text) => {
                                const updated = [...options];
                                updated[idx].text = text;
                                setOptions(updated);
                            }}
                        />
                    </View>
                ))}

                {/* Correct Option */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>CORRECT OPTION</Text>
                    <View style={styles.optionSelector}>
                        {['A', 'B', 'C', 'D'].map((opt, idx) => (
                            <TouchableOpacity
                                key={opt}
                                style={[
                                    styles.optionBtn,
                                    { backgroundColor: colors.surface, borderColor: colors.border },
                                    correctOption === options[idx].id && { backgroundColor: '#10B981', borderColor: '#10B981' }
                                ]}
                                onPress={() => setCorrectOption(options[idx].id)}
                            >
                                <Text style={[
                                    styles.optionBtnText,
                                    { color: colors.textSecondary },
                                    correctOption === options[idx].id && { color: '#FFFFFF' }
                                ]}>
                                    {opt}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Explanation */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>EXPLANATION (OPTIONAL)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                        placeholder="Explain why this is correct..."
                        placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                        multiline
                        numberOfLines={3}
                        value={explanation}
                        onChangeText={setExplanation}
                    />
                </View>

                {/* Save Button */}
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#10B981', opacity: loading ? 0.7 : 1 }]} onPress={handleAddQuestion} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                            <Text style={styles.saveBtnText}>Add Question</Text>
                        </>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1, gap: 16 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '900' },
    form: { padding: 20, paddingBottom: 40 },
    inputGroup: { marginBottom: 24 },
    label: { fontSize: 11, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
    sectionLabel: { fontSize: 16, fontWeight: '900', marginBottom: 16 },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, fontWeight: '600' },
    textArea: { height: 100, textAlignVertical: 'top' },
    divider: { height: 1, marginVertical: 24 },
    optionSelector: { flexDirection: 'row', gap: 12 },
    optionBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    optionBtnText: { fontSize: 14, fontWeight: '800' },
    saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 12, elevation: 1 },
    saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
    subText: { fontSize: 11, marginTop: 8, fontWeight: '600', fontStyle: 'italic' }
});
